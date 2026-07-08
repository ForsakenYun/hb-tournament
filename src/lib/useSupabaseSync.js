// lib/useSupabaseSync.js
//
// Centralized Supabase data-access hooks. Three shapes:
//
// 1. useRealtimeTable(table)  — read-only live list (accounts, invites).
//    Mutations for these go through named RPC functions in lib/auth.js
//    (createAccount, setEnabled, createInvite, ...) because each of those
//    actions has real server-side rules attached (password hashing, invite
//    atomicity, "can't disable yourself", ...) that must not live in the
//    client. See lib/auth.js.
//
// 2. useSupabaseTournament()  — a [state, setState] pair with the *same*
//    shape as the old useSyncedState(key, initial) hook. Only admins ever
//    call setTournament in this app, and every admin action is already a
//    full-object mutation (draft picks, bracket rounds, ...), so this one
//    table gets a generic sync hook and AdminDraftControl / AdminBracketControl
//    / PlayerHome / SpectatorContent need ZERO changes — they keep calling
//    setTournament(prev => ({...prev, ...})) exactly as before.
//
// 3. usePresence(currentUser) — tracks this browser tab as "connected" on a
//    shared Realtime Presence channel, and reconciles `accounts.joined`
//    against who's actually connected whenever that set changes. This is
//    what makes a crashed tab / lost network / force-closed browser
//    eventually un-join a player before the draft starts, without relying
//    on any unload event the browser might never fire. See reconcile_joined
//    in supabase/schema.sql for why this is always safe to call and never
//    touches anything once the draft is underway.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { getSessionToken, reconcileJoined } from "./auth";

// ─────────────────────────────────────────────────────────────────────────
// Read-only live table (accounts / invites)
// ─────────────────────────────────────────────────────────────────────────
export function useRealtimeTable(table, { orderBy = "created_at", ascending = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending });
      if (cancelled) return;
      if (error) setError(error);
      else setRows(data ?? []);
      setLoading(false);
    }
    load();

    // Realtime: any insert/update/delete on this table re-fetches. A full
    // re-fetch (rather than patching the single changed row into state) is
    // deliberately simple and correct; these tables are small (accounts,
    // invites), so the extra round trip is cheap and avoids subtle
    // out-of-order-event bugs.
    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table, orderBy, ascending]);

  return { rows, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────
// Tournament singleton — drop-in replacement for
// const [tournament, setTournament] = useSyncedState("tournament", initialTournament())
// ─────────────────────────────────────────────────────────────────────────
export function useSupabaseTournament(initialValue) {
  const [state, setStateLocal] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Guards against redundant writes: if a realtime event echoes back the
  // write we just made, skip re-applying it.
  const lastWrittenRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.from("tournament_state").select("data").eq("id", "main").single();
      if (cancelled) return;
      if (error) { setError(error); setLoading(false); return; }
      setStateLocal(data?.data && Object.keys(data.data).length ? data.data : initialValue);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("realtime:tournament_state")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournament_state", filter: "id=eq.main" }, (payload) => {
        const next = payload.new?.data;
        if (next && JSON.stringify(next) !== JSON.stringify(lastWrittenRef.current)) {
          setStateLocal(next);
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setState = useCallback((updater) => {
    setStateLocal((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      lastWrittenRef.current = next;
      supabase
        .rpc("admin_write_tournament", { p_session_token: getSessionToken(), p_data: next })
        .then(({ error }) => { if (error) console.error("Failed to save tournament state:", error); });
      return next;
    });
  }, []);

  return [state, setState, { loading, error }];
}

// ─────────────────────────────────────────────────────────────────────────
// Presence — "who's actually connected right now"
// ─────────────────────────────────────────────────────────────────────────
//
// Every logged-in tab (any role) tracks itself on one shared presence
// channel, keyed by account id. Supabase's realtime server maintains this
// over the tab's own WebSocket connection — a graceful tab close sends a
// clean leave almost immediately; a crash or lost network is detected via
// the connection's own heartbeat timing out, with no reliance on any
// unload/beforeunload event (those are exactly the events that don't fire
// reliably on a crash, which is the whole reason this exists instead of a
// simpler onbeforeunload handler).
//
// Multiple tabs/sessions for the same account naturally collapse into one
// "present" entry (same key), which is also what keeps a duplicate login
// from ever counting as two participants — reconcile_joined only clears
// `joined` when an account has *zero* present connections left, not one.
//
// A light client-side throttle (skip a reconcile call if one already ran
// in the last 2s) avoids every connected tab hammering the RPC at once
// when several people disconnect in a burst; reconcile_joined itself is a
// no-op if there's nothing stale to clear, so this is purely to reduce
// redundant network traffic, not for correctness.
const RECONCILE_THROTTLE_MS = 2000;

export function usePresence(currentUser) {
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel("tournament-presence", {
      config: { presence: { key: currentUser.id } },
    });

    let lastReconcile = 0;
    let pending = null;
    const reconcile = () => {
      const now = Date.now();
      const runIn = Math.max(0, RECONCILE_THROTTLE_MS - (now - lastReconcile));
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        lastReconcile = Date.now();
        const presentIds = Object.keys(channel.presenceState());
        reconcileJoined(presentIds);
      }, runIn);
    };

    channel
      .on("presence", { event: "sync" }, reconcile)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      if (pending) clearTimeout(pending);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);
}
