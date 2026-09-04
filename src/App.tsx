// Nova — application root. Wires providers, responsive 3-column layout,
// settings modal, and auth gate.

import { useEffect, useState, useCallback } from 'react';
import { Menu, PanelRightOpen } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/store/conversations';
import { ChatProvider, useChat } from '@/hooks/useChat';
import { Sidebar } from '@/components/Sidebar';
import { ChatView } from '@/components/ChatView';
import { Composer } from '@/components/Composer';
import { ToolsPanel } from '@/components/ToolsPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { AuthScreen } from '@/components/AuthScreen';
import { IconButton, Tooltip, Spinner } from '@/components/ui';
import { getModel, getDefaultModelId } from '@/config/models';
import type { FileAttachment, ToolKind } from '@/types';

function NovaShell() {
  const { user, loading, localMode } = useAuth();
  const store = useStore();
  const chat = useChat();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editState, setEditState] = useState<{ id: string } | null>(null);
  const [composerText, setComposerText] = useState('');

  // Auto-create a conversation on first load.
  useEffect(() => {
    if ((user || localMode) && store.conversations.length === 0 && !store.activeId) {
      store.newConversation();
    }
  }, [user, localMode, store]);

  // Load messages when active conversation changes.
  useEffect(() => {
    if (store.activeId) store.loadMessages(store.activeId);
  }, [store.activeId, store.loadMessages]);

  const activeModel = store.activeConversation
    ? getModel(store.activeConversation.modelId) ?? getModel(getDefaultModelId())!
    : getModel(getDefaultModelId())!;

  const activeTools: ToolKind[] = store.activeConversation?.tools ?? [];

  const handleModelChange = useCallback(
    (modelId: string) => {
      if (store.activeConversation) {
        store.setConversationModel(store.activeConversation.id, modelId);
      }
    },
    [store],
  );

  const handleToolsChange = useCallback(
    (tools: ToolKind[]) => {
      if (store.activeConversation) {
        store.setConversationTools(store.activeConversation.id, tools);
      }
    },
    [store],
  );

  const handleSend = useCallback(
    (text: string, files: FileAttachment[], rawFiles: File[]) => {
      if (!store.activeConversation) return;
      setEditState(null);
      setComposerText('');
      chat.send({
        conversationId: store.activeConversation.id,
        model: activeModel,
        tools: activeTools,
        text,
        files: files.length > 0 ? files : undefined,
        rawFiles: rawFiles.length > 0 ? rawFiles : undefined,
      });
    },
    [chat, store, activeModel, activeTools],
  );

  const handleSuggestion = useCallback(
    (prompt: string, tool?: 'web-search' | 'image-generation') => {
      const tools: ToolKind[] = tool ? [tool] : [];
      if (store.activeConversation) {
        store.setConversationTools(store.activeConversation.id, tools);
      }
      setComposerText(prompt);
    },
    [store],
  );

  const handleStartEdit = useCallback((id: string) => {
    setEditState({ id });
  }, []);

  const handleSaveEdit = useCallback(
    (id: string, text: string) => {
      setEditState(null);
      setComposerText('');
      const conv = store.activeConversation;
      if (!conv) return;
      const messages = store.activeMessages;
      const idx = messages.findIndex((m) => m.id === id);
      if (idx === -1) return;
      const msg = messages[idx];
      const updatedParts = msg.parts.map((p) =>
        p.type === 'text' ? { ...p, text } : p,
      );
      store.patchMessage(id, { parts: updatedParts, edited: true });
      // Remove all messages after the edited user message.
      for (let i = messages.length - 1; i > idx; i--) {
        store.removeMessage(messages[i].id, conv.id);
      }
      // Trigger a new assistant response.
      chat.send({
        conversationId: conv.id,
        model: activeModel,
        tools: msg.tools ?? [],
        text,
      });
    },
    [chat, store, activeModel],
  );

  const handleCancelEdit = useCallback(() => {
    setEditState(null);
  }, []);

  // Auth gate: show sign-in screen if Supabase is configured but no session.
  if (!localMode && loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950">
        <Spinner size={28} className="text-brand-400" />
      </div>
    );
  }

  if (!localMode && !user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full animate-slide-in-left">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
              onOpenSettings={() => {
                setMobileSidebarOpen(false);
                setSettingsOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Center column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <IconButton
              icon={<Menu size={18} />}
              label="Open menu"
              className="md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            />
            <h1 className="truncate text-sm font-semibold text-white">
              {store.activeConversation?.title ?? 'Nova'}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {!panelOpen && (
              <Tooltip label="Open tools panel">
                <IconButton
                  icon={<PanelRightOpen size={18} />}
                  label="Open panel"
                  onClick={() => setPanelOpen(true)}
                />
              </Tooltip>
            )}
          </div>
        </header>

        {/* Chat area */}
        <div className="min-h-0 flex-1">
          <ChatView
            onSuggestion={handleSuggestion}
            onEditMessage={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            editingId={editState?.id}
          />
        </div>

        {/* Composer */}
        <Composer
          model={activeModel}
          onModelChange={handleModelChange}
          tools={activeTools}
          onToolsChange={handleToolsChange}
          onSend={handleSend}
          onStop={chat.stop}
          isStreaming={chat.isStreaming}
          sendOnEnter={true}
          initialText={composerText}
        />
      </div>

      {/* Desktop tools panel */}
      <div className="hidden md:flex">
        <ToolsPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          model={activeModel}
          tools={activeTools}
          onToolsChange={handleToolsChange}
        />
      </div>

      {/* Settings modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ChatProvider>
          <NovaShell />
        </ChatProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
