// Supabase connection config with build-time fallbacks.
//
// Vite bundles VITE_ env vars at build time. If the build environment doesn't
// have them set (e.g., the published Bolt app), the providers would construct
// URLs like "undefined/functions/v1/chat-proxy" and get 404s. These fallbacks
// ensure the edge functions are always reachable.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://btqxybsszbyxpprkyssb.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cXh5YnNzemJ5eHBwcmt5c3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNzYxNTgsImV4cCI6MjEwMjc1MjE1OH0.boJH-2U_uzL_GRtCC3gLJp_LIK_69e8N__Q77CwRbSU';

export function edgeFunctionUrl(slug: string): string {
  return `${SUPABASE_URL}/functions/v1/${slug}`;
}

export function edgeFunctionHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  };
}
