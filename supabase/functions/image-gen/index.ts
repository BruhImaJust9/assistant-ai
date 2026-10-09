// Edge function: image-gen
// Proxies image generation requests to OpenAI's DALL-E 3 API, keeping the
// API key server-side. Falls back gracefully when the key is not configured.
// No JWT verification required — accessible with the anon key.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

const SIZE_MAP: Record<string, string> = {
  "1:1": "1024x1024",
  "16:9": "1792x1024",
  "9:16": "1024x1792",
  "4:3": "1024x1024",
  "3:2": "1024x1024",
};

interface GenRequest {
  prompt: string;
  aspectRatio?: string;
  count?: number;
  style?: string;
}

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

    const body = (await req.json()) as GenRequest;
    const { prompt, aspectRatio = "1:1", style = "auto" } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'prompt' in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const size = SIZE_MAP[aspectRatio] ?? "1024x1024";

    // DALL-E 3 supports 1 image per request; for count > 1 we call multiple times.
    const count = Math.min(body.count ?? 1, 4);
    const promises = Array.from({ length: count }, () =>
      fetch(OPENAI_IMAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt.slice(0, 4000),
          n: 1,
          size,
          quality: "standard",
        }),
      })
    );

    const responses = await Promise.all(promises);
    const images: { url: string; prompt: string }[] = [];

    for (const res of responses) {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return new Response(
          JSON.stringify({ error: `OpenAI image generation failed (${res.status}). ${text.slice(0, 300)}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const data = await res.json();
      if (data.data?.[0]?.url) {
        images.push({ url: data.data[0].url, prompt });
      }
    }

    return new Response(
      JSON.stringify({ images }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
