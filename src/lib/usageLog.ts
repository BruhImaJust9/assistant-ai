// Usage event log — writes and reads per-event rows in the usage_events table.

import { supabase } from '@/lib/supabase';

export type UsageKind = 'chat' | 'web_search' | 'image' | 'reaction';

export interface UsageEvent {
  id: string;
  kind: UsageKind;
  model_id: string | null;
  tokens: number;
  reaction: 'up' | 'down' | null;
  message_id: string | null;
  created_at: string;
}

export interface UsageLogFilters {
  kind?: UsageKind | 'all';
  modelId?: string | 'all';
  from?: string;
  to?: string;
}

export async function logUsageEvent(event: Omit<UsageEvent, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('usage_events').insert(event);
  if (error) console.warn('Usage event not saved:', error.message);
}

export async function fetchUsageEvents(filters: UsageLogFilters): Promise<UsageEvent[]> {
  let query = supabase
    .from('usage_events')
    .select('id, kind, model_id, tokens, reaction, message_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (filters.kind && filters.kind !== 'all') query = query.eq('kind', filters.kind);
  if (filters.modelId && filters.modelId !== 'all') query = query.eq('model_id', filters.modelId);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Unexpected response from the usage log.');
  return data as UsageEvent[];
}

export function eventsToCsv(events: UsageEvent[]): string {
  const header = 'created_at,kind,model_id,tokens,reaction,message_id';
  const rows = events.map((e) =>
    [e.created_at, e.kind, e.model_id ?? '', e.tokens, e.reaction ?? '', e.message_id ?? '']
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
