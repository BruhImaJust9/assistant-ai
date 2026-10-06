// OpenAI DALL-E 3 image generation provider — routes through a Supabase Edge
// Function (image-gen) that holds the API key server-side. Falls back to the
// mock provider when the backend is unavailable.

import type { GeneratedImage } from '@/types';
import type { AspectRatio, ImageGenProvider, ImageGenResult, ImageStyle } from '@/ai/types';
import { mockImageGenProvider } from '@/ai/providers/mockImageGen';
import { uid } from '@/utils';

function proxyUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-gen`;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const openaiImageGenProvider: ImageGenProvider = {
  id: 'openai-image-gen',
  async generate(req): Promise<ImageGenResult> {
    try {
      const res = await fetch(proxyUrl(), {
        method: 'POST',
        headers: authHeaders(),
        signal: req.signal,
        body: JSON.stringify({
          prompt: req.prompt,
          aspectRatio: req.aspectRatio,
          count: req.count,
          style: req.style,
        }),
      });

      if (!res.ok) {
        return mockImageGenProvider.generate(req);
      }

      const data = await res.json();
      const rawImages = (data.images ?? []) as { url: string; prompt: string }[];
      if (rawImages.length === 0) {
        return mockImageGenProvider.generate(req);
      }

      const images: GeneratedImage[] = rawImages.map((img) => ({
        id: uid('img'),
        url: img.url,
        prompt: img.prompt,
        model: 'dall-e-3',
      }));

      return { images };
    } catch {
      return mockImageGenProvider.generate(req);
    }
  },
};
