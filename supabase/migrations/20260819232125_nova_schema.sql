/*
# Nova — core schema

1. Purpose
   Persistent storage for the Nova AI assistant: user profiles, conversations,
   messages (with structured parts for text, citations, images, files),
   generated images, uploaded files, and per-user settings.

2. New Tables
   - `profiles` — display info for an authenticated user (1:1 with auth.users).
     - id (uuid, PK, references auth.users)
     - email (text)
     - display_name (text)
     - avatar_url (text, nullable)
     - created_at (timestamptz)
   - `conversations` — a chat thread owned by a user.
     - id (uuid, PK)
     - user_id (uuid, FK auth.users, DEFAULT auth.uid())
     - title (text)
     - pinned (boolean, default false)
     - model_id (text)
     - tools (text[], default '{}')
     - created_at, updated_at (timestamptz)
   - `messages` — a message within a conversation.
     - id (uuid, PK)
     - conversation_id (uuid, FK conversations ON DELETE CASCADE)
     - user_id (uuid, FK auth.users, DEFAULT auth.uid())
     - role (text: user/assistant/system)
     - parts (jsonb) — structured content parts
     - status (text)
     - model_id (text, nullable)
     - tools (text[], default '{}')
     - error (text, nullable)
     - edited (boolean, default false)
     - created_at (timestamptz)
   - `generated_images` — images produced by the image-generation tool.
     - id (uuid, PK)
     - message_id (uuid, FK messages ON DELETE CASCADE)
     - user_id (uuid, FK auth.users, DEFAULT auth.uid())
     - url (text)
     - prompt (text)
     - width, height (int, nullable)
     - model (text, nullable)
     - created_at (timestamptz)
   - `user_files` — metadata for uploaded files.
     - id (uuid, PK)
     - user_id (uuid, FK auth.users, DEFAULT auth.uid())
     - name (text)
     - mime_type (text)
     - size (bigint)
     - storage_path (text)
     - extracted_text (text, nullable)
     - created_at (timestamptz)
   - `user_settings` — per-user app settings (1:1 with user).
     - id (uuid, PK)
     - user_id (uuid, FK auth.users, DEFAULT auth.uid())
     - default_model_id (text)
     - theme (text, default 'dark')
     - send_on_enter (boolean, default true)
     - streaming (boolean, default true)
     - web_search_by_default (boolean, default false)
     - created_at, updated_at (timestamptz)
     - UNIQUE (user_id)

3. Indexes
   - conversations(user_id, updated_at desc)
   - messages(conversation_id, created_at)
   - generated_images(message_id)
   - user_files(user_id, created_at desc)

4. Security
   - RLS enabled on every table.
   - Owner-scoped CRUD policies (TO authenticated, auth.uid() = user_id) on
     conversations, messages, generated_images, user_files, user_settings.
   - Profiles: a user can read + update only their own profile row.
   - All owner columns default to auth.uid() so inserts that omit user_id
     still satisfy the WITH CHECK policy.
   - Child tables (messages, generated_images) carry their own user_id and
     are scoped directly (not via a parent join) for simpler policies.
*/
