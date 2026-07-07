// lib/supabaseClient.js
//
// One shared Supabase client for the whole app.
//
// Env vars needed (Vercel → Project Settings → Environment Variables,
// and a local .env.local for dev):
//   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
//   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
//
// (If this project uses Next.js instead of Vite, use
//  NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and swap the
//  import.meta.env lines below for process.env.)
//
// npm install @supabase/supabase-js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev rather than silently limping along with a broken client.
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Add them to .env.local and to your Vercel project's environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }, // we manage our own lightweight session token, see lib/auth.js
  realtime: { params: { eventsPerSecond: 10 } },
});
