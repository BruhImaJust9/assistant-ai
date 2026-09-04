// Provider-agnostic AI interfaces.
// Each provider implements these; the UI only depends on the interfaces.

import type { Citation, FileAttachment, GeneratedImage, ToolKind } from '@/types';
import type { ModelConfig } from '@/config/models';

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: ModelConfig;
  messages: ChatTurn[];
  tools: ToolKind[];
  files?: FileAttachment[];
  /** Abort the in-flight stream. */
  signal?: AbortSignal;
}

export interface ChatStreamChunk {
  /** Incremental text delta. */
  delta?: string;
  /** Citations gathered during a web-search tool call. */
  citations?: Citation[];
  /** Images produced by an image-generation tool call. */
  images?: GeneratedImage[];
  /** True once the stream is fully complete. */
  done?: boolean;
  /** Set on a terminal error. */
  error?: string;
}

export type ChatStreamHandler = (chunk: ChatStreamChunk) => void;

export interface ChatProvider {
  id: string;
  /** Stream a chat completion. Returns when the stream is done. */
  streamChat(req: ChatRequest, onChunk: ChatStreamHandler): Promise<void>;
}

export interface ImageGenRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  count: number;
  style: ImageStyle;
  signal?: AbortSignal;
}

export interface ImageGenResult {
  images: GeneratedImage[];
  error?: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:2';
export type ImageStyle = 'auto' | 'photoreal' | 'illustration' | '3d' | 'anime' | 'minimal' | 'cinematic';

export interface ImageGenProvider {
  id: string;
  generate(req: ImageGenRequest): Promise<ImageGenResult>;
}

export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
}

export interface WebSearchProvider {
  id: string;
  search(query: string, signal?: AbortSignal): Promise<WebSearchResult[]>;
}

export interface FileAnalysisRequest {
  file: FileAttachment;
  prompt: string;
  signal?: AbortSignal;
}

export interface FileAnalysisProvider {
  id: string;
  analyze(req: FileAnalysisRequest): Promise<string>;
}

/**
 * Registry that resolves the active provider for a given model.
 * The UI calls these functions; the wiring is centralized here so a provider
 * swap is a one-file change.
 */
export interface ProviderRegistry {
  chat(model: ModelConfig): ChatProvider;
  imageGen(): ImageGenProvider;
  webSearch(): WebSearchProvider;
  fileAnalysis(): FileAnalysisProvider;
}
