// Citation cards for web-search results.

import { ExternalLink } from 'lucide-react';
import type { Citation } from '@/types';
import { cx } from '@/utils';

interface CitationsProps {
  citations: Citation[];
}

export function Citations({ citations }: CitationsProps) {
  if (!citations.length) return null;
  return (
    <div className="my-3">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
        Sources
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {citations.map((c, i) => (
          <a
            key={c.id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2.5 rounded-lg border border-white/[0.07] bg-ink-850/60 p-2.5 transition-all hover:border-brand-400/30 hover:bg-ink-800"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-500/15 text-2xs font-semibold text-brand-300">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-100 group-hover:text-white">
                {c.title}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-400">
                {c.faviconUrl && (
                  <img
                    src={c.faviconUrl}
                    alt=""
                    className="h-3 w-3 rounded-sm"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                )}
                <span className="truncate">{c.domain}</span>
              </div>
            </div>
            <ExternalLink size={13} className="mt-0.5 shrink-0 text-ink-400 group-hover:text-brand-300" />
          </a>
        ))}
      </div>
    </div>
  );
}

interface InlineCiteProps {
  index: number;
  citation: Citation;
}

export function InlineCite({ index, citation }: InlineCiteProps) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      title={citation.title}
      className={cx(
        'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500/15 px-1 align-super text-2xs font-semibold text-brand-300',
        'hover:bg-brand-500/25 hover:text-brand-200',
      )}
    >
      {index + 1}
    </a>
  );
}
