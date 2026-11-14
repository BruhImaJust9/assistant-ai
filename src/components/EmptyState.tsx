// Empty state shown when a conversation has no messages. Preset prompts are
// grouped into categories the user can switch between.

import { useState } from 'react';
import { PRESET_CATEGORIES } from '@/config/presets';
import { cx } from '@/utils';

interface EmptyStateProps {
  onSuggestion: (prompt: string, tool?: 'web-search' | 'image-generation') => void;
}

const TOOL_LABELS = { 'web-search': 'Web search', 'image-generation': 'Image generation' } as const;

export function EmptyState({ onSuggestion }: EmptyStateProps) {
  const [activeId, setActiveId] = useState(PRESET_CATEGORIES[0].id);
  const active = PRESET_CATEGORIES.find((c) => c.id === activeId) ?? PRESET_CATEGORIES[0];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-800 border border-white/[0.08] shadow-glow">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 6.5c1.6 3.7 3.2 5.3 6.9 6.9-3.7 1.6-5.3 3.2-6.9 6.9-1.6-3.7-3.2-5.3-6.9-6.9 3.7-1.6 5.3-3.2 6.9-6.9Z" fill="#22d3ee" />
          <circle cx="22" cy="22" r="2.2" fill="#34d399" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-white text-balance text-center">
        How can I help you today?
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-ink-300">
        Pick a starting point below, type your own question, or switch tools from the panel on the right.
      </p>

      <div role="tablist" aria-label="Preset categories" className="mt-8 flex flex-wrap justify-center gap-1.5">
        {PRESET_CATEGORIES.map((c) => {
          const selected = c.id === active.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(c.id)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                selected
                  ? 'border-brand-400/40 bg-brand-500/15 text-brand-200'
                  : 'border-white/[0.08] bg-white/[0.03] text-ink-200 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <c.icon size={13} />
              {c.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-2xs text-ink-400">{active.description}</p>

      <div
        key={active.id}
        className="mt-4 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3 animate-fade-up"
      >
        {active.prompts.map((p) => (
          <button
            key={p.title}
            type="button"
            onClick={() => onSuggestion(p.prompt, p.tool)}
            className="group flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-ink-850/40 p-3.5 text-left transition-all hover:border-brand-400/20 hover:bg-ink-800 active:scale-[0.99]"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink-100 group-hover:text-white">{p.title}</span>
              {p.tool && (
                <span className="shrink-0 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-2xs font-medium text-brand-300">
                  {TOOL_LABELS[p.tool]}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-2xs text-ink-400">{p.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
