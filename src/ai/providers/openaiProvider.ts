// OpenAI Chat Completions streaming provider.
//
// Routes requests through a Supabase Edge Function (chat-proxy) that holds
// the API key server-side. The frontend never sees the key.
//
// Behaviour:
//  - Backend configured  -> always talks to the real model. If anything goes
//    wrong, the user sees the real reason (and a Retry button) instead of a
//    made-up answer.
//  - No backend at all (local/demo mode) -> uses the built-in sample replies,
//    clearly labelled as a demo so nobody mistakes them for a real model.

import type { ChatProvider, ChatRequest, ChatStreamChunk } from '@/ai/types';
import { mockChatProvider } from '@/ai/providers/mockChat';
import { isSupabaseConfigured } from '@/lib/supabase';

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

const DEMO_NOTICE =
  '> **Demo mode** — no AI backend is connected, so this is a built-in sample reply, not a real model.\n\n';

/** Turn a failed HTTP response into a short, human-readable message. */
async function describeFailure(res: Response): Promise<string> {
  let serverMessage = '';
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string') serverMessage = data.error;
  } catch {
    // body was not JSON — fall through to the generic messages below
  }

  if (res.status === 429) {
    return 'The AI service is rate limited right now. Please wait a moment and press Retry.';
  }
  if (res.status === 401 || res.status === 403) {
    return 'Your session was not accepted by the AI service. Try signing out and back in.';
  }
  if (serverMessage) return serverMessage;
  return `The AI service returned an error (HTTP ${res.status}). Press Retry, or try again later.`;
}

export const openaiChatProvider: ChatProvider = {
  id: 'openai-chat',
  async streamChat(req: ChatRequest, onChunk: (c: ChatStreamChunk) => void): Promise<void> {
    // No backend configured: run the clearly-labelled demo replies.
    if (!isSupabaseConfigured) {
      onChunk({ delta: DEMO_NOTICE });
      await mockChatProvider.streamChat(req, onChunk);
      return;
    }

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
        onChunk({ error: await describeFailure(res) });
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
            if (!receivedAnyDelta) {
              onChunk({ error: 'The AI service returned an empty reply. Press Retry.' });
              return;
            }
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
        onChunk({ error: 'The AI service returned an empty reply. Press Retry.' });
        return;
      }
      onChunk({ done: true });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      onChunk({
        error: 'Could not reach the AI service. Check your internet connection and press Retry.',
      });
    }
  },
};
