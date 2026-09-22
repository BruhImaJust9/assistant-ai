// OpenAI Chat Completions streaming provider.
//
// Routes requests through a Supabase Edge Function (chat-proxy) that holds
// the API key server-side. The frontend never sees the key.
// Falls back to the mock provider when the backend is unavailable so the
// UX stays functional without a working API key.

import type { ChatProvider, ChatRequest, ChatStreamChunk } from '@/ai/types';
import { mockChatProvider } from '@/ai/providers/mockChat';

function proxyUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-proxy`;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const openaiChatProvider: ChatProvider = {
  id: 'openai-chat',
  async streamChat(req: ChatRequest, onChunk: (c: ChatStreamChunk) => void): Promise<void> {
    try {
      const res = await fetch(proxyUrl(), {
        method: 'POST',
        headers: authHeaders(),
        signal: req.signal,
        body: JSON.stringify({
          model: req.model.id,
          messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        // Fall back to mock provider — the API key may not have quota.
        await mockChatProvider.streamChat(req, onChunk);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedAnyDelta = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            onChunk({ done: true });
            return;
          }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              receivedAnyDelta = true;
              onChunk({ delta });
            }
          } catch {
            // ignore keep-alive / partial frames
          }
        }
      }
      if (!receivedAnyDelta) {
        // Stream ended without content — fall back to mock.
        await mockChatProvider.streamChat(req, onChunk);
        return;
      }
      onChunk({ done: true });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Network error — fall back to mock.
      await mockChatProvider.streamChat(req, onChunk);
    }
  },
};
