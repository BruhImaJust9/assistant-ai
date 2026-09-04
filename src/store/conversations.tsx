// Conversations store — central state for conversations, messages, and the
// active selection. Uses a reducer + context so logic stays out of the UI.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type { Conversation, Message, ToolKind } from '@/types';
import { uid, truncate } from '@/utils';
import { getDefaultModelId } from '@/config/models';
import {
  fetchConversations,
  createConversation as dbCreateConversation,
  updateConversation as dbUpdateConversation,
  deleteConversation as dbDeleteConversation,
  fetchMessages,
  insertMessage,
  updateMessage as dbUpdateMessage,
  deleteMessage as dbDeleteMessage,
} from '@/lib/data';
import { useAuth } from '@/lib/auth';

interface State {
  conversations: Conversation[];
  activeId: string | null;
  messages: Record<string, Message[]>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_CONVERSATIONS'; conversations: Conversation[] }
  | { type: 'SET_LOADING_CONVERSATIONS'; loading: boolean }
  | { type: 'SET_MESSAGES'; conversationId: string; messages: Message[] }
  | { type: 'SET_LOADING_MESSAGES'; loading: boolean }
  | { type: 'UPSERT_CONVERSATION'; conversation: Conversation }
  | { type: 'DELETE_CONVERSATION'; id: string }
  | { type: 'SET_ACTIVE'; id: string | null }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'UPDATE_MESSAGE'; id: string; patch: Partial<Message> }
  | { type: 'DELETE_MESSAGE'; id: string; conversationId: string }
  | { type: 'SET_ERROR'; error: string | null };

const initialState: State = {
  conversations: [],
  activeId: null,
  messages: {},
  loadingConversations: false,
  loadingMessages: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.conversations };
    case 'SET_LOADING_CONVERSATIONS':
      return { ...state, loadingConversations: action.loading };
    case 'SET_MESSAGES':
      return { ...state, messages: { ...state.messages, [action.conversationId]: action.messages } };
    case 'SET_LOADING_MESSAGES':
      return { ...state, loadingMessages: action.loading };
    case 'UPSERT_CONVERSATION': {
      const exists = state.conversations.some((c) => c.id === action.conversation.id);
      const conversations = exists
        ? state.conversations.map((c) => (c.id === action.conversation.id ? action.conversation : c))
        : [action.conversation, ...state.conversations];
      return { ...state, conversations };
    }
    case 'DELETE_CONVERSATION': {
      const conversations = state.conversations.filter((c) => c.id !== action.id);
      const messages = { ...state.messages };
      delete messages[action.id];
      const activeId = state.activeId === action.id ? null : state.activeId;
      return { ...state, conversations, messages, activeId };
    }
    case 'SET_ACTIVE':
      return { ...state, activeId: action.id };
    case 'ADD_MESSAGE': {
      const list = state.messages[action.message.conversationId] ?? [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.message.conversationId]: [...list, action.message],
        },
      };
    }
    case 'UPDATE_MESSAGE': {
      const convId = Object.keys(state.messages).find((k) =>
        state.messages[k].some((m) => m.id === action.id),
      );
      if (!convId) return state;
      const list = state.messages[convId];
      return {
        ...state,
        messages: {
          ...state.messages,
          [convId]: list.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
        },
      };
    }
    case 'DELETE_MESSAGE': {
      const list = state.messages[action.conversationId] ?? [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.conversationId]: list.filter((m) => m.id !== action.id),
        },
      };
    }
    case 'SET_ERROR':
      return { ...state, error: action.error };
    default:
      return state;
  }
}

