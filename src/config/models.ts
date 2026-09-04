// Central model + provider configuration.
// Provider-specific code is isolated so providers can be swapped without touching the UI.

import type { ToolKind } from '@/types';

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'mock';

export interface ModelCapability {
  chat: boolean;
  webSearch: boolean;
  imageGeneration: boolean;
  fileAnalysis: boolean;
  /** Max output tokens per response. */
  maxOutputTokens: number;
  /** Context window in tokens. */
  contextWindow: number;
}

export interface ModelConfig {
  id: string;
  /** Display name, e.g. "GPT-4o". */
  name: string;
  /** Short tagline shown under the name. */
  tagline: string;
  provider: ProviderId;
  /** Emoji-free badge label, e.g. "Flagship", "Fast". */
  badge?: string;
  capabilities: ModelCapability;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  /** Env var name that must be set for this provider to be available. */
  envVar: string;
  available: boolean;
}

/**
 * The model catalog. Add or edit models here — the UI adapts automatically.
 */
export const MODELS: ModelConfig[] = [
  {
    id: 'nova-pro',
    name: 'Nova Pro',
    tagline: 'Most capable — reasoning, tools, and vision',
    provider: 'openai',
    badge: 'Flagship',
    capabilities: {
      chat: true,
      webSearch: true,
      imageGeneration: false,
      fileAnalysis: true,
      maxOutputTokens: 4096,
      contextWindow: 128_000,
    },
  },
  {
    id: 'nova-flash',
    name: 'Nova Flash',
    tagline: 'Fast and efficient for everyday tasks',
    provider: 'openai',
    badge: 'Fast',
    capabilities: {
      chat: true,
      webSearch: true,
      imageGeneration: false,
      fileAnalysis: true,
      maxOutputTokens: 2048,
      contextWindow: 64_000,
    },
  },
  {
    id: 'nova-image',
    name: 'Nova Image',
    tagline: 'High-fidelity image generation',
    provider: 'mock',
    badge: 'Image',
    capabilities: {
      chat: false,
      webSearch: false,
      imageGeneration: true,
      fileAnalysis: false,
      maxOutputTokens: 0,
      contextWindow: 0,
    },
  },
  // Real providers — wired behind the same boundary. These appear once their
  // env var is configured; otherwise they stay hidden so the UI never lies.
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    tagline: 'OpenAI flagship multimodal model',
    provider: 'openai',
    badge: 'OpenAI',
    capabilities: {
      chat: true,
      webSearch: true,
      imageGeneration: false,
      fileAnalysis: true,
      maxOutputTokens: 4096,
      contextWindow: 128_000,
    },
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    tagline: 'Anthropic — strong reasoning and writing',
    provider: 'anthropic',
    badge: 'Anthropic',
    capabilities: {
      chat: true,
      webSearch: true,
      imageGeneration: false,
      fileAnalysis: true,
      maxOutputTokens: 4096,
      contextWindow: 200_000,
    },
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    tagline: 'Google — long context, multimodal',
    provider: 'google',
    badge: 'Google',
    capabilities: {
      chat: true,
      webSearch: true,
      imageGeneration: false,
      fileAnalysis: true,
      maxOutputTokens: 4096,
      contextWindow: 1_000_000,
    },
  },
];

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  mock: {
    id: 'mock',
    name: 'Nova (Built-in)',
    envVar: '',
    available: true,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    envVar: 'VITE_OPENAI_ENABLED',
    available: import.meta.env.VITE_OPENAI_ENABLED === 'true',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    envVar: 'VITE_ANTHROPIC_API_KEY',
    available: Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY),
  },
  google: {
    id: 'google',
    name: 'Google',
    envVar: 'VITE_GOOGLE_API_KEY',
    available: Boolean(import.meta.env.VITE_GOOGLE_API_KEY),
  },
};

/**
 * Models the user can actually select right now. Mock models are always
 * available; real-provider models only surface when their key is configured.
 */
export function getAvailableModels(): ModelConfig[] {
  return MODELS.filter((m) => PROVIDERS[m.provider].available);
}

export function getDefaultModelId(): string {
  return 'nova-pro';
}

export function getModel(id: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelSupportsTool(model: ModelConfig, tool: ToolKind): boolean {
  switch (tool) {
    case 'web-search':
      return model.capabilities.webSearch;
    case 'image-generation':
      return model.capabilities.imageGeneration;
    case 'file-analysis':
      return model.capabilities.fileAnalysis;
  }
}
