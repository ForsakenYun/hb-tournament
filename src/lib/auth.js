import { supabase } from "./supabaseClient";

/* ════════════════════════════════════════════════════════════════════════
   AUTH — custom username/password accounts, invite-only registration.

   DraftDashboard.jsx does NOT use Supabase Auth (no supabase.auth.signIn
   anywhere) — it has its own `public_accounts` table with username/
   password, an admin role flag, and an `invites` table for invite-only
   registration, referencing server-side functions `register_with_invite`
   and `admin_create_invite` (see the comments in DraftDashboard.jsx around
   the invite-code system). Because password hashing and atomic invite
   use-counting must not happen with just the anon key on the client, this
   file assumes those operations are Postgres RPC functions (SECURITY
   DEFINER) that do the real work server-side, and this file is a thin
   client around them.

   The full list of RPCs this file expects to exist is documented at the
   bottom of this response — please verify/create them in Supabase before
   relying on this file. Function names/argument shapes are my best
   reconstruction from how DraftDashboard.jsx calls Auth.*; if your actual
   schema.sql used different names, just rename the `.rpc("...")` calls
   below to match.
   ════════════════════════════════════════════════════════════════════════ */

// Session token lives in sessionStorage only (tab-scoped, cleared when the
// browser is closed) — matches the comment in DraftDashboard.jsx that says
// closing the browser requires logging in again, and that this is the only
// browser storage used anywhere in the app.
const SESSION_KEY = "draftnet.session_token";

function getToken() {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
function setToken(token) {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* sessionStorage unavailable — ignore */ }
}

// Every RPC in this file returns either the row(s) it produced, or throws.
// Postgres/PostgREST errors land in `error.message`; we surface that
// directly since the RPC functions are expected to raise human-readable
// (Chinese) messages via `RAISE EXCEPTION` for things like "用户名已存在".
async function callRpc(name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message || "请求失败，请稍后重试。");
  return data;
}

function requireToken() {
  const token = getToken();
  if (!token) throw new Error("登录状态已失效，请重新登录。");
  return token;
}

/* ────────────────────────────────────────────────────────────────────────
   Row → app-shape mappers
   Convert snake_case Postgres rows into the camelCase shape
   DraftDashboard.jsx reads (see toPlayerShape / AccountCard / AuthScreen /
   InviteCodeManagement for the exact fields expected).
   ──────────────────────────────────────────────────────────────────────── */
export function mapAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarId: row.avatar_id ?? 0,
    avatarUrl: row.avatar_url ?? null,
    isCaptain: !!row.is_captain,
    positions: row.positions ?? [],
    coreRole: row.core_role ?? [],
    role: row.role ?? "player",
    enabled: row.enabled !== false,
    joined: !!row.joined,
    source: row.source ?? "self",
    inviteCodeUsed: row.invite_code_used ?? null,
  };
}

export function mapInvite(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    maxUses: row.max_uses,
    usedCount: row.used_count ?? 0,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    status: row.status ?? "active",
  };
}

/* ────────────────────────────────────────────────────────────────────────
   Session
   ──────────────────────────────────────────────────────────────────────── */

// Called once on app load. Resolves an existing sessionStorage token back
// into a live account row (page refresh / same-tab return visit). Returns
// null (never throws) so DraftDashboard's `sessionChecked` gate always
// resolves — an expired/invalid token just clears itself and falls back to
// the login screen instead of surfacing an error.
export async function restoreSession() {
  const token = getToken();
  if (!token) return null;
  try {
    const row = await callRpc("restore_session", { p_token: token });
    if (!row) { setToken(null); return null; }
    return mapAccount(Array.isArray(row) ? row[0] : row);
  } catch {
    setToken(null);
    return null;
  }
}

export async function login({ username, password }) {
  const result = await callRpc("login_with_password", {
    p_username: username,
    p_password: password,
  });
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || !row.token) throw new Error("用户名或密码错误。");
  setToken(row.token);
  return mapAccount(row.account ?? row);
}