interface StoreContextValue extends State {
  activeConversation: Conversation | null;
  activeMessages: Message[];
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  newConversation: (modelId?: string, tools?: ToolKind[]) => Promise<Conversation>;
  selectConversation: (id: string | null) => void;
  renameConversation: (id: string, title: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  setConversationModel: (id: string, modelId: string) => Promise<void>;
  setConversationTools: (id: string, tools: ToolKind[]) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  patchMessage: (id: string, patch: Partial<Message>) => Promise<void>;
  removeMessage: (id: string, conversationId: string) => Promise<void>;
  updateConversationPreview: (id: string, preview: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, localMode } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadConversations = useCallback(async () => {
    if (localMode) return;
    dispatch({ type: 'SET_LOADING_CONVERSATIONS', loading: true });
    try {
      const conversations = await fetchConversations();
      dispatch({ type: 'SET_CONVERSATIONS', conversations });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_LOADING_CONVERSATIONS', loading: false });
    }
  }, [localMode]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (localMode) return;
      dispatch({ type: 'SET_LOADING_MESSAGES', loading: true });
      try {
        const messages = await fetchMessages(conversationId);
        dispatch({ type: 'SET_MESSAGES', conversationId, messages });
      } catch (e) {
        dispatch({ type: 'SET_ERROR', error: (e as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING_MESSAGES', loading: false });
      }
    },
    [localMode],
  );

  const newConversation = useCallback(
    async (modelId?: string, tools: ToolKind[] = []) => {
      const mid = modelId ?? getDefaultModelId();
      if (localMode) {
        const conv: Conversation = {
          id: uid('conv'),
          title: 'New chat',
          pinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modelId: mid,
          tools,
          messageCount: 0,
        };
        dispatch({ type: 'UPSERT_CONVERSATION', conversation: conv });
        dispatch({ type: 'SET_MESSAGES', conversationId: conv.id, messages: [] });
        dispatch({ type: 'SET_ACTIVE', id: conv.id });
        return conv;
      }
      const conv = await dbCreateConversation('New chat', mid, tools);
      dispatch({ type: 'UPSERT_CONVERSATION', conversation: conv });
      dispatch({ type: 'SET_MESSAGES', conversationId: conv.id, messages: [] });
      dispatch({ type: 'SET_ACTIVE', id: conv.id });
      return conv;
    },
    [localMode],
  );

  const selectConversation = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE', id });
  }, []);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      dispatch({
        type: 'UPSERT_CONVERSATION',
        conversation: {
          ...(state.conversations.find((c) => c.id === id) as Conversation),
          title,
          updatedAt: new Date().toISOString(),
        },
      });
      if (!localMode) await dbUpdateConversation(id, { title });
    },
    [localMode, state.conversations],
  );

  const togglePin = useCallback(
    async (id: string) => {
      const conv = state.conversations.find((c) => c.id === id);
      if (!conv) return;
      const pinned = !conv.pinned;
      dispatch({
        type: 'UPSERT_CONVERSATION',
        conversation: { ...conv, pinned, updatedAt: new Date().toISOString() },
      });
      if (!localMode) await dbUpdateConversation(id, { pinned });
    },
    [localMode, state.conversations],
  );

  const removeConversation = useCallback(
    async (id: string) => {
      dispatch({ type: 'DELETE_CONVERSATION', id });
      if (!localMode) await dbDeleteConversation(id);
    },
    [localMode],
  );

  const setConversationModel = useCallback(
    async (id: string, modelId: string) => {
      const conv = state.conversations.find((c) => c.id === id);
      if (!conv) return;
      dispatch({ type: 'UPSERT_CONVERSATION', conversation: { ...conv, modelId } });
      if (!localMode) await dbUpdateConversation(id, { modelId });
    },
    [localMode, state.conversations],
  );

  const setConversationTools = useCallback(
    async (id: string, tools: ToolKind[]) => {
      const conv = state.conversations.find((c) => c.id === id);
      if (!conv) return;
      dispatch({ type: 'UPSERT_CONVERSATION', conversation: { ...conv, tools } });
      if (!localMode) await dbUpdateConversation(id, { tools });
    },
    [localMode, state.conversations],
  );

  const addMessage = useCallback(
    async (message: Message) => {
      dispatch({ type: 'ADD_MESSAGE', message });
      if (!localMode) await insertMessage(message).catch(() => {});
    },
    [localMode],
  );

  const patchMessage = useCallback(
    async (id: string, patch: Partial<Message>) => {
      dispatch({ type: 'UPDATE_MESSAGE', id, patch });
      if (!localMode) await dbUpdateMessage(id, patch).catch(() => {});
    },
    [localMode],
  );

  const removeMessage = useCallback(
    async (id: string, conversationId: string) => {
      dispatch({ type: 'DELETE_MESSAGE', id, conversationId });
      if (!localMode) await dbDeleteMessage(id).catch(() => {});
    },
    [localMode],
  );

  const updateConversationPreview = useCallback(
    (id: string, preview: string) => {
      const conv = state.conversations.find((c) => c.id === id);
      if (!conv) return;
      dispatch({
        type: 'UPSERT_CONVERSATION',
        conversation: { ...conv, preview: truncate(preview, 80), updatedAt: new Date().toISOString() },
      });
    },
    [state.conversations],
  );

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  const activeConversation = useMemo(
    () => state.conversations.find((c) => c.id === state.activeId) ?? null,
    [state.conversations, state.activeId],
  );
  const activeMessages = useMemo(
    () => (state.activeId ? state.messages[state.activeId] ?? [] : []),
    [state.messages, state.activeId],
  );

  const value: StoreContextValue = useMemo(
    () => ({
      ...state,
      activeConversation,
      activeMessages,
      loadConversations,
      loadMessages,
      newConversation,
      selectConversation,
      renameConversation,
      togglePin,
      removeConversation,
      setConversationModel,
      setConversationTools,
      addMessage,
      patchMessage,
      removeMessage,
      updateConversationPreview,
    }),
    [
      state,
      activeConversation,
      activeMessages,
      loadConversations,
      loadMessages,
      newConversation,
      selectConversation,
      renameConversation,
      togglePin,
      removeConversation,
      setConversationModel,
      setConversationTools,
      addMessage,
      patchMessage,
      removeMessage,
      updateConversationPreview,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
