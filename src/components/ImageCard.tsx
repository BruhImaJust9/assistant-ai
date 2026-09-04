// Generated image card with download + regenerate actions.

import { useState } from 'react';
import { Download, RefreshCw, Maximize2, X } from 'lucide-react';
import type { GeneratedImage } from '@/types';
import { IconButton, Tooltip } from '@/components/ui';

interface ImageCardProps {
  image: GeneratedImage;
  onRegenerate?: () => void;
}

export function ImageCard({ image, onRegenerate }: ImageCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = image.url;
    a.download = `nova-${image.id}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/[0.08] bg-ink-850/60">
      <div className="relative group">
        <img
          src={image.url}
          alt={image.prompt}
          className="w-full cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.01]"
          onClick={() => setExpanded(true)}
          loading="lazy"
        />
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Tooltip label="Expand">
            <IconButton
              icon={<Maximize2 size={14} />}
              label="Expand"
              size="sm"
              variant="solid"
              onClick={() => setExpanded(true)}
            />
          </Tooltip>
          <Tooltip label="Download">
            <IconButton
              icon={<Download size={14} />}
              label="Download"
              size="sm"
              variant="solid"
              onClick={handleDownload}
            />
          </Tooltip>
          {onRegenerate && (
            <Tooltip label="Regenerate">
              <IconButton
                icon={<RefreshCw size={14} />}
                label="Regenerate"
                size="sm"
                variant="solid"
                onClick={onRegenerate}
              />
            </Tooltip>
          )}
        </div>
      </div>
      <div className="border-t border-white/[0.06] px-3 py-2">
        <p className="truncate text-2xs text-ink-300">{image.prompt}</p>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 animate-fade-in"
          onClick={() => setExpanded(false)}
        >
          <button className="absolute right-4 top-4 text-ink-200 hover:text-white">
            <X size={24} />
          </button>
          <img
            src={image.url}
            alt={image.prompt}
            className="max-h-full max-w-full rounded-lg shadow-panel"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
