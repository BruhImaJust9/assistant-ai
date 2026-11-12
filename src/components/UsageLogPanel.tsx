// Usage log panel — reaction analytics per model and a filtered CSV export.

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { MODELS } from '@/config/models';
import {
  downloadCsv,
  eventsToCsv,
  fetchUsageEvents,
  type UsageEvent,
  type UsageKind,
  type UsageLogFilters,
} from '@/lib/usageLog';

const KIND_OPTIONS: { value: UsageKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All events' },
  { value: 'chat', label: 'Chat replies' },
  { value: 'reaction', label: 'Reactions' },
  { value: 'web_search', label: 'Web searches' },
  { value: 'image', label: 'Image generations' },
];

export function UsageLogPanel() {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<UsageKind | 'all'>('all');
  const [modelId, setModelId] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const filters = useMemo<UsageLogFilters>(
    () => ({
      kind,
      modelId,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    }),
    [kind, modelId, from, to],
  );

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await fetchUsageEvents({ kind: 'all', modelId: 'all' }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const analytics = useMemo(() => {
    const perModel = new Map<string, { up: number; down: number }>();
    let up = 0;
    let down = 0;
    for (const e of events) {
      if (e.kind !== 'reaction' || !e.reaction) continue;
      const key = e.model_id ?? 'unknown';
      const row = perModel.get(key) ?? { up: 0, down: 0 };
      if (e.reaction === 'up') {
        row.up += 1;
        up += 1;
      } else {
        row.down += 1;
        down += 1;
      }
      perModel.set(key, row);
    }
    const total = up + down;
    return {
      up,
      down,
      helpfulRate: total > 0 ? Math.round((up / total) * 100) : null,
      rows: [...perModel.entries()].map(([model, counts]) => ({
        model,
        ...counts,
        rate: Math.round((counts.up / (counts.up + counts.down)) * 100),
      })),
    };
  }, [events]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const matching = await fetchUsageEvents(filters);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(eventsToCsv(matching), `nova-usage-log-${stamp}.csv`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
          <BarChart3 size={13} /> Reactions & Logs
        </div>
        <button type="button" onClick={loadEvents} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-2xs font-medium text-ink-200 hover:bg-white/[0.1] disabled:opacity-50">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-white/[0.07] bg-ink-850/60 p-3.5">
        {error && <p className="rounded-md bg-error-500/10 px-2.5 py-2 text-2xs text-error-400">Could not load usage data: {error}</p>}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-2.5 text-center">
            <p className="text-2xs font-medium uppercase tracking-wider text-ink-400">Helpful</p>
            <p className="flex items-center justify-center gap-1 text-lg font-semibold text-accent-400"><ThumbsUp size={14} />{analytics.up}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-2.5 text-center">
            <p className="text-2xs font-medium uppercase tracking-wider text-ink-400">Not helpful</p>
            <p className="flex items-center justify-center gap-1 text-lg font-semibold text-error-400"><ThumbsDown size={14} />{analytics.down}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-2.5 text-center">
            <p className="text-2xs font-medium uppercase tracking-wider text-ink-400">Helpful rate</p>
            <p className="text-lg font-semibold text-white">{analytics.helpfulRate === null ? '—' : `${analytics.helpfulRate}%`}</p>
          </div>
        </div>

        {analytics.rows.length > 0 && (
          <div className="space-y-1.5">
            {analytics.rows.map((row) => (
              <div key={row.model} className="flex items-center justify-between rounded-md bg-ink-900/40 px-2.5 py-1.5">
                <span className="text-2xs font-medium text-ink-200">{row.model}</span>
                <span className="text-2xs text-ink-400">{row.up} up · {row.down} down · {row.rate}% helpful</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
          <select value={kind} onChange={(e) => setKind(e.target.value as UsageKind | 'all')} className="input-field text-2xs">
            {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="input-field text-2xs">
            <option value="all">All models</option>
            {MODELS.filter((m) => m.provider !== 'mock').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="flex flex-col gap-1 text-2xs text-ink-400">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field text-2xs" />
          </label>
          <label className="flex flex-col gap-1 text-2xs text-ink-400">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field text-2xs" />
          </label>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-2xs text-ink-400">{events.length} events recorded</p>
          <button type="button" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-1.5 rounded-md bg-brand-500/15 px-2.5 py-1.5 text-2xs font-medium text-brand-300 hover:bg-brand-500/25 disabled:opacity-50">
            <Download size={12} /> {exporting ? 'Exporting…' : 'Export filtered CSV'}
          </button>
        </div>
      </div>
    </section>
  );
}