// Invite-only self-registration. Validation of the invite code (active /
// not expired / not exhausted) plus the atomic use-count increment happens
// inside register_with_invite() in Postgres, per the comments in
// DraftDashboard.jsx — this function just forwards the form fields.
export async function register({
  username, password, displayName, avatarUrl, inviteCode, isCaptain, coreRole, positions,
}) {
  const result = await callRpc("register_with_invite", {
    p_username: username,
    p_password: password,
    p_display_name: displayName,
    p_avatar_url: avatarUrl || null,
    p_invite_code: inviteCode,
    p_is_captain: !!isCaptain,
    p_core_role: isCaptain ? [] : coreRole,
    p_positions: isCaptain ? [] : positions,
  });
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || !row.token) throw new Error("注册失败，请重试。");
  setToken(row.token);
  return mapAccount(row.account ?? row);
}

// Logout also un-joins the tournament for this account (best-effort — if it
// fails we still clear the local session so the user isn't stuck) and asks
// the server to invalidate the session token.
export async function logoutAndLeave() {
  const token = getToken();
  if (token) {
    try { await setMyJoined(false); } catch { /* best-effort */ }
    try { await callRpc("logout_session", { p_token: token }); } catch { /* best-effort */ }
  }
  setToken(null);
}

export async function setMyJoined(joined) {
  const token = requireToken();
  await callRpc("set_my_joined", { p_token: token, p_joined: !!joined });
}

/* ────────────────────────────────────────────────────────────────────────
   Admin — account management
   Every admin_* RPC is expected to check (server-side, using p_token) that
   the caller's account has role = 'admin' before doing anything, since the
   anon key alone can't be trusted to enforce that client-side.
   ──────────────────────────────────────────────────────────────────────── */
export async function adminCreateAccount({ username, password, displayName, avatarUrl, isCaptain, positions, coreRole }) {
  const token = requireToken();
  await callRpc("admin_create_account", {
    p_token: token,
    p_username: username,
    p_password: password,
    p_display_name: displayName,
    p_avatar_url: avatarUrl || null,
    p_is_captain: !!isCaptain,
    p_positions: positions,
    p_core_role: coreRole,
  });
}

export async function adminUpdateAccount(id, { displayName, isCaptain, positions, coreRole, avatarUrl }) {
  const token = requireToken();
  await callRpc("admin_update_account", {
    p_token: token,
    p_account_id: id,
    p_display_name: displayName,
    p_is_captain: !!isCaptain,
    p_positions: positions,
    p_core_role: coreRole,
    p_avatar_url: avatarUrl ?? null,
  });
}

export async function adminDeleteAccount(id) {
  const token = requireToken();
  await callRpc("admin_delete_account", { p_token: token, p_account_id: id });
}

export async function adminResetPassword(id, newPassword) {
  const token = requireToken();
  await callRpc("admin_reset_password", { p_token: token, p_account_id: id, p_new_password: newPassword });
}

export async function adminSetEnabled(id, enabled) {
  const token = requireToken();
  await callRpc("admin_set_enabled", { p_token: token, p_account_id: id, p_enabled: !!enabled });
}

export async function adminSetRole(id, role) {
  const token = requireToken();
  await callRpc("admin_set_role", { p_token: token, p_account_id: id, p_role: role });
}

// Clears the "joined" flag on every account — used by End Tournament /
// Reset Tournament in AdminDashboard so all Captains/Players have to click
// "Join Tournament" again for the next draft.
export async function adminResetAllJoined() {
  const token = requireToken();
  await callRpc("admin_reset_all_joined", { p_token: token });
}

/* ────────────────────────────────────────────────────────────────────────
   Admin — invite codes
   ──────────────────────────────────────────────────────────────────────── */
export async function adminCreateInvite({ maxUses, expiresAt }) {
  const token = requireToken();
  await callRpc("admin_create_invite", {
    p_token: token,
    p_max_uses: maxUses,
    p_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
  });
}

export async function adminSetInviteStatus(id, status) {
  const token = requireToken();
  await callRpc("admin_set_invite_status", { p_token: token, p_invite_id: id, p_status: status });
}

export async function adminDeleteInvite(id) {
  const token = requireToken();
  await callRpc("admin_delete_invite", { p_token: token, p_invite_id: id });
}
