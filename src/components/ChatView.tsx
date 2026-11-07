// Center conversation view — renders messages, empty state, and streaming.

import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useStore } from '@/store/conversations';
import { MessageItem, EditableUserMessage } from '@/components/MessageItem';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/ui';
import type { Message } from '@/types';

interface ChatViewProps {
  onSuggestion: (prompt: string, tool?: 'web-search' | 'image-generation') => void;
  onEditMessage: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, text: string) => void;
  editingId?: string | null;
}

export function ChatView({ onSuggestion, onEditMessage, onCancelEdit, onSaveEdit, editingId }: ChatViewProps) {
  const { activeConversation, activeMessages, loadingMessages } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeMessages, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(nearBottom);
    setShowScrollBtn(!nearBottom && activeMessages.length > 4);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setAutoScroll(true);
    setShowScrollBtn(false);
  };

  if (!activeConversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Spinner size={24} className="mx-auto text-brand-400" />
          <p className="mt-3 text-sm text-ink-300">Loading your conversations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {activeMessages.length === 0 && !loadingMessages ? (
          <EmptyState onSuggestion={onSuggestion} />
        ) : loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={24} className="text-brand-400" />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl py-4">
            {activeMessages.map((msg: Message) =>
              editingId === msg.id && msg.role === 'user' ? (
                <div key={msg.id} className="px-4 py-5 sm:px-6">
                  <div className="flex justify-end">
                    <div className="w-full max-w-2xl">
                      <EditableUserMessage
                        message={msg}
                        onSave={(text) => onSaveEdit(msg.id, text)}
                        onCancel={onCancelEdit}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onEdit={(id) => onEditMessage(id)}
                  isEditing={editingId === msg.id}
                />
              ),
            )}
            <div className="h-4" />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <div className="absolute bottom-32 left-1/2 z-10 -translate-x-1/2">
          <button
            type="button"
            onClick={scrollToBottom}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 border border-white/[0.1] text-ink-200 shadow-panel transition-all hover:bg-ink-700 hover:text-white animate-fade-in"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
