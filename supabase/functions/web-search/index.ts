// Edge function: web-search
// Proxies web search requests to Tavily, keeping the API key server-side.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TAVILY_URL = "https://api.tavily.com/search";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TAVILY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Tavily API key is not configured on the server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'query' in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tavilyRes = await fetch(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: 5,
        include_answer: true,
      }),
      signal: req.signal,
    });

    if (!tavilyRes.ok) {
      const text = await tavilyRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Tavily search failed (${tavilyRes.status}). ${text.slice(0, 300)}` }),
        { status: tavilyRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await tavilyRes.json();

    const results = (data.results ?? []).map((r: { url: string; title: string; content: string }) => ({
      url: r.url,
      title: r.title,
      snippet: r.content,
    }));

    return new Response(
      JSON.stringify({ results, answer: data.answer ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
