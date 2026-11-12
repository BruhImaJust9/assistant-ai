/*
# Create usage_events table

1. New Tables
- `usage_events`: one row per chat reply, web search, image generation, or message reaction.
  - `id` (uuid, primary key)
  - `kind` (text): 'chat' | 'web_search' | 'image' | 'reaction'
  - `model_id` (text, nullable): which Nova model handled the request
  - `tokens` (integer): estimated tokens used by the event
  - `reaction` (text, nullable): 'up' | 'down' for reaction events
  - `message_id` (text, nullable): the message the event refers to
  - `created_at` (timestamptz): when the event happened

2. Security
- Row level security enabled. The app has no sign-in, so the anon key reads and writes this table.
- Policies allow select, insert, and delete for anon and authenticated roles.
- No update policy: events are append-only.

3. Notes
- Indexes on created_at and (kind, model_id) keep analytics and filtered exports fast.
*/

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('chat', 'web_search', 'image', 'reaction')),
  model_id text,
  tokens integer NOT NULL DEFAULT 0 CHECK (tokens >= 0),
  reaction text CHECK (reaction IN ('up', 'down')),
  message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_created_at_idx ON usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_kind_model_idx ON usage_events (kind, model_id);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON usage_events TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_usage_events" ON usage_events;
CREATE POLICY "anon_select_usage_events" ON usage_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_usage_events" ON usage_events;
CREATE POLICY "anon_insert_usage_events" ON usage_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_usage_events" ON usage_events;
CREATE POLICY "anon_delete_usage_events" ON usage_events FOR DELETE
  TO anon, authenticated USING (true);
