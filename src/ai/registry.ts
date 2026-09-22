// Provider registry — the single wiring point between the UI and AI backends.
//
// To swap a provider, change the implementation returned here. The UI only
// ever calls `getChatProvider(model)` etc. and never imports a concrete
// provider directly.

import type {
  ChatProvider,
  FileAnalysisProvider,
  ImageGenProvider,
  ProviderRegistry,
  WebSearchProvider,
} from '@/ai/types';
import type { ModelConfig } from '@/config/models';
import { PROVIDERS } from '@/config/models';

import { mockChatProvider } from '@/ai/providers/mockChat';
import { mockFileAnalysisProvider } from '@/ai/providers/mockFileAnalysis';
import { mockImageGenProvider } from '@/ai/providers/mockImageGen';
import { mockWebSearchProvider } from '@/ai/providers/mockWebSearch';
import { tavilyWebSearchProvider } from '@/ai/providers/tavilyWebSearch';
import { openaiChatProvider } from '@/ai/providers/openaiProvider';

function getChatProvider(model: ModelConfig): ChatProvider {
  switch (model.provider) {
    case 'openai':
      return openaiChatProvider;
    case 'mock':
    default:
      return mockChatProvider;
  }
}

function getImageGenProvider(): ImageGenProvider {
  // Wire a real image provider here when its key is configured.
  return mockImageGenProvider;
}

function getWebSearchProvider(): WebSearchProvider {
  return tavilyWebSearchProvider;
}

function getFileAnalysisProvider(): FileAnalysisProvider {
  return mockFileAnalysisProvider;
}

export const registry: ProviderRegistry = {
  chat: getChatProvider,
  imageGen: getImageGenProvider,
  webSearch: getWebSearchProvider,
  fileAnalysis: getFileAnalysisProvider,
};

export function isProviderConfigured(providerId: ModelConfig['provider']): boolean {
  return PROVIDERS[providerId].available;
}
