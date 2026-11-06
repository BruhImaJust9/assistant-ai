// Central model + provider configuration.

import type { ToolKind } from '@/types';

export type ProviderId = 'groq' | 'mock';

export interface ModelCapability {
  chat: boolean;
  webSearch: boolean;
  imageGeneration: boolean;
  fileAnalysis: boolean;
  maxOutputTokens: number;
  contextWindow: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  tagline: string;
  provider: ProviderId;
  badge?: string;
  capabilities: ModelCapability;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  envVar: string;
  available: boolean;
}

export const MODELS: ModelConfig[] = [
  {
    id: 'nova-pro',
    name: 'Nova Pro',
    tagline: 'Fast answers on a free-tier model',
    provider: 'groq',
    badge: 'Free tier',
    capabilities: {
      chat: true,
      webSearch: true,
      imageGeneration: false,
      fileAnalysis: true,
      maxOutputTokens: 768,
      contextWindow: 32_000,
    },
  },
  {
    id: 'nova-flash',
    name: 'Nova Flash',
    tagline: 'Shortest replies to save usage',
    provider: 'groq',
    badge: 'Efficient',
    capabilities: {
      chat: true,
      webSearch: true,
      imageGeneration: false,
      fileAnalysis: true,
      maxOutputTokens: 512,
      contextWindow: 16_000,
    },
  },
  {
    id: 'nova-image',
    name: 'Nova Image',
    tagline: 'Local illustration preview with no API cost',
    provider: 'mock',
    badge: 'Local',
    capabilities: {
      chat: false,
      webSearch: false,
      imageGeneration: true,
      fileAnalysis: false,
      maxOutputTokens: 0,
      contextWindow: 0,
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
  groq: {
    id: 'groq',
    name: 'Groq',
    envVar: 'GROQ_API_KEY',
    available: true,
  },
};

export function getAvailableModels(): ModelConfig[] {
  return MODELS.filter((m) => PROVIDERS[m.provider].available);
}

export function getDefaultModelId(): string {
  return 'nova-flash';
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
