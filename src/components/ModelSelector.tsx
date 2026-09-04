// Model selector dropdown — picks from available models in the catalog.

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Zap, Star } from 'lucide-react';
import { getAvailableModels, type ModelConfig } from '@/config/models';
import { cx } from '@/utils';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  compact?: boolean;
}

export function ModelSelector({ value, onChange, compact }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const models = getAvailableModels();
  const current = models.find((m) => m.id === value) ?? models[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'flex items-center gap-2 rounded-lg border border-white/[0.08] bg-ink-850 text-sm font-medium text-ink-100 transition-colors hover:bg-ink-800',
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2',
        )}
      >
        <ModelIcon model={current} />
        <span>{current.name}</span>
        <ChevronDown size={14} className={cx('text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-xl border border-white/[0.08] bg-ink-850 shadow-panel animate-scale-in">
          <div className="border-b border-white/[0.06] px-3 py-2">
            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-400">Models</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={cx(
                  'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05]',
                  m.id === value && 'bg-white/[0.06]',
                )}
              >
                <div className="mt-0.5">
                  <ModelIcon model={m} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{m.name}</span>
                    {m.badge && (
                      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-2xs text-ink-300">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-2xs text-ink-400">{m.tagline}</p>
                </div>
                {m.id === value && <Check size={15} className="mt-1 shrink-0 text-brand-300" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModelIcon({ model }: { model: ModelConfig }) {
  const isImage = model.capabilities.imageGeneration;
  const isFlagship = model.badge === 'Flagship';
  return (
    <div className={cx(
      'flex h-6 w-6 items-center justify-center rounded-md',
      isImage ? 'bg-accent-500/15 text-accent-400' : isFlagship ? 'bg-brand-500/15 text-brand-300' : 'bg-white/[0.06] text-ink-200',
    )}>
      {isImage ? <ImageIcon /> : isFlagship ? <Star size={13} /> : <Zap size={13} />}
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
