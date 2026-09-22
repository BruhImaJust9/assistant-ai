// A single message in the conversation, with role styling and actions.

import { useState } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Pencil,
  AlertTriangle,
  WifiOff,
  Gauge,
  X,
} from 'lucide-react';
import type { Message } from '@/types';
import { Markdown } from '@/components/Markdown';
import { Citations } from '@/components/Citations';
import { ImageCard } from '@/components/ImageCard';
import { FilePreview } from '@/components/FilePreview';
import { IconButton, Tooltip } from '@/components/ui';
import { cx } from '@/utils';
import { useStore } from '@/store/conversations';
import { useChat } from '@/hooks/useChat';
import { getModel } from '@/config/models';

interface MessageItemProps {
  message: Message;
  onEdit?: (id: string) => void;
  isEditing?: boolean;
}

export function MessageItem({ message, onEdit, isEditing }: MessageItemProps) {
  const { regenerate, isStreaming } = useChat();
  const { patchMessage } = useStore();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const model = message.modelId ? getModel(message.modelId) : undefined;

  const textPart = message.parts.find((p) => p.type === 'text');
  const citations = message.parts.find((p) => p.type === 'citations')?.citations ?? [];
  const images = message.parts.filter((p) => p.type === 'image');
  const files = message.parts.filter((p) => p.type === 'file');

  const handleCopy = () => {
    navigator.clipboard.writeText(textPart?.text ?? '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const handleRegenerate = () => regenerate(message.id);

  const handleRetry = async () => {
    await patchMessage(message.id, { status: 'streaming', error: undefined, parts: [] });
    regenerate(message.id);
  };

  const isError = message.status === 'error' || message.status === 'rate-limited' || message.status === 'offline';

  return (
    <div className={cx('group/msg flex gap-3 px-4 py-5 sm:px-6', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className="shrink-0">
        {isAssistant ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800 border border-white/[0.08]">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M16 6.5c1.6 3.7 3.2 5.3 6.9 6.9-3.7 1.6-5.3 3.2-6.9 6.9-1.6-3.7-3.2-5.3-6.9-6.9 3.7-1.6 5.3-3.2 6.9-6.9Z" fill="#22d3ee" />
              <circle cx="22" cy="22" r="2.2" fill="#34d399" />
            </svg>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400/80 to-brand-600/80 text-2xs font-semibold text-ink-950">
            You
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cx('min-w-0 flex-1', isUser && 'flex flex-col items-end')}>
        <div className={cx('flex items-center gap-2 mb-1', isUser && 'flex-row-reverse')}>
          <span className="text-sm font-semibold text-white">
            {isUser ? 'You' : 'Nova'}
          </span>
          {model && (
            <span className="text-2xs text-ink-400">{model.name}</span>
          )}
          {message.edited && <span className="text-2xs text-ink-400">· edited</span>}
        </div>

        {/* Error / status banner */}
        {isError && (
          <div className={cx(
            'mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
            message.status === 'rate-limited' && 'border-warning-500/30 bg-warning-500/10 text-warning-400',
            message.status === 'offline' && 'border-ink-500/30 bg-ink-800 text-ink-200',
            message.status === 'error' && 'border-error-500/30 bg-error-500/10 text-error-400',
          )}>
            {message.status === 'rate-limited' && <Gauge size={15} />}
            {message.status === 'offline' && <WifiOff size={15} />}
            {message.status === 'error' && <AlertTriangle size={15} />}
            <span className="flex-1">{message.error ?? 'Something went wrong.'}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-2xs font-medium text-white hover:bg-white/[0.1]"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Files */}
        {files.length > 0 && (
          <div className={cx('mb-2 flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
            {files.map((p) => p.type === 'file' && (
              <div key={p.file!.id} className="w-full max-w-sm">
                <FilePreview file={p.file!} />
              </div>
            ))}
          </div>
        )}

        {/* Citations (shown before text) */}
        {citations.length > 0 && <Citations citations={citations} />}

        {/* Text */}
        {textPart?.text && (
          <div className={cx(
            'rounded-2xl px-4 py-3',
            isUser
              ? 'bg-brand-500/10 border border-brand-400/15 text-ink-50'
              : 'bg-transparent',
          )}>
            {message.status === 'streaming' && !textPart.text ? (
              <ThinkingDots />
            ) : isAssistant ? (
              <Markdown content={textPart.text} />
            ) : (
              <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{textPart.text}</p>
            )}
            {message.status === 'streaming' && textPart.text && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-blink bg-brand-300 align-middle" />
            )}
          </div>
        )}

        {/* Streaming with no text yet — show thinking dots */}
        {message.status === 'streaming' && !textPart?.text && citations.length === 0 && files.length === 0 && (
          <div className="rounded-2xl bg-ink-850/40 px-4 py-3">
            <ThinkingDots />
          </div>
        )}

        {/* Images */}
        {images.length > 0 && (
          <div className="mt-2 grid w-full max-w-xl gap-3">
            {images.map((p) => p.type === 'image' && (
              <ImageCard key={p.image!.id} image={p.image!} onRegenerate={handleRegenerate} />
            ))}
          </div>
        )}

        {/* Actions */}
        {!isStreaming && message.status === 'complete' && (
          <div className={cx(
            'mt-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100',
            isUser ? 'flex-row-reverse' : '',
          )}>
            {textPart?.text && (
              <Tooltip label={copied ? 'Copied' : 'Copy'}>
                <IconButton
                  icon={copied ? <Check size={14} className="text-accent-400" /> : <Copy size={14} />}
                  label="Copy"
                  size="sm"
                  onClick={handleCopy}
                />
              </Tooltip>
            )}
            {isAssistant && (
              <Tooltip label="Regenerate">
                <IconButton
                  icon={<RefreshCw size={14} />}
                  label="Regenerate"
                  size="sm"
                  onClick={handleRegenerate}
                />
              </Tooltip>
            )}
            {isUser && onEdit && (
              <Tooltip label="Edit">
                <IconButton
                  icon={<Pencil size={14} />}
                  label="Edit"
                  size="sm"
                  onClick={() => onEdit(message.id)}
                />
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" style={{ animationDelay: '0ms' }} />
      <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" style={{ animationDelay: '200ms' }} />
      <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" style={{ animationDelay: '400ms' }} />
    </div>
  );
}

/** Editable user message inline editor. */
export function EditableUserMessage({
  message,
  onSave,
  onCancel,
}: {
  message: Message;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setMessage] = useState(message.parts.find((p) => p.type === 'text')?.text ?? '');
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-brand-500/10 border border-brand-400/20 px-4 py-3">
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="w-full resize-none bg-transparent text-[0.95rem] leading-relaxed text-ink-50 outline-none placeholder:text-ink-300"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSave(value);
          }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          <X size={14} /> Cancel
        </button>
        <button className="btn-primary" onClick={() => onSave(value)}>
          Save & Submit
        </button>
      </div>
    </div>
  );
}
