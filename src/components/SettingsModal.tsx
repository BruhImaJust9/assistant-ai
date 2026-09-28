// Settings modal — user preferences and account management.

import { useState } from 'react';
import { Zap, Keyboard, User, LogOut } from 'lucide-react';
import { Modal, Toggle } from '@/components/ui';
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

  const models = getAvailableModels();

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
