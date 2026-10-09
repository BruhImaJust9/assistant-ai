// Settings modal — user preferences and API key status.

import { useState } from 'react';
import { Zap, Keyboard, Key, ExternalLink, Check } from 'lucide-react';
import { Modal, Toggle, Badge } from '@/components/ui';
import { getAvailableModels, getDefaultModelId } from '@/config/models';

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

  const models = getAvailableModels();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" width="md">
      <div className="space-y-5">
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
              Nova uses OpenAI for chat responses and image generation, and Tavily for web search. Keys are stored
              as server secrets and never appear in the browser.
            </p>

            <div className="space-y-2.5">
              {/* OpenAI */}
              <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-ink-100">OpenAI (Chat + Images)</span>
                  <Badge variant="success">Connected</Badge>
                </div>
                <p className="text-2xs text-ink-400 mb-2">
                  Powers GPT-4o chat responses and DALL-E 3 image generation.
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
                    Manage <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Tavily */}
              <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-ink-100">Tavily (Web Search)</span>
                  <Badge variant="success">Connected</Badge>
                </div>
                <p className="text-2xs text-ink-400 mb-2">
                  Powers real-time web search results with source citations.
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
                    Manage <ExternalLink size={11} />
                  </a>
                </div>
              </div>
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
