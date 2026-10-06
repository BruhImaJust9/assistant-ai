// Tavily web search provider — routes through a Supabase Edge Function
// (web-search) that holds the API key server-side.

import type { WebSearchProvider, WebSearchResult } from '@/ai/types';

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

export const tavilyWebSearchProvider: WebSearchProvider = {
  id: 'tavily-web-search',
  async search(query: string, signal?: AbortSignal): Promise<WebSearchResult[]> {
    try {
      const res = await fetch(proxyUrl(), {
        method: 'POST',
        headers: authHeaders(),
        signal,
        body: JSON.stringify({ query }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        results?: WebSearchResult[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Web search request failed (${res.status}).`);
      }

      const results = data.results ?? [];
      if (results.length === 0) {
        throw new Error('The web search service returned no results.');
      }
      return results;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return [];
      throw err;
    }
  },
};
