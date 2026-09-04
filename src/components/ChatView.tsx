// Center conversation view — renders messages, empty state, and streaming.

import { useEffect, useRef, useState } from 'react';
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

  // Auto-scroll on new content if the user is near the bottom.
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
    </div>
  );
}
