// Edge function: chat-proxy
// Proxies chat completion requests to OpenAI, keeping the API key server-side.
// Maps Nova model IDs to real OpenAI model names. Streams via SSE.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const MODEL_MAP: Record<string, string> = {
  "nova-pro": "gpt-4o",
  "nova-flash": "gpt-4o-mini",
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured on the server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { model, messages } = body;

    if (!model || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing 'model' or 'messages' in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openaiModel = MODEL_MAP[model] ?? "gpt-4o-mini";

    const openaiRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
      signal: req.signal,
    });

    if (!openaiRes.ok || !openaiRes.body) {
      const text = await openaiRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `OpenAI request failed (${openaiRes.status}). ${text.slice(0, 300)}` }),
        { status: openaiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Stream the SSE response through to the client.
    return new Response(openaiRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
