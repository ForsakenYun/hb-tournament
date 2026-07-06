import { createClient } from "@supabase/supabase-js";

// Single shared Supabase client for the entire project. Every module that
// needs Supabase (DraftDashboard.jsx included) imports `supabase` from
// here instead of calling `createClient` itself, so there's only ever one
// client/websocket connection per browser tab.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly at startup rather than silently getting empty data back
  // from a misconfigured client.
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in your .env file (see SETUP.md)."
  );
}

// The anon key is meant to be public (it ships to every browser); access
// control is enforced by RLS policies / RPC functions in Postgres, not by
// hiding this key.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});