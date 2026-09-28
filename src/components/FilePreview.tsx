// File attachment preview chip shown inline in messages.

import { FileText, ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import type { FileAttachment } from '@/types';
import { formatBytes, cx } from '@/utils';

interface FilePreviewProps {
  file: FileAttachment;
}

export function FilePreview({ file }: FilePreviewProps) {
  const isImage = file.mimeType.startsWith('image/');
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-lg border border-white/[0.07] bg-ink-850/60 p-2.5',
        file.status === 'error' && 'border-error-500/30',
      )}
    >
      {file.status === 'uploading' ? (
        <Loader2 size={20} className="shrink-0 animate-spin text-brand-300" />
      ) : isImage && file.previewUrl ? (
        <img src={file.previewUrl} alt={file.name} className="h-10 w-10 shrink-0 rounded-md object-cover" />
      ) : file.status === 'error' ? (
        <AlertCircle size={20} className="shrink-0 text-error-400" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink-800">
          {isImage ? <ImageIcon size={18} className="text-ink-300" /> : <FileText size={18} className="text-ink-300" />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-100">{file.name}</p>
        <p className="text-2xs text-ink-400">
          {formatBytes(file.size)} · {file.mimeType || 'file'}
          {file.status === 'error' && ` · ${file.error ?? 'failed'}`}
        </p>
      </div>
    </div>
  );
}
