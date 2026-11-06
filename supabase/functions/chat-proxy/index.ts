// Edge function: chat-proxy. Proxies compact streaming requests to Groq.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_MAP: Record<string, string> = {
  "nova-pro": "llama-3.1-8b-instant",
  "nova-flash": "llama-3.1-8b-instant",
};

const SYSTEM_PROMPT = `You are Novi, a warm and practical AI assistant. Be friendly, calm, and encouraging without being overly chatty. Give the clearest useful answer first, then add detail only when it helps. Use plain language, short paragraphs, and compact lists. Ask one focused follow-up question when the request is ambiguous. Never claim to have browsed, completed an action, or verified information unless the conversation provides that evidence. Be honest about uncertainty. When the user asks for code, provide safe, readable code and explain only the important decisions.`;

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) return json({ error: "The free AI key is not connected yet. Add GROQ_API_KEY to Supabase Secrets." }, 503);

    const body = await req.json() as {
      model?: string;
      messages?: Array<{ role: string; content: string }>;
      maxTokens?: number;
    };
    if (!body.model || !Array.isArray(body.messages)) return json({ error: "Invalid chat request." }, 400);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...body.messages
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content.slice(0, 6000) })),
    ];
    const maxTokens = Math.min(Math.max(body.maxTokens ?? 512, 128), 768);

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL_MAP[body.model] ?? MODEL_MAP["nova-flash"],
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
        stream: true,
      }),
      signal: req.signal,
    });

    if (!groqRes.ok || !groqRes.body) {
      const text = await groqRes.text().catch(() => "");
      return json({ error: `Free AI request failed (${groqRes.status}). ${text.slice(0, 240)}` }, groqRes.status);
    }

    return new Response(groqRes.body, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    return json({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
