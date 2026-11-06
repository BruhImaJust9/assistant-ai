// Settings modal — lightweight preferences and service status.

import { useState } from 'react';
import { Zap, Keyboard, Key, Check } from 'lucide-react';
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
  const [copiedKey, setCopiedKey] = useState(false);
  const models = getAvailableModels();

  const copyKeyName = () => {
    navigator.clipboard.writeText('GROQ_API_KEY');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1600);
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" width="md">
      <div className="space-y-5">
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

        <section>
          <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
            <Key size={13} /> AI Service
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-ink-850/60 p-3.5 space-y-3">
            <p className="text-sm leading-relaxed text-ink-200">
              Nova uses Groq's fast free-tier model for chat. Replies are capped and recent history is trimmed to keep usage low. Images use a local preview and do not call a paid image service.
            </p>
            <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-100">Groq chat</span>
                <Badge variant="success">Free tier</Badge>
              </div>
              <p className="mb-2 text-2xs text-ink-400">The key is kept on the server and never sent to the browser.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-ink-950/60 px-2.5 py-1.5 font-mono text-2xs text-ink-300">GROQ_API_KEY</code>
                <button type="button" onClick={copyKeyName} className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1.5 text-2xs font-medium text-ink-200 hover:bg-white/[0.1]">
                  {copiedKey && <Check size={11} className="text-accent-400" />}
                  Copy name
                </button>
              </div>
              <p className="mt-2 text-2xs text-amber-300/90">If chat reports that the key is missing, add this secret in Supabase before using live answers.</p>
            </div>
          </div>
        </section>

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

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-850/40 p-3">
      <div className="min-w-0 pr-3"><p className="text-sm font-medium text-ink-100">{label}</p><p className="text-2xs text-ink-400">{desc}</p></div>
      {children}
    </div>
  );
}
