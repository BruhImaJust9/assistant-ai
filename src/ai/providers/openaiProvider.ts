// Groq chat provider. The API key stays inside the Supabase Edge Function.

import type { ChatProvider, ChatRequest, ChatStreamChunk } from '@/ai/types';
import { edgeFunctionHeaders, edgeFunctionUrl } from '@/lib/edgeConfig';

async function describeFailure(res: Response): Promise<string> {
  let serverMessage = '';
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string') serverMessage = data.error;
  } catch {
    // The service may return a non-JSON error body.
  }
  if (res.status === 429) {
    return serverMessage || "Groq's free tier is busy right now. Please wait a few seconds and retry.";
  }
  return serverMessage || `The AI service returned an error (HTTP ${res.status}).`;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

export const groqChatProvider: ChatProvider = {
  id: 'groq-chat',
  async streamChat(req: ChatRequest, onChunk: (chunk: ChatStreamChunk) => void): Promise<void> {
    const MAX_RETRIES = 2;
    const retryStatuses = new Set([429, 503]);
    try {
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await fetch(edgeFunctionUrl('chat-proxy'), {
          method: 'POST',
          headers: edgeFunctionHeaders(),
          signal: req.signal,
          body: JSON.stringify({
            model: req.model.id,
            messages: req.messages,
            maxTokens: req.model.capabilities.maxOutputTokens,
          }),
        });

        if (retryStatuses.has(res.status) && attempt < MAX_RETRIES) {
          const retryAfter = Number(res.headers.get('retry-after')) || 1.5;
          await sleep(Math.min(retryAfter * 1000, 4000), req.signal);
          attempt += 1;
          continue;
        }

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
                onChunk({ error: 'The AI service returned an empty reply. Please retry.' });
                return;
              }
              onChunk({ done: true });
              return;
            }
            try {
              const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                receivedAnyDelta = true;
                onChunk({ delta });
              }
            } catch {
              // Ignore incomplete SSE frames.
            }
          }
        }

        if (!receivedAnyDelta) {
          onChunk({ error: 'The AI service returned an empty reply. Please retry.' });
          return;
        }
        onChunk({ done: true });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      onChunk({ error: 'Could not reach the free AI service. Please check your connection and retry.' });
    }
  },
};
