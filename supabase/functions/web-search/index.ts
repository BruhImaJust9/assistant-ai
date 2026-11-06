// Edge function: web-search. Proxies compact searches to Tavily.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TAVILY_URL = "https://api.tavily.com/search";

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("TAVILY_API_KEY");
    if (!apiKey) return json({ error: "The web search key is not connected yet." }, 503);

    const body = await req.json() as { query?: string };
    if (!body.query || typeof body.query !== "string") return json({ error: "Invalid search request." }, 400);

    const tavilyRes = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query: body.query.slice(0, 500), max_results: 3, include_answer: false }),
      signal: req.signal,
    });

    if (!tavilyRes.ok) {
      const text = await tavilyRes.text().catch(() => "");
      return json({ error: `Web search failed (${tavilyRes.status}). ${text.slice(0, 240)}` }, tavilyRes.status);
    }

    const data = await tavilyRes.json();
    const results = (data.results ?? []).map((result: { url: string; title: string; content: string }) => ({
      url: result.url,
      title: result.title,
      snippet: result.content.slice(0, 700),
    }));
    return json({ results });
  } catch (err) {
    return json({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
