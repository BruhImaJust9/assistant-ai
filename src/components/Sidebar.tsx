// Left sidebar — conversation history, search, favorites, profile, settings.

import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Settings,
  PanelLeftClose,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { useStore } from '@/store/conversations';
import { useAuth } from '@/lib/auth';
import { cx, dateBucket, timeAgo, truncate } from '@/utils';
import { IconButton, Tooltip } from '@/components/ui';
import type { Conversation } from '@/types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ collapsed, onToggle, onOpenSettings }: SidebarProps) {
  const {
    conversations,
    activeId,
    selectConversation,
    newConversation,
    renameConversation,
    togglePin,
    removeConversation,
  } = useStore();
  const { user, localMode, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const pinned = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);

  const grouped = useMemo(() => {
    const buckets: Record<string, Conversation[]> = {};
    for (const c of unpinned) {
      const b = dateBucket(c.updatedAt);
      (buckets[b] ??= []).push(c);
    }
    return buckets;
  }, [unpinned]);

  const handleNewChat = () => newConversation();

  const startEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditValue(conv.title);
  };

  const commitEdit = async () => {
    if (editingId && editValue.trim()) {
      await renameConversation(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  if (collapsed) {
    return (
      <aside className="flex w-14 flex-col items-center gap-2 border-r border-white/[0.06] bg-ink-900/60 py-3">
        <Tooltip label="Expand sidebar" side="right">
          <IconButton icon={<PanelLeftClose className="rotate-180" size={18} />} label="Expand" onClick={onToggle} />
        </Tooltip>
        <Tooltip label="New chat" side="right">
          <IconButton icon={<Plus size={18} />} label="New chat" onClick={handleNewChat} />
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 flex-col border-r border-white/[0.06] bg-ink-900/60 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 pl-1">
          <NovaMark />
          <span className="text-sm font-semibold tracking-tight text-white">Nova</span>
        </div>
        <Tooltip label="Collapse sidebar">
          <IconButton icon={<PanelLeftClose size={18} />} label="Collapse" onClick={onToggle} />
        </Tooltip>
      </div>

      {/* New chat */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex w-full items-center gap-2.5 rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.1] active:scale-[0.99]"
        >
          <Plus size={16} className="text-brand-300" />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-lg bg-ink-850 border border-white/[0.06] py-1.5 pl-8 pr-3 text-sm text-ink-100 placeholder:text-ink-300/60 focus:border-brand-400/40 focus:bg-ink-800"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {pinned.length > 0 && (
          <SectionLabel>Pinned</SectionLabel>
        )}
        {pinned.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            active={conv.id === activeId}
            editing={editingId === conv.id}
            editValue={editValue}
            onEditValue={setEditValue}
            onCommitEdit={commitEdit}
            onStartEdit={() => startEdit(conv)}
            onCancelEdit={() => setEditingId(null)}
            onSelect={() => selectConversation(conv.id)}
            onTogglePin={() => togglePin(conv.id)}
            onDelete={() => setConfirmDeleteId(conv.id)}
          />
        ))}

        {Object.entries(grouped).map(([bucket, items]) => (
          <div key={bucket}>
            <SectionLabel>{bucket}</SectionLabel>
            {items.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeId}
                editing={editingId === conv.id}
                editValue={editValue}
                onEditValue={setEditValue}
                onCommitEdit={commitEdit}
                onStartEdit={() => startEdit(conv)}
                onCancelEdit={() => setEditingId(null)}
                onSelect={() => selectConversation(conv.id)}
                onTogglePin={() => togglePin(conv.id)}
                onDelete={() => setConfirmDeleteId(conv.id)}
              />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <MessageSquare size={22} className="mb-2 text-ink-400" />
            <p className="text-sm text-ink-300">
              {query ? 'No conversations match your search.' : 'No conversations yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer: profile + settings */}
      <div className="border-t border-white/[0.06] p-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="sidebar-item w-full"
        >
          <Settings size={16} className="text-ink-300" />
          <span>Settings</span>
        </button>
        <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
          <Avatar name={user?.email ?? 'Guest'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-100">
              {localMode ? 'Guest' : user?.email?.split('@')[0] ?? 'User'}
            </p>
            <p className="truncate text-2xs text-ink-300">
              {localMode ? 'Local mode' : truncate(user?.email ?? '', 28)}
            </p>
          </div>
          {!localMode && (
            <Tooltip label="Sign out">
              <IconButton
                icon={<SignOutIcon />}
                label="Sign out"
                size="sm"
                onClick={() => signOut()}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <DeleteConfirm
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={async () => {
            await removeConversation(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
        />
      )}
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wider text-ink-400">
      {children}
    </p>
  );
}

interface ItemProps {
  conv: Conversation;
  active: boolean;
  editing: boolean;
  editValue: string;
  onEditValue: (v: string) => void;
  onCommitEdit: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function ConversationItem({
  conv,
  active,
  editing,
  editValue,
  onEditValue,
  onCommitEdit,
  onStartEdit,
  onCancelEdit,
  onSelect,
  onTogglePin,
  onDelete,
}: ItemProps) {
  return (
    <div
      className={cx(
        'group relative flex items-center rounded-lg transition-colors',
        active && 'bg-white/[0.07]',
      )}
    >
      {editing ? (
        <div className="flex w-full items-center gap-1 px-2 py-1.5">
          <input
            autoFocus
            value={editValue}
            onChange={(e) => onEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="w-full rounded-md bg-ink-800 border border-brand-400/40 px-2 py-1 text-sm text-white"
          />
          <IconButton icon={<Check size={14} />} label="Save" size="sm" onClick={onCommitEdit} />
          <IconButton icon={<X size={14} />} label="Cancel" size="sm" onClick={onCancelEdit} />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onSelect}
            className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left"
          >
            {conv.pinned ? (
              <Pin size={13} className="shrink-0 text-brand-300" fill="currentColor" />
            ) : (
              <MessageSquare size={13} className="shrink-0 text-ink-400" />
            )}
            <span className="min-w-0 flex-1">
              <span className={cx('block truncate text-sm', active ? 'text-white' : 'text-ink-200')}>
                {conv.title}
              </span>
              <span className="block truncate text-2xs text-ink-400">
                {conv.preview ?? timeAgo(conv.updatedAt)}
              </span>
            </span>
          </button>
          <div className="flex shrink-0 items-center pr-1 opacity-0 transition-opacity group-hover:opacity-100">
            <IconButton icon={<Pencil size={13} />} label="Rename" size="sm" onClick={onStartEdit} />
            <IconButton icon={conv.pinned ? <PinOff size={13} /> : <Pin size={13} />} label={conv.pinned ? 'Unpin' : 'Pin'} size="sm" onClick={onTogglePin} />
            <IconButton icon={<Trash2 size={13} />} label="Delete" size="sm" onClick={onDelete} />
          </div>
        </>
      )}
    </div>
  );
}

function DeleteConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm surface-raised rounded-2xl p-5 shadow-panel animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white">Delete conversation?</h3>
        <p className="mt-1.5 text-sm text-ink-300">This will permanently remove the conversation and all its messages.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="rounded-lg bg-error-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-error-400" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xs font-semibold text-ink-950">
      {initials}
    </div>
  );
}

function NovaMark() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-800 border border-white/[0.08]">
      <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <path d="M16 6.5c1.6 3.7 3.2 5.3 6.9 6.9-3.7 1.6-5.3 3.2-6.9 6.9-1.6-3.7-3.2-5.3-6.9-6.9 3.7-1.6 5.3-3.2 6.9-6.9Z" fill="#22d3ee" />
        <circle cx="22" cy="22" r="2.2" fill="#34d399" />
      </svg>
    </div>
  );
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
