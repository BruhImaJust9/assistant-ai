// Mock image generation — produces an inline SVG data URL so generated images
// render without an external service. Real providers implement the same
// `ImageGenProvider` interface.

import type { GeneratedImage } from '@/types';
import type { AspectRatio, ImageGenProvider, ImageGenResult, ImageStyle } from '@/ai/types';
import { uid } from '@/utils';

const ASPECT_DIMS: Record<AspectRatio, { w: number; h: number }> = {
  '1:1': { w: 768, h: 768 },
  '16:9': { w: 1024, h: 576 },
  '9:16': { w: 576, h: 1024 },
  '4:3': { w: 1024, h: 768 },
  '3:2': { w: 900, h: 600 },
};

const STYLE_HUES: Record<ImageStyle, number> = {
  auto: 190,
  photoreal: 200,
  illustration: 280,
  '3d': 30,
  anime: 320,
  minimal: 210,
  cinematic: 250,
};

function makeSvg(prompt: string, ar: AspectRatio, style: ImageStyle, variant: number): string {
  const { w, h } = ASPECT_DIMS[ar];
  const hue = (STYLE_HUES[style] + variant * 47) % 360;
  const hue2 = (hue + 40) % 360;
  const safe = prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 80);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue}, 55%, 22%)"/>
      <stop offset="1" stop-color="hsl(${hue2}, 50%, 12%)"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.3}" cy="${h * 0.35}" r="${Math.min(w, h) * 0.18}" fill="hsl(${hue}, 70%, 45%)" opacity="0.5"/>
  <circle cx="${w * 0.72}" cy="${h * 0.68}" r="${Math.min(w, h) * 0.12}" fill="hsl(${hue2}, 70%, 55%)" opacity="0.4"/>
  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="hsl(${hue}, 80%, 88%)" font-family="Inter, sans-serif" font-size="${Math.round(Math.min(w, h) / 22)}" font-weight="600">${safe}</text>
  <text x="${w / 2}" y="${h - 24}" text-anchor="middle" fill="hsl(${hue}, 40%, 70%)" font-family="Inter, sans-serif" font-size="14" opacity="0.7">Nova Image · ${ar} · ${style}</text>
</svg>`;
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const mockImageGenProvider: ImageGenProvider = {
  id: 'mock-image-gen',
  async generate(req): Promise<ImageGenResult> {
    await new Promise((r) => setTimeout(r, 1400 + Math.random() * 800));
    const images: GeneratedImage[] = Array.from({ length: req.count }, (_, i) => ({
      id: uid('img'),
      url: svgToDataUrl(makeSvg(req.prompt, req.aspectRatio, req.style, i)),
      prompt: req.prompt,
      width: ASPECT_DIMS[req.aspectRatio].w,
      height: ASPECT_DIMS[req.aspectRatio].h,
      model: 'nova-image',
    }));
    return { images };
  },
};
