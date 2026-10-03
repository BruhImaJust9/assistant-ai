// Settings modal — user preferences, API key setup, and account management.

import { useState } from 'react';
import { Zap, Keyboard, User, LogOut, Key, ExternalLink, Check } from 'lucide-react';
import { Modal, Toggle, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getAvailableModels, getDefaultModelId } from '@/config/models';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, localMode, signOut } = useAuth();
  const [sendOnEnter, setSendOnEnter] = useState(true);
  const [streaming, setStreaming] = useState(true);
  const [webSearchDefault, setWebSearchDefault] = useState(false);
  const [defaultModel, setDefaultModel] = useState(getDefaultModelId());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const models = getAvailableModels();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" width="md">
      <div className="space-y-5">
        {/* Account */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <User size={13} /> Account
          </div>
          {localMode ? (
            <p className="text-sm text-ink-300">
              Running in local mode. Conversations are stored in your browser only. Sign in to persist them.
            </p>
          ) : (
            <div className="rounded-lg border border-white/[0.07] bg-ink-850/60 p-3">
              <p className="text-sm font-medium text-ink-100">{user?.email}</p>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  onClose();
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-sm text-ink-200 hover:bg-white/[0.1] hover:text-white"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </section>

        {/* Default model */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <Zap size={13} /> Default Model
          </div>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="input-field"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.tagline}
              </option>
            ))}
          </select>
        </section>

        {/* API Keys */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <Key size={13} /> API Keys
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-ink-850/60 p-3.5 space-y-3">
            <p className="text-sm text-ink-200 leading-relaxed">
              Nova uses OpenAI for chat responses and Tavily for web search. If the built-in keys run out of quota,
              you can add your own to get real AI responses. Keys are stored as server secrets and never appear in the browser.
            </p>

            <div className="space-y-2.5">
              {/* OpenAI */}
              <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-ink-100">OpenAI (Chat)</span>
                  <Badge variant="error">No quota</Badge>
                </div>
                <p className="text-2xs text-ink-400 mb-2">
                  Used for all chat responses. Get a key from the OpenAI dashboard.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-ink-950/60 px-2.5 py-1.5 text-2xs text-ink-300 font-mono">
                    OPENAI_API_KEY
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('OPENAI_API_KEY', 'openai')}
                    className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1.5 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]"
                  >
                    {copiedKey === 'openai' ? <Check size={11} className="text-accent-400" /> : null}
                    Copy name
                  </button>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-2 py-1.5 text-2xs font-medium text-brand-300 hover:bg-brand-500/20"
                  >
                    Get key <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Tavily */}
              <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-ink-100">Tavily (Web Search)</span>
                  <Badge variant="error">Invalid</Badge>
                </div>
                <p className="text-2xs text-ink-400 mb-2">
                  Used for real-time web search results. Get a key from the Tavily dashboard.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-ink-950/60 px-2.5 py-1.5 text-2xs text-ink-300 font-mono">
                    TAVILY_API_KEY
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('TAVILY_API_KEY', 'tavily')}
                    className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1.5 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]"
                  >
                    {copiedKey === 'tavily' ? <Check size={11} className="text-accent-400" /> : null}
                    Copy name
                  </button>
                  <a
                    href="https://tavily.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-2 py-1.5 text-2xs font-medium text-brand-300 hover:bg-brand-500/20"
                  >
                    Get key <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-brand-500/5 border border-brand-400/10 p-3">
              <p className="text-2xs text-ink-300 leading-relaxed">
                <span className="font-semibold text-brand-300">How to add your keys:</span> In your Supabase project
                dashboard, go to <span className="text-ink-100">Project Settings → Edge Functions → Secrets</span>,
                then add each secret with the name shown above and your API key as the value. After adding keys,
                redeploy the edge functions for them to take effect.
              </p>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <Keyboard size={13} /> Preferences
          </div>
          <div className="space-y-3">
            <SettingRow
              label="Press Enter to send"
              desc="When off, use Cmd/Ctrl+Enter to send."
            >
              <Toggle checked={sendOnEnter} onChange={setSendOnEnter} label="Send on Enter" />
            </SettingRow>
            <SettingRow label="Streaming responses" desc="Show responses as they generate.">
              <Toggle checked={streaming} onChange={setStreaming} label="Streaming" />
            </SettingRow>
            <SettingRow
              label="Web search by default"
              desc="Enable web search for new conversations."
            >
              <Toggle
                checked={webSearchDefault}
                onChange={setWebSearchDefault}
                label="Web search default"
              />
            </SettingRow>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-850/40 p-3">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium text-ink-100">{label}</p>
        <p className="text-2xs text-ink-400">{desc}</p>
      </div>
      {children}
    </div>
  );
}
