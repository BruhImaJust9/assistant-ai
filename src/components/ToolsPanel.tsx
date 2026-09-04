// Right tools panel — context, tools, model info, and conversation details.

import { Globe, Image, FileText, X, ChevronRight } from 'lucide-react';
import type { ToolKind } from '@/types';
import type { ModelConfig } from '@/config/models';
import { useStore } from '@/store/conversations';
import { cx } from '@/utils';
import { IconButton, Tooltip } from '@/components/ui';

interface ToolsPanelProps {
  open: boolean;
  onClose: () => void;
  model: ModelConfig;
  tools: ToolKind[];
  onToolsChange: (tools: ToolKind[]) => void;
}

export function ToolsPanel({ open, onClose, model, tools, onToolsChange }: ToolsPanelProps) {
  const { activeConversation, activeMessages } = useStore();

  const toggle = (tool: ToolKind) => {
    if (tools.includes(tool)) onToolsChange(tools.filter((t) => t !== tool));
    else onToolsChange([...tools, tool]);
  };

  if (!open) return null;

  const userCount = activeMessages.filter((m) => m.role === 'user').length;
  const assistantCount = activeMessages.filter((m) => m.role === 'assistant').length;

  return (
    <aside className="flex w-80 flex-col border-l border-white/[0.06] bg-ink-900/60 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Tools & Context</h2>
        <Tooltip label="Close panel">
          <IconButton icon={<X size={16} />} label="Close" size="sm" onClick={onClose} />
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Active model */}
        <Section title="Active Model">
          <div className="rounded-lg border border-white/[0.07] bg-ink-850/60 p-3">
            <p className="text-sm font-semibold text-white">{model.name}</p>
            <p className="mt-0.5 text-2xs text-ink-400">{model.tagline}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <CapBadge label="Chat" active={model.capabilities.chat} />
              <CapBadge label="Web" active={model.capabilities.webSearch} />
              <CapBadge label="Vision" active={model.capabilities.fileAnalysis} />
              <CapBadge label="Image" active={model.capabilities.imageGeneration} />
            </div>
          </div>
        </Section>

        {/* Tools */}
        <Section title="Tools">
          <div className="space-y-1.5">
            <ToolRow
              icon={<Globe size={16} />}
              title="Web Search"
              desc="Search the live web with citations"
              active={tools.includes('web-search')}
              onClick={() => toggle('web-search')}
            />
            <ToolRow
              icon={<Image size={16} />}
              title="Image Generation"
              desc="Create images from a text prompt"
              active={tools.includes('image-generation')}
              onClick={() => toggle('image-generation')}
            />
            <ToolRow
              icon={<FileText size={16} />}
              title="File Analysis"
              desc="Attach and analyze documents"
              active={tools.includes('file-analysis')}
              onClick={() => toggle('file-analysis')}
            />
          </div>
        </Section>

        {/* Conversation info */}
        <Section title="Conversation">
          <div className="rounded-lg border border-white/[0.07] bg-ink-850/60 p-3 text-sm">
            <InfoRow label="Title" value={activeConversation?.title ?? '—'} />
            <InfoRow label="Messages" value={String(activeMessages.length)} />
            <InfoRow label="Your messages" value={String(userCount)} />
            <InfoRow label="Nova replies" value={String(assistantCount)} />
            <InfoRow label="Model" value={model.name} />
          </div>
        </Section>

        {/* Tips */}
        <Section title="Shortcuts">
          <div className="space-y-1.5 text-2xs text-ink-300">
            <Shortcut keys="Enter" desc="Send message" />
            <Shortcut keys="Shift+Enter" desc="New line" />
            <Shortcut keys="Esc" desc="Stop / cancel" />
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">{title}</p>
      {children}
    </div>
  );
}

function CapBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cx(
        'rounded-full px-2 py-0.5 text-2xs font-medium',
        active ? 'bg-brand-500/15 text-brand-300' : 'bg-white/[0.04] text-ink-400',
      )}
    >
      {label}
    </span>
  );
}

function ToolRow({
  icon,
  title,
  desc,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-all',
        active
          ? 'border-brand-400/30 bg-brand-500/10'
          : 'border-white/[0.06] bg-ink-850/40 hover:bg-ink-800',
      )}
    >
      <div className={cx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        active ? 'bg-brand-500/20 text-brand-300' : 'bg-white/[0.05] text-ink-300',
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx('text-sm font-medium', active ? 'text-white' : 'text-ink-100')}>{title}</p>
        <p className="text-2xs text-ink-400">{desc}</p>
      </div>
      <ChevronRight size={14} className={cx('shrink-0 transition-transform', active && 'rotate-90 text-brand-300')} />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-2xs text-ink-400">{label}</span>
      <span className="text-2xs font-medium text-ink-100 truncate max-w-40">{value}</span>
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-ink-300">{desc}</span>
      <kbd className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-2xs text-ink-200">{keys}</kbd>
    </div>
  );
}
