// Edge function: chat-proxy. Proxies compact streaming requests to Groq.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_MAP: Record<string, string> = {
  "nova-pro": "openai/gpt-oss-120b",
  "nova-flash": "openai/gpt-oss-20b",
  "nova-lite": "openai/gpt-oss-20b",
};

const SYSTEM_PROMPT = `You are Nova, a warm, practical AI assistant. Lead with the direct answer in your first sentence, then add detail only when it helps. Keep replies short: use brief paragraphs and compact lists, and define any jargon you use. When a request is ambiguous, state the assumption you are making and ask one focused follow-up question. Never claim to have browsed the web, run code, or completed an action unless the conversation shows it. When search results are provided, rely on them and cite them by number in brackets. Say so plainly when you are unsure. When writing code, give complete, safe, readable code in a fenced block and briefly explain the key decisions.`;

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGroq(apiKey: string, model: string, messages: unknown[], maxTokens: number, signal: AbortSignal): Promise<Response> {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2, stream: true }),
    signal,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const groqModel = MODEL_MAP[body.model] ?? MODEL_MAP["nova-flash"];

    let groqRes = await callGroq(apiKey, groqModel, messages, maxTokens, req.signal);

    // Auto-retry once on rate limit after a brief backoff.
    if (groqRes.status === 429) {
      const retryAfter = Number(groqRes.headers.get("retry-after")) || 2;
      await sleep(Math.min(retryAfter * 1000, 4000));
      groqRes = await callGroq(apiKey, groqModel, messages, maxTokens, req.signal);
    }

    if (!groqRes.ok || !groqRes.body) {
      const text = await groqRes.text().catch(() => "");
      const detail = text.slice(0, 240);
      if (groqRes.status === 429) {
        return json({ error: `Groq's free tier is busy right now (rate limit). Please wait a few seconds and retry. ${detail}` }, 429);
      }
      return json({ error: `Free AI request failed (${groqRes.status}). ${detail}` }, groqRes.status);
    }

    return new Response(groqRes.body, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    return json({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
