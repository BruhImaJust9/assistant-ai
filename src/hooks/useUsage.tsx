// Lightweight usage tracking — persists to localStorage so it survives reloads.
// Tracks message counts, estimated tokens, per-model usage, custom budget, and alerts.

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
  tokenBudget: number;
  alertThreshold: number;
  alertDismissed: boolean;
}

interface UsageContextValue extends UsageState {
  recordChat: (modelId: string, estimatedTokens: number) => void;
  recordImageGen: () => void;
  recordWebSearch: () => void;
  reset: () => void;
  setTokenBudget: (budget: number) => void;
  setAlertThreshold: (threshold: number) => void;
  dismissAlert: () => void;
  exportCSV: () => void;
  exportJSON: () => void;
}

const STORAGE_KEY = 'nova-usage-v1';
const DEFAULT_BUDGET = 100_000;
const DEFAULT_ALERT_THRESHOLD = 80;

const emptyState: UsageState = {
  models: {},
  imageGens: 0,
  webSearches: 0,
  totalMessages: 0,
  totalEstimatedTokens: 0,
  lastReset: new Date().toISOString(),
  tokenBudget: DEFAULT_BUDGET,
  alertThreshold: DEFAULT_ALERT_THRESHOLD,
  alertDismissed: false,
};

function loadState(): UsageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<UsageState>;
    return { ...emptyState, ...parsed };
  } catch {
    return emptyState;
  }
}

const UsageContext = createContext<UsageContextValue | null>(null);

function persistState(next: UsageState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable in private mode — state stays in-memory.
  }
}

export function UsageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UsageState>(emptyState);

  useEffect(() => {
    setState(loadState());
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
          alertDismissed: false,
        };
        persistState(next);
        return next;
      });
    },
    [],
  );

  const recordImageGen = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, imageGens: prev.imageGens + 1 };
      persistState(next);
      return next;
    });
  }, []);

  const recordWebSearch = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, webSearches: prev.webSearches + 1 };
      persistState(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = { ...emptyState, tokenBudget: state.tokenBudget, alertThreshold: state.alertThreshold, lastReset: new Date().toISOString() };
    setState(next);
    persistState(next);
  }, [state.tokenBudget, state.alertThreshold]);

  const setTokenBudget = useCallback((budget: number) => {
    setState((prev) => {
      const next = { ...prev, tokenBudget: Math.max(budget, 1000), alertDismissed: false };
      persistState(next);
      return next;
    });
  }, []);

  const setAlertThreshold = useCallback((threshold: number) => {
    setState((prev) => {
      const next = { ...prev, alertThreshold: Math.min(Math.max(threshold, 10), 95), alertDismissed: false };
      persistState(next);
      return next;
    });
  }, []);

  const dismissAlert = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, alertDismissed: true };
      persistState(next);
      return next;
    });
  }, []);

  const exportJSON = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      ...state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `nova-usage-${Date.now()}.json`);
  }, [state]);

  const exportCSV = useCallback(() => {
    const rows = ['Model,Messages,Estimated Tokens'];
    for (const [modelId, data] of Object.entries(state.models)) {
      rows.push(`${modelId},${data.messages},${data.estimatedTokens}`);
    }
    rows.push('');
    rows.push(`Summary,,,`);
    rows.push(`Total Messages,,${state.totalMessages}`);
    rows.push(`Total Tokens,,${state.totalEstimatedTokens}`);
    rows.push(`Web Searches,,${state.webSearches}`);
    rows.push(`Image Gens,,${state.imageGens}`);
    rows.push(`Token Budget,,${state.tokenBudget}`);
    rows.push(`Last Reset,,${state.lastReset}`);
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    downloadBlob(blob, `nova-usage-${Date.now()}.csv`);
  }, [state]);

  const value: UsageContextValue = {
    ...state,
    recordChat,
    recordImageGen,
    recordWebSearch,
    reset,
    setTokenBudget,
    setAlertThreshold,
    dismissAlert,
    exportCSV,
    exportJSON,
  };

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useUsage(): UsageContextValue {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error('useUsage must be used within UsageProvider');
  return ctx;
}

export const USAGE_TOKEN_BUDGET = DEFAULT_BUDGET;
