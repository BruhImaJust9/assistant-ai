// Composer — the chat input with tool toggles, file attach, model selector,
// keyboard shortcuts, and drag-and-drop.

import { useRef, useState, useCallback, useEffect, type KeyboardEvent } from 'react';
import {
  ArrowUp,
  Paperclip,
  Globe,
  Image,
  Square,
  X,
  FileText,
} from 'lucide-react';
import type { FileAttachment, ToolKind } from '@/types';
import type { ModelConfig } from '@/config/models';
import { ModelSelector } from '@/components/ModelSelector';
import { IconButton, Tooltip } from '@/components/ui';
import { cx } from '@/utils';
import { createAttachment, extractText, isAcceptedFile } from '@/lib/files';

interface ComposerProps {
  model: ModelConfig;
  onModelChange: (modelId: string) => void;
  tools: ToolKind[];
  onToolsChange: (tools: ToolKind[]) => void;
  onSend: (text: string, files: FileAttachment[], rawFiles: File[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  sendOnEnter: boolean;
  /** Prefilled prompt from suggestion clicks / edits. */
  initialText?: string;
}

export function Composer({
  model,
  onModelChange,
  tools,
  onToolsChange,
  onSend,
  onStop,
  isStreaming,
  sendOnEnter,
  initialText = '',
}: ComposerProps) {
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external initialText (suggestions / edits) via effect to avoid
  // setting state during render.
  useEffect(() => {
    if (initialText && initialText !== text) {
      setText(initialText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText]);

  const toggleTool = (tool: ToolKind) => {
    if (tools.includes(tool)) {
      onToolsChange(tools.filter((t) => t !== tool));
    } else {
      onToolsChange([...tools, tool]);
    }
  };

  const handleFiles = useCallback(async (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(isAcceptedFile);
    if (arr.length === 0) return;
    const attachments = arr.map(createAttachment);
    setFiles((prev) => [...prev, ...attachments]);
    setRawFiles((prev) => [...prev, ...arr]);
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const attachmentId = attachments[i].id;
      if (!file.type.startsWith('image/')) {
        extractText(file).then((extracted) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === attachmentId ? { ...f, extractedText: extracted, status: 'ready' } : f,
            ),
          );
        });
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === attachmentId ? { ...f, status: 'ready' } : f,
          ),
        );
      }
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setRawFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = (text.trim() || files.length > 0) && !isStreaming;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text, files, rawFiles);
    setText('');
    setFiles([]);
    setRawFiles([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (sendOnEnter && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      } else if (!sendOnEnter && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  // Auto-resize textarea.
  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const webSearchActive = tools.includes('web-search');
  const imageGenActive = tools.includes('image-generation');

  return (
    <div className="px-3 pb-3 sm:px-6 sm:pb-4">
      <div
        className={cx(
          'mx-auto max-w-3xl rounded-2xl border bg-ink-850/80 backdrop-blur-xl transition-all',
          dragging ? 'border-brand-400/50 bg-brand-500/5' : 'border-white/[0.08]',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
      >
        {/* Active tool chips */}
        {(webSearchActive || imageGenActive || files.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5">
            {webSearchActive && (
              <ToolChip icon={<Globe size={12} />} label="Web search" onRemove={() => toggleTool('web-search')} />
            )}
            {imageGenActive && (
              <ToolChip icon={<Image size={12} />} label="Image generation" onRemove={() => toggleTool('image-generation')} />
            )}
            {files.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => removeFile(i)}
                className="group flex items-center gap-1.5 rounded-full bg-white/[0.06] py-1 pl-2.5 pr-1.5 text-2xs font-medium text-ink-100 hover:bg-white/[0.1]"
              >
                <FileText size={11} className="text-brand-300" />
                <span className="max-w-32 truncate">{f.name}</span>
                <X size={11} className="text-ink-400 group-hover:text-white" />
              </button>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="flex items-end gap-2 px-2 py-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={imageGenActive ? 'Describe the image to generate…' : webSearchActive ? 'Ask something to search the web for…' : 'Message Nova…'}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[0.95rem] leading-relaxed text-ink-50 outline-none placeholder:text-ink-300/60"
            style={{ maxHeight: '200px' }}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 pb-2">
          {/* Attach */}
          <Tooltip label="Attach file">
            <IconButton
              icon={<Paperclip size={17} />}
              label="Attach file"
              onClick={() => fileInputRef.current?.click()}
            />
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
            accept=".txt,.csv,.md,.json,.xml,.html,.js,.ts,.jsx,.tsx,.css,.pdf,image/*,text/*"
          />

          {/* Web search toggle */}
          <Tooltip label="Web search">
            <IconButton
              icon={<Globe size={17} />}
              label="Web search"
              active={webSearchActive}
              onClick={() => toggleTool('web-search')}
            />
          </Tooltip>

          {/* Image gen toggle */}
          <Tooltip label="Image generation">
            <IconButton
              icon={<Image size={17} />}
              label="Image generation"
              active={imageGenActive}
              onClick={() => toggleTool('image-generation')}
            />
          </Tooltip>

          <div className="flex-1" />

          {/* Model selector */}
          <ModelSelector value={model.id} onChange={onModelChange} compact />

          {/* Send / Stop */}
          {isStreaming ? (
            <Tooltip label="Stop generating">
              <button
                type="button"
                onClick={onStop}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.1] text-white transition-colors hover:bg-white/[0.15]"
              >
                <Square size={15} fill="currentColor" />
              </button>
            </Tooltip>
          ) : (
            <Tooltip label={sendOnEnter ? 'Send (Enter)' : 'Send (Cmd+Enter)'}>
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={cx(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                  canSend
                    ? 'bg-brand-500 text-ink-950 hover:bg-brand-400 active:scale-95'
                    : 'bg-white/[0.06] text-ink-400',
                )}
              >
                <ArrowUp size={16} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl px-2 text-center text-2xs text-ink-400">
        Nova can make mistakes. Verify important information.
      </p>
    </div>
  );
}

function ToolChip({ icon, label, onRemove }: { icon: React.ReactNode; label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-brand-500/15 py-1 pl-2.5 pr-1.5 text-2xs font-medium text-brand-300">
      {icon}
      {label}
      <button type="button" onClick={onRemove} className="text-brand-400 hover:text-white">
        <X size={11} />
      </button>
    </span>
  );
}
