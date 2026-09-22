// Core domain types shared across the app.

export type ID = string;

export type Role = 'user' | 'assistant' | 'system';

export type MessageStatus =
  | 'pending' // created locally, not yet sent
  | 'sending'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'rate-limited'
  | 'offline';

export type ToolKind = 'web-search' | 'image-generation' | 'file-analysis';

export interface Citation {
  id: ID;
  url: string;
  title: string;
  domain: string;
  snippet?: string;
  faviconUrl?: string;
}

export interface GeneratedImage {
  id: ID;
  url: string;
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
}

export interface FileAttachment {
  id: ID;
  name: string;
  size: number;
  mimeType: string;
  /** Object URL for local preview, or remote storage path once persisted. */
  previewUrl?: string;
  /** Text extracted from the file, if analysis has run. */
  extractedText?: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
}

export interface MessagePart {
  type: 'text' | 'citations' | 'image' | 'file';
  text?: string;
  citations?: Citation[];
  image?: GeneratedImage;
  file?: FileAttachment;
}

export interface Message {
  id: ID;
  conversationId: ID;
  role: Role;
  parts: MessagePart[];
  status: MessageStatus;
  modelId?: string;
  tools?: ToolKind[];
  createdAt: string;
  /** Set when status is error / rate-limited / offline. */
  error?: string;
  /** True when the user edited this user message and regenerated. */
  edited?: boolean;
}

export interface Conversation {
  id: ID;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  /** Last message preview for the sidebar. */
  preview?: string;
  modelId: string;
  /** Active tools for new messages in this conversation. */
  tools: ToolKind[];
  messageCount: number;
}

export interface UserSettings {
  id: ID;
  userId: ID;
  defaultModelId: string;
  theme: 'dark' | 'light';
  sendOnEnter: boolean;
  streaming: boolean;
  webSearchByDefault: boolean;
}

export interface UserProfile {
  id: ID;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserFile {
  id: ID;
  userId: ID;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  extractedText?: string;
  createdAt: string;
}
