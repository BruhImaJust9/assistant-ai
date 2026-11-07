// Lightweight usage tracking — persists to localStorage so it survives reloads.
// Tracks message counts, estimated tokens, and per-model usage.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface ModelUsage {
  messages: number;
  estimatedTokens: number;
}

interface UsageState {
  models: Record<string, ModelUsage>;
  imageGens: number;
  webSearches: number;
  totalMessages: number;
  totalEstimatedTokens: number;
  lastReset: string;
}

interface UsageContextValue extends UsageState {
  recordChat: (modelId: string, estimatedTokens: number) => void;
  recordImageGen: () => void;
  recordWebSearch: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'nova-usage-v1';
const TOKEN_BUDGET = 100_000;

const emptyState: UsageState = {
  models: {},
  imageGens: 0,
  webSearches: 0,
  totalMessages: 0,
  totalEstimatedTokens: 0,
  lastReset: new Date().toISOString(),
};

function loadState(): UsageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as UsageState;
    return { ...emptyState, ...parsed };
  } catch {
    return emptyState;
  }
}

const UsageContext = createContext<UsageContextValue | null>(null);

export function UsageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UsageState>(emptyState);

  useEffect(() => {
    setState(loadState());
  }, []);

  const persist = useCallback((next: UsageState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable in private mode — state stays in-memory.
    }
  }, []);

  const recordChat = useCallback(
    (modelId: string, estimatedTokens: number) => {
      setState((prev) => {
        const modelUsage = prev.models[modelId] ?? { messages: 0, estimatedTokens: 0 };
        const next: UsageState = {
          ...prev,
          models: {
            ...prev.models,
            [modelId]: {
              messages: modelUsage.messages + 1,
              estimatedTokens: modelUsage.estimatedTokens + estimatedTokens,
            },
          },
          totalMessages: prev.totalMessages + 1,
          totalEstimatedTokens: prev.totalEstimatedTokens + estimatedTokens,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // In-memory only if storage fails.
        }
        return next;
      });
    },
    [],
  );

  const recordImageGen = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, imageGens: prev.imageGens + 1 };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // In-memory only.
      }
      return next;
    });
  }, []);

  const recordWebSearch = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, webSearches: prev.webSearches + 1 };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // In-memory only.
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = { ...emptyState, lastReset: new Date().toISOString() };
    persist(next);
  }, [persist]);

  const value: UsageContextValue = { ...state, recordChat, recordImageGen, recordWebSearch, reset };

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}

export function useUsage(): UsageContextValue {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error('useUsage must be used within UsageProvider');
  return ctx;
}

export const USAGE_TOKEN_BUDGET = TOKEN_BUDGET;
