// Data access layer — the only module that talks to Supabase tables.
// Keeps query shapes in one place so the UI never imports supabase directly
// for table reads/writes.

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Conversation,
  FileAttachment,
  GeneratedImage,
  Message,
  MessagePart,
  UserSettings,
  UserProfile,
} from '@/types';
import type { ToolKind } from '@/types';

type DbConversation = {
  id: string;
  user_id: string;
  title: string;
  pinned: boolean;
  model_id: string;
  tools: string[];
  created_at: string;
  updated_at: string;
};

type DbMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  parts: MessagePart[];
  status: string;
  model_id: string | null;
  tools: string[];
  error: string | null;
  edited: boolean;
  created_at: string;
};

// ---------- Conversations ----------

export async function fetchConversations(): Promise<Conversation[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as DbConversation[]).map(dbToConversation);
}

export async function createConversation(
  title: string,
  modelId: string,
  tools: ToolKind[],
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ title, model_id: modelId, tools })
    .select('*')
    .single();
  if (error) throw error;
  return dbToConversation(data as DbConversation);
}

export async function updateConversation(
  id: string,
  patch: Partial<Pick<Conversation, 'title' | 'pinned' | 'modelId' | 'tools'>>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.pinned !== undefined) dbPatch.pinned = patch.pinned;
  if (patch.modelId !== undefined) dbPatch.model_id = patch.modelId;
  if (patch.tools !== undefined) dbPatch.tools = patch.tools;
  const { error } = await supabase.from('conversations').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Messages ----------

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DbMessage[]).map(dbToMessage);
}

export async function insertMessage(msg: Message): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    id: msg.id,
    conversation_id: msg.conversationId,
    role: msg.role,
    parts: msg.parts,
    status: msg.status,
    model_id: msg.modelId ?? null,
    tools: msg.tools ?? [],
    error: msg.error ?? null,
    edited: msg.edited ?? false,
  });
  if (error) throw error;
}

export async function updateMessage(
  id: string,
  patch: Partial<Pick<Message, 'parts' | 'status' | 'error' | 'edited'>>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.parts !== undefined) dbPatch.parts = patch.parts;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.error !== undefined) dbPatch.error = patch.error;
  if (patch.edited !== undefined) dbPatch.edited = patch.edited;
  const { error } = await supabase.from('messages').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Generated images ----------

export async function insertGeneratedImages(
  images: GeneratedImage[],
  messageId: string,
): Promise<void> {
  if (images.length === 0) return;
  const rows = images.map((img) => ({
    id: img.id,
    message_id: messageId,
    url: img.url,
    prompt: img.prompt,
    width: img.width ?? null,
    height: img.height ?? null,
    model: img.model ?? null,
  }));
  const { error } = await supabase.from('generated_images').insert(rows);
  if (error) throw error;
}

// ---------- Files ----------

export async function insertUserFile(file: FileAttachment, storagePath: string): Promise<void> {
  const { error } = await supabase.from('user_files').insert({
    id: file.id,
    name: file.name,
    mime_type: file.mimeType,
    size: file.size,
    storage_path: storagePath,
    extracted_text: file.extractedText ?? null,
  });
  if (error) throw error;
}

// ---------- Profile ----------

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    email: data.email ?? '',
    displayName: data.display_name ?? '',
    avatarUrl: data.avatar_url ?? undefined,
    createdAt: data.created_at,
  };
}

export async function upsertProfile(
  userId: string,
  email: string,
  displayName: string,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, email, display_name: displayName }, { onConflict: 'id' });
  if (error) throw error;
}

// ---------- Settings ----------

export async function fetchSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    defaultModelId: data.default_model_id,
    theme: data.theme,
    sendOnEnter: data.send_on_enter,
    streaming: data.streaming,
    webSearchByDefault: data.web_search_by_default,
  };
}

export async function upsertSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        default_model_id: settings.defaultModelId,
        theme: settings.theme,
        send_on_enter: settings.sendOnEnter,
        streaming: settings.streaming,
        web_search_by_default: settings.webSearchByDefault,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

// ---------- Mappers ----------

function dbToConversation(db: DbConversation): Conversation {
  return {
    id: db.id,
    title: db.title,
    pinned: db.pinned,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    modelId: db.model_id,
    tools: db.tools as ToolKind[],
    messageCount: 0,
  };
}

function dbToMessage(db: DbMessage): Message {
  return {
    id: db.id,
    conversationId: db.conversation_id,
    role: db.role as Message['role'],
    parts: db.parts,
    status: db.status as Message['status'],
    modelId: db.model_id ?? undefined,
    tools: db.tools as ToolKind[],
    error: db.error ?? undefined,
    edited: db.edited,
    createdAt: db.created_at,
  };
}
