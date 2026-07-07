// lib/auth.js
//
// Every action that mutates accounts or invites goes through one of the
// named functions below (never a raw supabase.from("accounts").update(...)
// from a component) — this is the "centralize database access" + "reusable
// API/helper functions" requirement in one place. Each function:
//   1. maps camelCase JS fields <-> snake_case Postgres columns
//   2. calls the matching RPC from supabase/schema.sql
//   3. throws a normal Error with a readable message on failure so callers
//      can just try/catch and show it in the UI
//
// Session handling: verify_login / register_with_invite return a
// session_token. We store *only that token* (not the password, not the
// hash) in localStorage. This is a per-device session identifier, not
// shared application data, so this is the one legitimate remaining use of
// localStorage in the app.

import { supabase } from "./supabaseClient";

const SESSION_KEY = "draft_app_session_token";

export function getSessionToken() {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}
function setSessionToken(token) {
  try { localStorage.setItem(SESSION_KEY, token); } catch {}
}
export function logout() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ── row <-> app-shape mapping ──────────────────────────────────────────
function mapAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarId: row.avatar_id,
    avatarUrl: row.avatar_url,
    role: row.role,
    enabled: row.enabled,
    source: row.source,
    isCaptain: row.is_captain,
    positions: row.positions ?? [],
    coreRole: row.core_role ?? [],
    joined: row.joined,
    inviteCodeUsed: row.invite_code,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
  };
}

export function mapInvite(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
  };
}

function rpcError(error, fallback) {
  // Postgres RAISE EXCEPTION messages come through as error.message,
  // typically prefixed like "invalid_credentials". Surface something readable.
  const code = error?.message?.match(/^[a-z_]+$/)?.[0] ?? error?.message;
  const known = {
    invalid_credentials: "用户名或密码错误。",
    account_disabled: "该账号已被禁用。",
    invite_invalid: "邀请码无效。",
    invite_expired: "该邀请码已过期。",
    invite_exhausted: "该邀请码已达到使用次数上限。",
    username_taken: "该用户名已被使用。",
    not_authorized: "没有权限执行此操作，请重新登录。",
    cannot_modify_self: "无法更改自己的账号。",
    cannot_delete_self: "无法删除自己的账号。",
    code_generation_failed: "生成邀请码失败，请重试。",
  };
  return new Error(known[code] || fallback || error?.message || "操作失败。");
}

// ── auth ────────────────────────────────────────────────────────────────
export async function login({ username, password }) {
  const { data, error } = await supabase.rpc("verify_login", { p_username: username, p_password: password });
  if (error) throw rpcError(error, "登录失败。");
  const row = Array.isArray(data) ? data[0] : data;
  setSessionToken(row.session_token);
  return mapAccount(row.account);
}

// Resolves the token stored in this browser back into an account, so a page
// refresh doesn't silently log the user out. Returns null (not an error) if
// there's no token, or it's expired/invalid — that's just "not logged in."
export async function restoreSession() {
  const token = getSessionToken();
  if (!token) return null;
  const { data, error } = await supabase.rpc("whoami", { p_session_token: token });
  if (error || !data) { logout(); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) { logout(); return null; }
  return mapAccount(row);
}

export async function register({ username, password, displayName, avatarUrl, inviteCode, isCaptain, coreRole, positions }) {
  const { data, error } = await supabase.rpc("register_with_invite", {
    p_username: username, p_password: password, p_display_name: displayName, p_avatar_url: avatarUrl,
    p_invite_code: inviteCode, p_is_captain: isCaptain, p_core_role: coreRole, p_positions: positions,
  });
  if (error) throw rpcError(error, "注册失败。");
  const row = Array.isArray(data) ? data[0] : data;
  setSessionToken(row.session_token);
  return mapAccount(row.account);
}

// ── admin: accounts ──────────────────────────────────────────────────────
export async function adminCreateAccount({ username, password, displayName, avatarUrl, isCaptain, coreRole, positions }) {
  const { data, error } = await supabase.rpc("admin_create_account", {
    p_session_token: getSessionToken(), p_username: username, p_password: password, p_display_name: displayName,
    p_avatar_url: avatarUrl, p_is_captain: isCaptain, p_core_role: coreRole, p_positions: positions,
  });
  if (error) throw rpcError(error, "创建选手失败。");
  return mapAccount(data);
}

export async function adminUpdateAccount(accountId, { displayName, avatarUrl, isCaptain, coreRole, positions }) {
  const { error } = await supabase.rpc("admin_update_account", {
    p_session_token: getSessionToken(), p_account_id: accountId, p_display_name: displayName,
    p_avatar_url: avatarUrl, p_is_captain: isCaptain, p_core_role: coreRole, p_positions: positions,
  });
  if (error) throw rpcError(error, "保存修改失败。");
}

export async function adminResetPassword(accountId, newPassword) {
  const { error } = await supabase.rpc("admin_reset_password", { p_session_token: getSessionToken(), p_account_id: accountId, p_new_password: newPassword });
  if (error) throw rpcError(error, "重置密码失败。");
}

export async function adminSetEnabled(accountId, enabled) {
  const { error } = await supabase.rpc("admin_set_enabled", { p_session_token: getSessionToken(), p_account_id: accountId, p_enabled: enabled });
  if (error) throw rpcError(error, "操作失败。");
}

export async function adminSetRole(accountId, role) {
  const { error } = await supabase.rpc("admin_set_role", { p_session_token: getSessionToken(), p_account_id: accountId, p_role: role });
  if (error) throw rpcError(error, "操作失败。");
}

export async function adminDeleteAccount(accountId) {
  const { error } = await supabase.rpc("admin_delete_account", { p_session_token: getSessionToken(), p_account_id: accountId });
  if (error) throw rpcError(error, "删除失败。");
}

// ── admin: invites ───────────────────────────────────────────────────────
export async function adminCreateInvite({ maxUses, expiresAt }) {
  const { data, error } = await supabase.rpc("admin_create_invite", {
    p_session_token: getSessionToken(), p_max_uses: maxUses, p_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
  });
  if (error) throw rpcError(error, "创建邀请码失败。");
  return mapInvite(data);
}

export async function adminSetInviteStatus(inviteId, status) {
  const { error } = await supabase.rpc("admin_set_invite_status", { p_session_token: getSessionToken(), p_invite_id: inviteId, p_status: status });
  if (error) throw rpcError(error, "操作失败。");
}

export async function adminDeleteInvite(inviteId) {
  const { error } = await supabase.rpc("admin_delete_invite", { p_session_token: getSessionToken(), p_invite_id: inviteId });
  if (error) throw rpcError(error, "删除失败。");
}

// ── self-service ─────────────────────────────────────────────────────────
export async function setMyJoined(joined) {
  const { error } = await supabase.rpc("set_my_joined", { p_session_token: getSessionToken(), p_joined: joined });
  if (error) throw rpcError(error, "操作失败。");
}

export async function adminResetAllJoined() {
  const { error } = await supabase.rpc("admin_reset_all_joined", { p_session_token: getSessionToken() });
  if (error) throw rpcError(error, "操作失败。");
}

export { mapAccount };
