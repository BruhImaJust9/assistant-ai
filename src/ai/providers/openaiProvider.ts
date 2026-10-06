// OpenAI Chat Completions streaming provider.
//
// Routes requests through a Supabase Edge Function (chat-proxy) that holds
// the API key server-side. The frontend never sees the key.
import type { ChatProvider, ChatRequest, ChatStreamChunk } from '@/ai/types';

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
        const detail = await res.text().catch(() => '');
        onChunk({ error: formatProviderError(res.status, detail) });
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
        onChunk({ error: 'The AI service returned an empty response.' });
        return;
      }
      onChunk({ done: true });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      onChunk({ error: `Unable to reach the AI service: ${(err as Error).message || 'network error'}` });
    }
  },
};

function formatProviderError(status: number, detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { error?: string | { message?: string } };
    const error = parsed.error;
    const message = typeof error === 'string' ? error : error?.message;
    if (message) return message;
  } catch {
    // The service may return a non-JSON error body.
  }
  return `AI service request failed (${status}).`;
}
