// Tavily web search provider — routes through a Supabase Edge Function
// (web-search) that holds the API key server-side.
//
// Behaviour:
//  - Backend configured  -> real results only. If the search fails, an error is
//    thrown so the chat shows "Web search failed: …" with a Retry button,
//    instead of silently inventing sources.
//  - No backend at all (local/demo mode) -> sample results, each title tagged
//    "[Demo]" so they can't be mistaken for real search results.

import type { WebSearchProvider, WebSearchResult } from '@/ai/types';
import { mockWebSearchProvider } from '@/ai/providers/mockWebSearch';
import { isSupabaseConfigured } from '@/lib/supabase';

function proxyUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

async function describeFailure(res: Response): Promise<string> {
  let serverMessage = '';
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string') serverMessage = data.error;
  } catch {
    // body was not JSON
  }
  if (res.status === 429) return 'Web search is rate limited right now. Please wait and retry.';
  if (res.status === 401 || res.status === 403) {
    return 'Your session was not accepted by the search service. Try signing out and back in.';
  }
  return serverMessage || `The search service returned an error (HTTP ${res.status}).`;
}

export const tavilyWebSearchProvider: WebSearchProvider = {
  id: 'tavily-web-search',
  async search(query: string, signal?: AbortSignal): Promise<WebSearchResult[]> {
    if (!isSupabaseConfigured) {
      const demo = await mockWebSearchProvider.search(query, signal);
      return demo.map((r) => ({ ...r, title: `[Demo] ${r.title}` }));
    }

    let res: Response;
    try {
      res = await fetch(proxyUrl(), {
        method: 'POST',
        headers: authHeaders(),
        signal,
        body: JSON.stringify({ query }),
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new Error('Web search failed: could not reach the search service.');
    }

    if (!res.ok) {
      throw new Error(`Web search failed: ${await describeFailure(res)}`);
    }

    const data = await res.json();
    return (data.results ?? []) as WebSearchResult[];
  },
};
