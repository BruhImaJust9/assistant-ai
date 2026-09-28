// Chat orchestration — coordinates the AI provider, web search, image
// generation, and file analysis tools into a single streaming flow.
// Exposed via ChatProvider so every component shares one instance.

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Citation,
  FileAttachment,
  GeneratedImage,
  Message,
  MessagePart,
  ToolKind,
} from '@/types';
import type { ModelConfig } from '@/config/models';
import { registry } from '@/ai/registry';
import { useStore } from '@/store/conversations';
import { uid } from '@/utils';
import { extractText } from '@/lib/files';
import { getModel } from '@/config/models';

interface SendArgs {
  conversationId: string;
  model: ModelConfig;
  tools: ToolKind[];
  text: string;
  files?: FileAttachment[];
  rawFiles?: File[];
}

interface ChatContextValue {
  send: (args: SendArgs) => Promise<void>;
  stop: () => void;
  regenerate: (messageId: string) => Promise<void>;
  isStreaming: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const send = useCallback(
    async (args: SendArgs) => {
      const { conversationId, model, tools, text, files, rawFiles } = args;
      if (!text.trim() && (!files || files.length === 0)) return;

      // 1. Persist the user message.
      const userParts: MessagePart[] = [];
      if (text.trim()) userParts.push({ type: 'text', text });
      if (files && files.length > 0) {
        for (const f of files) userParts.push({ type: 'file', file: f });
      }
      const userMessage: Message = {
        id: uid('msg'),
        conversationId,
        role: 'user',
        parts: userParts,
        status: 'complete',
        tools,
        createdAt: new Date().toISOString(),
      };
      await store.addMessage(userMessage);
      store.updateConversationPreview(conversationId, text || 'Attachment');

      // Auto-generate a title from the first user message.
      const conv = store.conversations.find((c) => c.id === conversationId);
      if (conv && conv.title === 'New chat' && text.trim()) {
        const title = text.trim().split('\n')[0].slice(0, 60);
        store.renameConversation(conversationId, title);
      }

      // 2. Create the assistant placeholder.
      const assistantId = uid('msg');
      const assistantMessage: Message = {
        id: assistantId,
        conversationId,
        role: 'assistant',
        parts: [],
        status: 'streaming',
        modelId: model.id,
        tools,
        createdAt: new Date().toISOString(),
      };
      await store.addMessage(assistantMessage);

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // 3. Run web search if the tool is active.
        let citations: Citation[] = [];
        if (tools.includes('web-search')) {
          await store.patchMessage(assistantId, { status: 'streaming' });
          const searchResults = await registry.webSearch().search(text, controller.signal);
          citations = searchResults.map((r) => ({
            id: uid('cite'),
            url: r.url,
            title: r.title,
            domain: new URL(r.url).hostname.replace(/^www\./, ''),
            snippet: r.snippet,
            faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.url)}&sz=64`,
          }));
          await store.patchMessage(assistantId, {
            parts: [{ type: 'citations', citations }],
          });
        }

        // 4. Run image generation if the tool is active.
        if (tools.includes('image-generation')) {
          const result = await registry.imageGen().generate({
            prompt: text,
            aspectRatio: '1:1',
            count: 1,
            style: 'auto',
            signal: controller.signal,
          });
          const images: GeneratedImage[] = result.images;
          const textPart: MessagePart = {
            type: 'text',
            text: `Here ${images.length > 1 ? 'are' : 'is'} the generated image${images.length > 1 ? 's' : ''} for: "${text}".`,
          };
          await store.patchMessage(assistantId, {
            parts: [
              ...(citations.length ? [{ type: 'citations', citations } as MessagePart] : []),
              ...images.map((img) => ({ type: 'image', image: img } as MessagePart)),
              textPart,
            ],
            status: 'complete',
          });
          setIsStreaming(false);
          return;
        }

        // 5. Run file analysis if files are attached.
        if (tools.includes('file-analysis') && rawFiles && rawFiles.length > 0) {
          const extracted = await extractText(rawFiles[0]);
          const updatedFiles = (files ?? []).map((f, i) =>
            i === 0 ? { ...f, extractedText: extracted, status: 'ready' as const } : f,
          );
          const updatedUserParts = userMessage.parts.map((p) =>
            p.type === 'file' && p.file?.id === updatedFiles[0]?.id
              ? { ...p, file: updatedFiles[0] }
              : p,
          );
          await store.patchMessage(userMessage.id, { parts: updatedUserParts });
        }

        // 6. Stream the chat completion.
        // Build history from known messages — store.messages is stale in this
        // closure because the dispatch hasn't flushed yet.
        const existingMessages = store.messages[conversationId] ?? [];
        const history = [...existingMessages, userMessage]
          .filter((m) => m.id !== assistantId)
          .map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.parts
              .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join('\n'),
          }));

        // When web search is active, inject search results as context so the
        // AI can synthesize a real answer from them.
        if (citations.length > 0) {
          const searchContext = citations
            .map((c, i) => `[${i + 1}] ${c.title} (${c.domain})\n${c.snippet}`)
            .join('\n\n');
          const lastIdx = history.length - 1;
          if (lastIdx >= 0 && history[lastIdx].role === 'user') {
            history[lastIdx] = {
              ...history[lastIdx],
              content: `${history[lastIdx].content}\n\n--- Web search results ---\n${searchContext}\n--- End search results ---\n\nUse the above search results to answer the user's question. Cite sources by their number in [brackets].`,
            };
          }
        }

        let accumulated = '';
        const provider = registry.chat(model);
        await provider.streamChat(
          {
            model,
            messages: history,
            tools,
            files,
            signal: controller.signal,
          },
          (chunk) => {
            if (chunk.delta) {
              accumulated += chunk.delta;
              const parts: MessagePart[] = [];
              if (citations.length) parts.push({ type: 'citations', citations });
              parts.push({ type: 'text', text: accumulated });
              store.patchMessage(assistantId, { parts, status: 'streaming' });
            }
            if (chunk.error) {
              store.patchMessage(assistantId, {
                status: chunk.error.includes('rate') ? 'rate-limited' : 'error',
                error: chunk.error,
                parts: citations.length ? [{ type: 'citations', citations }] : [],
              });
            }
            if (chunk.done && !chunk.error) {
              const parts: MessagePart[] = [];
              if (citations.length) parts.push({ type: 'citations', citations });
              if (accumulated) parts.push({ type: 'text', text: accumulated });
              store.patchMessage(assistantId, { parts, status: 'complete' });
            }
          },
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const msg = (err as Error).message || 'Something went wrong';
        store.patchMessage(assistantId, {
          status: 'error',
          error: msg,
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [store],
  );

  const regenerate = useCallback(
    async (messageId: string) => {
      const allMessages = store.activeMessages;
      const idx = allMessages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      let userMsg: Message | undefined;
      for (let i = idx - 1; i >= 0; i--) {
        if (allMessages[i].role === 'user') {
          userMsg = allMessages[i];
          break;
        }
      }
      if (!userMsg || !store.activeConversation) return;
      const modelConfig = getModel(store.activeConversation.modelId);
      if (!modelConfig) return;

      await store.patchMessage(messageId, { parts: [], status: 'streaming', error: undefined });
      const text = userMsg.parts.find((p) => p.type === 'text')?.text ?? '';
      const files = userMsg.parts
        .filter((p) => p.type === 'file')
        .map((p) => p.file!) as FileAttachment[];

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        let citations: Citation[] = [];
        if (userMsg.tools?.includes('web-search')) {
          const searchResults = await registry.webSearch().search(text, controller.signal);
          citations = searchResults.map((r) => ({
            id: uid('cite'),
            url: r.url,
            title: r.title,
            domain: new URL(r.url).hostname.replace(/^www\./, ''),
            snippet: r.snippet,
            faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.url)}&sz=64`,
          }));
        }
        let accumulated = '';
        const provider = registry.chat(modelConfig);
        const regenMessages = allMessages
          .slice(0, idx)
          .map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.parts
              .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join('\n'),
          }));

        if (citations.length > 0) {
          const searchContext = citations
            .map((c, i) => `[${i + 1}] ${c.title} (${c.domain})\n${c.snippet}`)
            .join('\n\n');
          const lastIdx = regenMessages.length - 1;
          if (lastIdx >= 0 && regenMessages[lastIdx].role === 'user') {
            regenMessages[lastIdx] = {
              ...regenMessages[lastIdx],
              content: `${regenMessages[lastIdx].content}\n\n--- Web search results ---\n${searchContext}\n--- End search results ---\n\nUse the above search results to answer the user's question. Cite sources by their number in [brackets].`,
            };
          }
        }

        await provider.streamChat(
          {
            model: modelConfig,
            messages: regenMessages,
            tools: userMsg.tools ?? [],
            files,
            signal: controller.signal,
          },
          (chunk) => {
            if (chunk.delta) {
              accumulated += chunk.delta;
              const parts: MessagePart[] = [];
              if (citations.length) parts.push({ type: 'citations', citations });
              parts.push({ type: 'text', text: accumulated });
              store.patchMessage(messageId, { parts, status: 'streaming' });
            }
            if (chunk.error) {
              store.patchMessage(messageId, {
                status: 'error',
                error: chunk.error,
              });
            }
            if (chunk.done && !chunk.error) {
              const parts: MessagePart[] = [];
              if (citations.length) parts.push({ type: 'citations', citations });
              if (accumulated) parts.push({ type: 'text', text: accumulated });
              store.patchMessage(messageId, { parts, status: 'complete' });
            }
          },
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        store.patchMessage(messageId, { status: 'error', error: (err as Error).message });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [store],
  );

  const value: ChatContextValue = { send, stop, regenerate, isStreaming };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
