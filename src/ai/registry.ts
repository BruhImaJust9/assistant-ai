// Provider registry — the single wiring point between the UI and AI backends.

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
import { tavilyWebSearchProvider } from '@/ai/providers/tavilyWebSearch';
import { groqChatProvider } from '@/ai/providers/openaiProvider';

function getChatProvider(model: ModelConfig): ChatProvider {
  return model.provider === 'groq' ? groqChatProvider : mockChatProvider;
}

export const registry: ProviderRegistry = {
  chat: getChatProvider,
  imageGen: () => mockImageGenProvider,
  webSearch: () => tavilyWebSearchProvider,
  fileAnalysis: () => mockFileAnalysisProvider,
};

export function isProviderConfigured(providerId: ModelConfig['provider']): boolean {
  return PROVIDERS[providerId].available;
}
