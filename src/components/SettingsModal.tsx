// Settings modal — preferences, service status, API key management, usage dashboard.

import { useState } from 'react';
import { Zap, Keyboard, Key, Check, BarChart3, RotateCcw, AlertCircle, ImageIcon, Globe, Download, Bell } from 'lucide-react';
import { Modal, Toggle, Badge } from '@/components/ui';
import { getAvailableModels, getDefaultModelId } from '@/config/models';
import { useUsage } from '@/hooks/useUsage';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [sendOnEnter, setSendOnEnter] = useState(true);
  const [streaming, setStreaming] = useState(true);
  const [webSearchDefault, setWebSearchDefault] = useState(false);
  const [defaultModel, setDefaultModel] = useState(getDefaultModelId());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [thresholdInput, setThresholdInput] = useState('');
  const models = getAvailableModels();
  const usage = useUsage();

  const copyKeyName = (keyName: string) => {
    navigator.clipboard.writeText(keyName);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const tokenPct = Math.min(Math.round((usage.totalEstimatedTokens / usage.tokenBudget) * 100), 100);
  const budgetRemaining = Math.max(usage.tokenBudget - usage.totalEstimatedTokens, 0);
  const isLowBalance = tokenPct >= usage.alertThreshold && !usage.alertDismissed;

  const applyBudget = () => {
    const n = parseInt(budgetInput, 10);
    if (!isNaN(n) && n > 0) {
      usage.setTokenBudget(n);
      setBudgetInput('');
    }
  };

  const applyThreshold = () => {
    const n = parseInt(thresholdInput, 10);
    if (!isNaN(n) && n >= 10 && n <= 95) {
      usage.setAlertThreshold(n);
      setThresholdInput('');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" width="lg">
      <div className="space-y-5">
        {/* Usage Dashboard */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <BarChart3 size={13} /> Usage Dashboard
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-ink-850/60 p-3.5 space-y-3">
            {/* Low balance alert */}
            {isLowBalance && (
              <div className="flex items-start gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 px-3 py-2.5 text-sm text-warning-400">
                <Bell size={14} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Low balance alert</p>
                  <p className="mt-0.5 text-2xs text-warning-400/80">You've used {tokenPct}% of your token budget. Consider switching to Nova Lite to conserve tokens.</p>
                </div>
                <button type="button" onClick={usage.dismissAlert} className="text-2xs text-warning-400/60 hover:text-warning-400">Dismiss</button>
              </div>
            )}

            {/* Token budget bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-100">Token budget</span>
                <span className="text-2xs text-ink-400">
                  {usage.totalEstimatedTokens.toLocaleString()} / {usage.tokenBudget.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${tokenPct > 80 ? 'bg-error-500' : tokenPct > 50 ? 'bg-warning-500' : 'bg-accent-500'}`}
                  style={{ width: `${tokenPct}%` }}
                />
              </div>
              <p className="mt-1 text-2xs text-ink-400">{budgetRemaining.toLocaleString()} tokens remaining</p>
            </div>

            {/* Custom budget + alert threshold */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-2.5">
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-400">Custom budget</p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyBudget()}
                    placeholder={usage.tokenBudget.toLocaleString()}
                    className="w-full rounded-md bg-ink-950/60 px-2 py-1 text-2xs text-ink-100 outline-none focus:ring-1 focus:ring-brand-400/40"
                  />
                  <button type="button" onClick={applyBudget} className="rounded-md bg-white/[0.06] px-2 py-1 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]">Set</button>
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-2.5">
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-400">Alert at %</p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyThreshold()}
                    placeholder={`${usage.alertThreshold}%`}
                    className="w-full rounded-md bg-ink-950/60 px-2 py-1 text-2xs text-ink-100 outline-none focus:ring-1 focus:ring-brand-400/40"
                  />
                  <button type="button" onClick={applyThreshold} className="rounded-md bg-white/[0.06] px-2 py-1 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]">Set</button>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Messages" value={usage.totalMessages} />
              <StatCard label="Web searches" value={usage.webSearches} icon={<Globe size={11} />} />
              <StatCard label="Image gens" value={usage.imageGens} icon={<ImageIcon size={11} />} />
            </div>

            {/* Per-model breakdown */}
            {Object.keys(usage.models).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-2xs font-semibold uppercase tracking-wider text-ink-400">Per model</p>
                {Object.entries(usage.models).map(([modelId, data]) => (
                  <div key={modelId} className="flex items-center justify-between rounded-md bg-ink-900/40 px-2.5 py-1.5">
                    <span className="text-2xs font-medium text-ink-200">{modelId}</span>
                    <span className="text-2xs text-ink-400">{data.messages} msgs · {data.estimatedTokens.toLocaleString()} tok</span>
                  </div>
                ))}
              </div>
            )}

            {/* Export + reset */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-2xs text-ink-400">Since {new Date(usage.lastReset).toLocaleDateString()}</p>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={usage.exportCSV} className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]">
                  <Download size={11} /> CSV
                </button>
                <button type="button" onClick={usage.exportJSON} className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]">
                  <Download size={11} /> JSON
                </button>
                <button type="button" onClick={usage.reset} className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]">
                  <RotateCcw size={11} /> Reset
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Default Model */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <Zap size={13} /> Default Model
          </div>
          <select value={defaultModel} onChange={(event) => setDefaultModel(event.target.value)} className="input-field">
            {models.map((model) => (
              <option key={model.id} value={model.id}>{model.name} — {model.tagline}</option>
            ))}
          </select>
        </section>

        {/* API Key Management */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <Key size={13} /> API Keys
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-ink-850/60 p-3.5 space-y-3">
            <p className="text-sm leading-relaxed text-ink-200">
              Keys are stored securely on the Supabase server and never sent to the browser. Copy a key name, then add it in your Supabase project's Edge Function Secrets.
            </p>

            <KeyRow name="GROQ_API_KEY" label="Groq chat" badge="Free tier" badgeVariant="success" description="Powers all chat and fallback responses." copied={copiedKey === 'GROQ_API_KEY'} onCopy={() => copyKeyName('GROQ_API_KEY')} />
            <KeyRow name="OPENAI_API_KEY" label="OpenAI images" badge="Paid" badgeVariant="warning" description="Powers DALL-E 3 image generation. Optional — Nova Image (local) works without it." copied={copiedKey === 'OPENAI_API_KEY'} onCopy={() => copyKeyName('OPENAI_API_KEY')} warning="If image generation reports no credits, add billing at platform.openai.com or use Nova Image (local) instead." />
            <KeyRow name="TAVILY_API_KEY" label="Tavily web search" badge="Free tier" badgeVariant="success" description="Powers web search results." copied={copiedKey === 'TAVILY_API_KEY'} onCopy={() => copyKeyName('TAVILY_API_KEY')} />
          </div>
        </section>

        {/* Preferences */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <Keyboard size={13} /> Preferences
          </div>
          <div className="space-y-3">
            <SettingRow label="Press Enter to send" desc="When off, use Cmd/Ctrl+Enter to send.">
              <Toggle checked={sendOnEnter} onChange={setSendOnEnter} label="Send on Enter" />
            </SettingRow>
            <SettingRow label="Streaming responses" desc="Show responses as they generate.">
              <Toggle checked={streaming} onChange={setStreaming} label="Streaming" />
            </SettingRow>
            <SettingRow label="Web search by default" desc="Enable web search for new conversations.">
              <Toggle checked={webSearchDefault} onChange={setWebSearchDefault} label="Web search default" />
            </SettingRow>
          </div>
        </section>

        <div className="flex justify-end pt-2"><button className="btn-primary" onClick={onClose}>Done</button></div>
      </div>
    </Modal>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-2.5 text-center">
      <div className="mb-0.5 flex items-center justify-center gap-1 text-ink-400">
        {icon}
        <p className="text-2xs font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

interface KeyRowProps {
  name: string;
  label: string;
  badge: string;
  badgeVariant: 'success' | 'warning' | 'error' | 'default' | 'brand';
  description: string;
  copied: boolean;
  onCopy: () => void;
  warning?: string;
}

function KeyRow({ name, label, badge, badgeVariant, description, copied, onCopy, warning }: KeyRowProps) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3 space-y-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-100">{label}</span>
        <Badge variant={badgeVariant}>{badge}</Badge>
      </div>
      <p className="text-2xs text-ink-400">{description}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-ink-950/60 px-2.5 py-1.5 font-mono text-2xs text-ink-300">{name}</code>
        <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1.5 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]">
          {copied && <Check size={11} className="text-accent-400" />}
          Copy name
        </button>
      </div>
      {warning && (
        <p className="flex items-start gap-1.5 pt-1 text-2xs text-amber-300/90">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          {warning}
        </p>
      )}
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-850/40 p-3">
      <div className="min-w-0 pr-3"><p className="text-sm font-medium text-ink-100">{label}</p><p className="text-2xs text-ink-400">{desc}</p></div>
      {children}
    </div>
  );
}
