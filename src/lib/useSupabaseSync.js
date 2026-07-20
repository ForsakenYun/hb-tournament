import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ════════════════════════════════════════════════════════════════════════
   useRealtimeTable(table)
   Generic "give me a live-updating array of every row in this table" hook.
   Used for `public_accounts` and `invites` in DraftDashboard.jsx — both are
   read this way and then mapped through Auth.mapAccount / Auth.mapInvite.

   ASSUMPTION: rows are ordered by `created_at` (both tables are assumed to
   have that column per the schema notes below) and Realtime is enabled for
   both tables in the Supabase dashboard (Database → Replication).
   ════════════════════════════════════════════════════════════════════════ */
export function useRealtimeTable(table) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.error(`[useRealtimeTable] failed to load "${table}":`, error.message);
        setRows([]);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        setRows((prev) => {
          if (payload.eventType === "INSERT") {
            if (prev.some((r) => r.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          }
          if (payload.eventType === "UPDATE") {
            return prev.map((r) => (r.id === payload.new.id ? payload.new : r));
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((r) => r.id !== payload.old.id);
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table]);

  return { rows, loading };
}

/* ════════════════════════════════════════════════════════════════════════
   useSupabaseTournament(initial)
   The whole `tournament` object DraftDashboard.jsx builds up (teams, pool,
   pickIndex, draftPhase, round1/wb/lb, ...) is one JS object, so this
   stores it as a single JSON row rather than a normalized table — the
   single most direct way to make `setTournament(prev => ...)` from the
   component keep working unmodified.

   ASSUMPTION: a `tournament` table with a fixed single row `id = 1` and a
   `state` jsonb column (see schema notes below). If that row doesn't exist
   yet, it's created from `initial` on first load.

   Returns [tournament, setTournament, { loading }] exactly like the
   component destructures it: `const [tournament, setTournament, { loading:
   tournamentLoading }] = useSupabaseTournament(initialTournament());`
   ════════════════════════════════════════════════════════════════════════ */
const TOURNAMENT_ROW_ID = 1;

export function useSupabaseTournament(initial) {
  const [tournament, setTournamentState] = useState(initial);
  const [loading, setLoading] = useState(true);
  const stateRef = useRef(initial);
  // Tracks the JSON we most recently pushed ourselves, so that when the
  // realtime echo of our own write comes back we don't redundantly re-render
  // with an (identical) new object reference.
  const lastPushedRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournament")
        .select("state")
        .eq("id", TOURNAMENT_ROW_ID)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // eslint-disable-next-line no-console
        console.error("[useSupabaseTournament] failed to load:", error.message);
      }

      if (!error && data && data.state) {
        stateRef.current = data.state;
        lastPushedRef.current = JSON.stringify(data.state);
        setTournamentState(data.state);
      } else {
        // No row yet — seed it with the initial (fresh) tournament shape.
        const { error: upsertError } = await supabase
          .from("tournament")
          .upsert({ id: TOURNAMENT_ROW_ID, state: initial, updated_at: new Date().toISOString() });
        if (upsertError) {
          // eslint-disable-next-line no-console
          console.error("[useSupabaseTournament] failed to seed row:", upsertError.message);
        }
        stateRef.current = initial;
        lastPushedRef.current = JSON.stringify(initial);
      }
      if (!cancelled) setLoading(false);
    }
    load();

    const channel = supabase
      .channel("realtime:tournament")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tournament", filter: `id=eq.${TOURNAMENT_ROW_ID}` },
        (payload) => {
          const nextState = payload.new?.state;
          if (!nextState) return;
          const asString = JSON.stringify(nextState);
          if (asString === lastPushedRef.current) return; // our own write echoing back
          lastPushedRef.current = asString;
          stateRef.current = nextState;
          setTournamentState(nextState);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTournament = useCallback((updater) => {
    const next = typeof updater === "function" ? updater(stateRef.current) : updater;
    stateRef.current = next;
    lastPushedRef.current = JSON.stringify(next);
    setTournamentState(next);

    supabase
      .from("tournament")
      .upsert({ id: TOURNAMENT_ROW_ID, state: next, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[useSupabaseTournament] failed to save:", error.message);
        }
      });
  }, []);

  return [tournament, setTournament, { loading }];
}

/* ════════════════════════════════════════════════════════════════════════
   usePresence(currentUser)
   DraftDashboard.jsx calls this with no return value used, purely for its
   side effect. Rather than requiring a dedicated presence table/migration,
   this uses Supabase Realtime's built-in Presence feature (a Realtime
   channel's .track()), which needs no schema changes at all — the most
   conservative choice since presence data isn't read/displayed anywhere
   else in the component today, but this keeps every logged-in user's
   channel state visible to anyone else who later chooses to subscribe.

   ASSUMPTION: this is genuinely inferred, not read from usage elsewhere in
   DraftDashboard.jsx (no other line reads a presence/online field). If your
   original implementation instead wrote to a `presence` table with a
   `last_seen` column, let me know and I can swap this for that.
   ════════════════════════════════════════════════════════════════════════ */
export function usePresence(currentUser) {
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel("presence:lobby", {
      config: { presence: { key: currentUser.id } },
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({
          id: currentUser.id,
          displayName: currentUser.displayName,
          role: currentUser.role,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.displayName, currentUser?.role]);
}
