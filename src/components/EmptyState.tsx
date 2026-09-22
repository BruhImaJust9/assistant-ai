// Empty state shown when a conversation has no messages.

import { Sparkles, Globe, Image, FileText, Code2 } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Sparkles, title: 'Explain a concept', prompt: 'Explain how transformers work in machine learning, in simple terms.' },
  { icon: Code2, title: 'Write some code', prompt: 'Write a TypeScript function that debounces an async function call.' },
  { icon: Globe, title: 'Search the web', prompt: 'What are the latest developments in quantum computing?', tool: 'web-search' as const },
  { icon: Image, title: 'Generate an image', prompt: 'A serene mountain lake at golden hour, photorealistic', tool: 'image-generation' as const },
];

interface EmptyStateProps {
  onSuggestion: (prompt: string, tool?: 'web-search' | 'image-generation') => void;
}

export function EmptyState({ onSuggestion }: EmptyStateProps) {
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
      <p className="mt-2 text-sm text-ink-300 text-center max-w-md">
        Ask anything, search the web, generate images, or analyze files. Switch tools from the panel on the right.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onSuggestion(s.prompt, s.tool)}
            className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-ink-850/40 p-3.5 text-left transition-all hover:border-brand-400/20 hover:bg-ink-800 active:scale-[0.99]"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-brand-300 transition-colors group-hover:bg-brand-500/15">
              <s.icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-100">{s.title}</p>
              <p className="mt-0.5 text-2xs text-ink-400 line-clamp-2">{s.prompt}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
