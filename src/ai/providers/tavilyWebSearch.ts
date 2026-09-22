// Tavily web search provider — routes through a Supabase Edge Function
// (web-search) that holds the API key server-side. Falls back to mock
// results when the backend is unavailable.

import type { WebSearchProvider, WebSearchResult } from '@/ai/types';
import { mockWebSearchProvider } from '@/ai/providers/mockWebSearch';

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

      if (!res.ok) {
        return mockWebSearchProvider.search(query, signal);
      }

      const data = await res.json();
      const results = (data.results ?? []) as WebSearchResult[];
      if (results.length === 0) {
        return mockWebSearchProvider.search(query, signal);
      }
      return results;
    } catch {
      return mockWebSearchProvider.search(query, signal);
    }
  },
};
