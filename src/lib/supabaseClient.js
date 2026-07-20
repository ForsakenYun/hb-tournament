import { createClient } from "@supabase/supabase-js";

/* ════════════════════════════════════════════════════════════════════════
   SUPABASE CLIENT — single shared instance used by auth.js and
   useSupabaseSync.js.

   ASSUMPTION: your .env exposes the URL/anon key as Vite-style env vars:
     VITE_SUPABASE_URL=...
     VITE_SUPABASE_ANON_KEY=...
   You said the .env file itself is intact and correct, but since that file
   wasn't shared, I can't confirm the exact variable names your build tool
   expects. If your project is Create React App or Next.js instead of Vite,
   the names differ (e.g. REACT_APP_SUPABASE_URL / process.env, or
   NEXT_PUBLIC_SUPABASE_URL). If this throws a "supabaseUrl is required"
   error on startup, that's the mismatch — just swap the two lines below for
   the convention your project actually uses.
   ════════════════════════════════════════════════════════════════════════ */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly rather than silently constructing a broken client — a
  // missing/misnamed env var is the most likely cause of a totally blank
  // screen, so surface it clearly instead of letting createClient() throw
  // an opaque internal error.
  // eslint-disable-next-line no-console
  console.error(
    "[supabaseClient] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Check your .env file and the variable-name convention for your build tool."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // This app does not use Supabase Auth (accounts/sessions are handled
    // by the custom username+password system in lib/auth.js via RPC), so
    // there's no Supabase-managed session to persist or refresh here.
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export default supabase;
