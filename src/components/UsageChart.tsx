// Usage activity charts — a 7-day bar chart and a breakdown by event type.

import { useMemo } from 'react';
import type { UsageEvent, UsageKind } from '@/lib/usageLog';

const KIND_ROWS: { kind: UsageKind; label: string; color: string }[] = [
  { kind: 'chat', label: 'Chat replies', color: 'bg-brand-400' },
  { kind: 'web_search', label: 'Web searches', color: 'bg-accent-500' },
  { kind: 'image', label: 'Image generations', color: 'bg-warning-500' },
  { kind: 'reaction', label: 'Reactions', color: 'bg-ink-300' },
];

const DAYS = 7;

export function UsageChart({ events }: { events: UsageEvent[] }) {
  const { days, kindCounts, max, total } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (DAYS - 1 - i));
      return { key: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: 'short' }), count: 0 };
    });
    const byKey = new Map(days.map((d) => [d.key, d]));
    const kindCounts = new Map<UsageKind, number>();
    for (const e of events) {
      kindCounts.set(e.kind, (kindCounts.get(e.kind) ?? 0) + 1);
      const day = byKey.get(new Date(e.created_at).toDateString());
      if (day) day.count += 1;
    }
    return {
      days,
      kindCounts,
      max: Math.max(1, ...days.map((d) => d.count)),
      total: events.length,
    };
  }, [events]);

  return (
    <div className="space-y-4 rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
      <div>
        <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">Activity, last 7 days</p>
        <div className="flex h-28 items-end gap-2">
          {days.map((d) => (
            <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-2xs font-medium text-ink-200">{d.count > 0 ? d.count : ''}</span>
              <div
                title={`${d.label}: ${d.count} events`}
                className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-brand-600/70 to-brand-300 transition-all duration-500"
                style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 6 : 2)}%` }}
              />
              <span className="text-2xs text-ink-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-white/[0.06] pt-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-ink-400">By activity type</p>
        {KIND_ROWS.map((row) => {
          const count = kindCounts.get(row.kind) ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={row.kind}>
              <div className="mb-1 flex items-center justify-between text-2xs">
                <span className="text-ink-200">{row.label}</span>
                <span className="text-ink-400">{count} · {pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                <div className={`h-full rounded-full transition-all duration-500 ${row.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
