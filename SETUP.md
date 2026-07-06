# Real-time backend setup (Supabase)

This connects the dashboard to a single shared Postgres database with
Supabase Realtime, so Admin / Players / Captains / Spectators all read and
write the *same* live state, on any device, from any IP, instantly.

## 1. Create a Supabase project
Go to https://supabase.com, create a free project, and grab (Project
Settings → API):
- **Project URL** → `SUPABASE_URL`
- **anon public key** → `SUPABASE_ANON_KEY`

Put these in the top of `DraftDashboard.jsx` (or, better, as env vars
`REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` at build time —
the file already checks for those first).

## 2. Run this once in the Supabase SQL editor

```sql
-- One row per shared "document" (accounts, tournament, invites).
create table if not exists public.draft_sync (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Turn on Realtime broadcast for this table.
alter publication supabase_realtime add table public.draft_sync;

-- Row Level Security. This app has its own username/password layer that
-- isn't wired to Supabase Auth, so for simplicity everyone (the anon key)
-- can read/write this one table. If you later add Supabase Auth, tighten
-- these policies (e.g. restrict writes to admins for the tournament key).
alter table public.draft_sync enable row level security;

create policy "public read" on public.draft_sync
  for select using (true);

create policy "public upsert" on public.draft_sync
  for insert with check (true);

create policy "public update" on public.draft_sync
  for update using (true);

-- ── Atomic invite redemption ────────────────────────────────────────────
-- Locks the invites row (SELECT ... FOR UPDATE) so two people redeeming
-- the same code — or the last remaining use — at the exact same moment
-- from different devices can't both succeed.
create or replace function public.consume_invite(p_code text)
returns jsonb
language plpgsql
as $$
declare
  arr jsonb;
  idx int;
  item jsonb;
  found_idx int := -1;
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select value into arr from public.draft_sync where key = 'draftnet_invites_v1' for update;
  if arr is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  for idx in 0 .. jsonb_array_length(arr) - 1 loop
    if lower((arr -> idx) ->> 'code') = lower(p_code) then
      found_idx := idx;
      exit;
    end if;
  end loop;

  if found_idx = -1 then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  item := arr -> found_idx;

  if (item ->> 'status') = 'deleted' then
    return jsonb_build_object('ok', false, 'reason', 'deleted');
  end if;
  if (item ->> 'status') = 'disabled' then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;
  if (item -> 'expiresAt') is not null
     and jsonb_typeof(item -> 'expiresAt') <> 'null'
     and (item ->> 'expiresAt')::bigint < now_ms then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if (item ->> 'usedCount')::int >= (item ->> 'maxUses')::int then
    return jsonb_build_object('ok', false, 'reason', 'exhausted');
  end if;

  item := jsonb_set(item, '{usedCount}', to_jsonb(((item ->> 'usedCount')::int + 1)));
  arr := jsonb_set(arr, array[found_idx::text], item);

  update public.draft_sync set value = arr, updated_at = now() where key = 'draftnet_invites_v1';

  return jsonb_build_object('ok', true, 'invite', item);
end;
$$;

-- ── Atomic account registration ─────────────────────────────────────────
-- Locks the accounts row so two people registering the same username at
-- the same moment can't both get created.
create or replace function public.register_account(p_account jsonb)
returns jsonb
language plpgsql
as $$
declare
  arr jsonb;
  uname text := lower(p_account ->> 'username');
  i int;
begin
  select value into arr from public.draft_sync where key = 'draftnet_accounts_v1' for update;
  if arr is null then
    arr := '[]'::jsonb;
  end if;

  for i in 0 .. jsonb_array_length(arr) - 1 loop
    if lower((arr -> i) ->> 'username') = uname then
      return jsonb_build_object('ok', false, 'reason', 'username_taken');
    end if;
  end loop;

  arr := arr || jsonb_build_array(p_account);
  update public.draft_sync set value = arr, updated_at = now() where key = 'draftnet_accounts_v1';

  return jsonb_build_object('ok', true);
end;
$$;

-- Let the anon (browser) role call these functions.
grant execute on function public.consume_invite(text) to anon, authenticated;
grant execute on function public.register_account(jsonb) to anon, authenticated;
```

That's it — no rows need to be pre-inserted. The app seeds
`draftnet_accounts_v1` with a default admin account and
`draftnet_tournament_v1` / `draftnet_invites_v1` with empty defaults the
first time it runs against a fresh project.

## 3. Install the client library

```bash
npm install @supabase/supabase-js
```

## 4. What changed in the app

- **`accounts`, `tournament`, `invites`** are no longer read from
  `localStorage` — they're rows in the `draft_sync` table. Every write goes
  through `supabase.from('draft_sync').upsert(...)`, and every client
  (any browser, any device, any IP) is subscribed to Postgres changes on
  that table via `supabase.channel(...).on('postgres_changes', ...)`, so
  updates appear everywhere within roughly the round-trip time of the
  websocket push — no polling, no per-device copies, no "refresh to see
  changes."
- **Invite redemption** and **account registration** now happen through the
  `consume_invite` / `register_account` Postgres functions above, which run
  inside a row lock — this closes the two race conditions that the
  original localStorage version could only reduce, not eliminate.
- **Login session** (`draftnet_session_v1`, i.e. "which account is *this*
  browser currently logged in as") intentionally stays in `localStorage`.
  That's correctly per-device — logging in on your phone shouldn't log you
  in on your laptop too — and is the only thing that should NOT be shared.

## 5. Verifying it works
Open the app in two different browsers (or a normal window + incognito
window, or two different devices on different networks). Log in as the
same or different accounts. Any admin action (start draft, make a pick,
create an invite, join the tournament) should appear on the other
window/device within a second or two, with no manual refresh.

## Known limitation / possible follow-up
`tournament` (draft picks, team assignments, bracket state) is still
stored as one JSON blob per key, updated via whole-document upsert. This is
simple and works well for the traffic pattern here (one admin driving the
draft at a time), but two admins editing different parts of the tournament
state in the same instant would still be last-write-wins. If you need
finer-grained concurrent editing of the tournament document itself (not
just invites/accounts), the next step would be to normalize `teams`,
`picks`, etc. into their own tables with row-level updates the same way
`consume_invite`/`register_account` do for invites/accounts.