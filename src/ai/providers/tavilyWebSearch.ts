// Tavily web search provider — routes through a Supabase Edge Function
// (web-search) that holds the API key server-side.

import type { WebSearchProvider, WebSearchResult } from '@/ai/types';
import { edgeFunctionUrl, edgeFunctionHeaders } from '@/lib/edgeConfig';

export interface WebSearchResponse {
  results: WebSearchResult[];
  answer?: string | null;
}

export const tavilyWebSearchProvider: WebSearchProvider = {
  id: 'tavily-web-search',
  async search(query: string, signal?: AbortSignal): Promise<WebSearchResult[]> {
    try {
      const res = await fetch(edgeFunctionUrl('web-search'), {
        method: 'POST',
        headers: edgeFunctionHeaders(),
        signal,
        body: JSON.stringify({ query }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        results?: WebSearchResult[];
        answer?: string | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Web search request failed (${res.status}).`);
      }

      const results = data.results ?? [];
      if (results.length === 0) {
        throw new Error('The web search service returned no results.');
      }
      // Stash the Tavily answer on the results array for the chat orchestrator.
      (results as WebSearchResult[] & { answer?: string | null }).answer = data.answer ?? null;
      return results;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return [];
      throw err;
    }
  },
};
