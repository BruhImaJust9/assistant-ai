// OpenAI DALL-E 3 image generation provider — routes through a Supabase Edge
// Function (image-gen) that holds the API key server-side.

import type { GeneratedImage } from '@/types';
import type { ImageGenProvider, ImageGenResult } from '@/ai/types';
import { uid } from '@/utils';
import { edgeFunctionUrl, edgeFunctionHeaders } from '@/lib/edgeConfig';

export const openaiImageGenProvider: ImageGenProvider = {
  id: 'openai-image-gen',
  async generate(req): Promise<ImageGenResult> {
    try {
      const res = await fetch(edgeFunctionUrl('image-gen'), {
        method: 'POST',
        headers: edgeFunctionHeaders(),
        signal: req.signal,
        body: JSON.stringify({
          prompt: req.prompt,
          aspectRatio: req.aspectRatio,
          count: req.count,
          style: req.style,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        images?: { url: string; prompt: string }[];
        error?: string;
      };
      if (!res.ok) {
        return { images: [], error: data.error ?? `Image service request failed (${res.status}).` };
      }

      const rawImages = data.images ?? [];
      if (rawImages.length === 0) {
        return { images: [], error: 'The image service returned no images.' };
      }

      const images: GeneratedImage[] = rawImages.map((img) => ({
        id: uid('img'),
        url: img.url,
        prompt: img.prompt,
        model: 'dall-e-3',
      }));

      return { images };
    } catch (err) {
      if ((err as Error).name === 'AbortError') return { images: [] };
      return { images: [], error: `Unable to reach the image service: ${(err as Error).message || 'network error'}` };
    }
  },
};
