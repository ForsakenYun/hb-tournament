import React, { useState, useEffect, useRef, useMemo } from "react";

/* ════════════════════════════════════════════════════════════════════════
   CONSTANTS & THEME (unchanged from original)
   ════════════════════════════════════════════════════════════════════════ */
const TEAL = "#00f5d4";
const TEAL_DIM = "#0d3b38";
const TEAL_SOFT = "#7df3e1";
const CORE_ROLE_COLOR = "#f59e0b";
const CAPTAIN_ID = 0;

const POSITIONS = [
  { id: 1, label: "1号位", name: "Carry" },
  { id: 2, label: "2号位", name: "Mid" },
  { id: 3, label: "3号位", name: "Offlane" },
  { id: 4, label: "4号位", name: "Soft Support" },
  { id: 5, label: "5号位", name: "Hard Support" },
];

const TEAM_COLORS = ["#00f5d4","#22d3ee","#2dd4bf","#5eead4","#06b6d4","#0ea5e9","#34d399","#67e8f9"];

const genUid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// NOTE: this is a lightweight client-side obfuscation, NOT real cryptographic
// hashing. There is no server in this app, so there is no way to keep
// credentials truly secure. Before using this in production, replace the
// accounts/session logic in this file with real API calls to a backend that
// hashes passwords with bcrypt/argon2 and issues real session tokens.
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(36)}`;
}

const DEFAULT_AVATAR_ID = 0;
const DEFAULT_AVATAR = {
  id: 0, label: "Hex", color: "#00f5d4",
  render: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" stroke={color} strokeWidth="2" fill={`${color}20`}/>
      <circle cx="20" cy="20" r="6" fill={color} fillOpacity="0.7"/>
    </svg>
  ),
};

const REAL_CAPTAINS = [
  { name: "YYF-月夜枫" }, { name: "谢斌DD" }, { name: "LongDD-黄翔" }, { name: "Zhou陈尧" },
  { name: "刘嘉俊Sylar1" }, { name: "小刘_qq" }, { name: "守护我方蛋饼" }, { name: "ok林仔" },
];

const REAL_TEAMMATES = [
  { name: "塔利亚",        coreRole: [4,5], positions: [1] },
  { name: "徐杰",          coreRole: [1],   positions: [3,4,5] },
  { name: "果小果是个弟弟", coreRole: [5],   positions: [4] },
  { name: "艾琳",          coreRole: [5],   positions: [4] },
  { name: "啊雅Midori",    coreRole: [4],   positions: [5] },
  { name: "三酒",          coreRole: [1],   positions: [2,3,4,5] },
  { name: "南风",          coreRole: [3],   positions: [2] },
  { name: "ZippO宝哥",     coreRole: [3,4,5], positions: [1,2] },
  { name: "苏科大",        coreRole: [2],   positions: [1,3] },
  { name: "icon冷少",      coreRole: [2],   positions: [1] },
  { name: "憨憨",          coreRole: [3,4], positions: [1,5] },
  { name: "zard1991",      coreRole: [3],   positions: [2] },
  { name: "老蔡",          coreRole: [3],   positions: [4] },
  { name: "炸毛张",        coreRole: [3],   positions: [4,5] },
  { name: "林九鸽",        coreRole: [3,4], positions: [2] },
  { name: "棋迷",          coreRole: [3],   positions: [4,5] },
  { name: "蛋糕",          coreRole: [5],   positions: [1] },
  { name: "赤小兔",        coreRole: [5],   positions: [4] },
  { name: "九朵",          coreRole: [3],   positions: [1] },
  { name: "甜瓜",          coreRole: [4],   positions: [5] },
  { name: "森宝森",        coreRole: [5],   positions: [4] },
  { name: "F91",           coreRole: [2],   positions: [4,5] },
  { name: "狗哥",          coreRole: [1,2,4,5], positions: [3] },
  { name: "小蝴蝶",        coreRole: [2,3], positions: [4,5] },
  { name: "sed",           coreRole: [1,2], positions: [3] },
  { name: "doinb",         coreRole: [3],   positions: [1] },
  { name: "奥特曼",        coreRole: [5],   positions: [4] },
  { name: "茜茜",          coreRole: [4],   positions: [5] },
  { name: "汐狸",          coreRole: [4],   positions: [5] },
  { name: "小黑",          coreRole: [3],   positions: [1,2] },
  { name: "焙宝",          coreRole: [5],   positions: [4] },
  { name: "小色",          coreRole: [4,5], positions: [3] },
];

function buildDefaultAdmin() {
  return {
    id: genUid("acct"), username: "admin", passwordHash: simpleHash("admin123"),
    displayName: "锦标赛管理员", avatarId: DEFAULT_AVATAR_ID, avatarUrl: null,
    role: "admin", enabled: true, source: "admin",
    isCaptain: false, positions: [], coreRole: [], joined: false, createdAt: Date.now(),
  };
}

function buildDemoAccounts() {
  const accounts = [];
  REAL_CAPTAINS.forEach((c, i) => {
    accounts.push({
      id: genUid("acct"), username: `captain${i + 1}`, passwordHash: simpleHash("demo123"),
      displayName: c.name, avatarId: DEFAULT_AVATAR_ID, avatarUrl: null,
      role: "player", enabled: true, source: "admin",
      isCaptain: true, positions: [CAPTAIN_ID], coreRole: [],
      joined: false, createdAt: Date.now(),
    });
  });
  REAL_TEAMMATES.forEach((t, i) => {
    accounts.push({
      id: genUid("acct"), username: `player${i + 1}`, passwordHash: simpleHash("demo123"),
      displayName: t.name, avatarId: DEFAULT_AVATAR_ID, avatarUrl: null,
      role: "player", enabled: true, source: "admin",
      isCaptain: false, positions: t.positions, coreRole: t.coreRole,
      joined: false, createdAt: Date.now(),
    });
  });
  return accounts;
}

function initialTournament() {
  return {
    teams: [],
    pickIndex: 0,
    pool: null,
    lastPick: null,
    draftPhase: "captain",
    captainCandidates: [],
    roundOrders: ["12345678", "87654321", "12345678", "87654321"],
    roundOrdersLocked: false,
    round1: { matches: null },
    wb: { pool: null, matches: null, champion: null },
    lb: { pool: null, matches: null, finalists: null },
  };
}

function toPlayerShape(a) {
  return {
    id: a.id, name: a.displayName,
    positions: a.isCaptain ? [CAPTAIN_ID] : a.positions,
    coreRole: a.coreRole, avatarId: a.avatarId, avatarUrl: a.avatarUrl,
  };
}

function posLabel(positions) {
  if (!Array.isArray(positions) || positions.length === 0) return "";
  return positions.map((p) => (p === CAPTAIN_ID ? "队长" : `${p}号位`)).join(" ");
}
function coreRoleLabel(coreRole) {
  if (!coreRole || coreRole.length === 0) return "";
  return coreRole.map((r) => { const f = POSITIONS.find((p) => p.id === r); return f ? f.label : "?"; }).join(" ");
}

/* ════════════════════════════════════════════════════════════════════════
   PERSISTENCE — localStorage-backed "shared" state with cross-tab sync.
   This simulates a live multi-user backend without one. Swap this hook's
   internals for real API calls + websockets/polling when wiring up a
   real server; every consumer below only depends on [state, setState].
   ════════════════════════════════════════════════════════════════════════ */
const STORAGE_KEYS = {
  accounts: "draftnet_accounts_v1",
  tournament: "draftnet_tournament_v1",
  session: "draftnet_session_v1",
  invites: "draftnet_invites_v1",
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function useSyncedState(key, initialValue) {
  const [state, setState] = useState(() => readStorage(key, initialValue));
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === key && e.newValue) {
        try { setState(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    const interval = setInterval(() => {
      const raw = readStorage(key, null);
      if (raw && JSON.stringify(raw) !== JSON.stringify(stateRef.current)) setState(raw);
    }, 1500);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(interval); };
  }, [key]);

  const update = (updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeStorage(key, next);
      return next;
    });
  };
  return [state, update];
}

/* ════════════════════════════════════════════════════════════════════════
   INVITE CODE SYSTEM — invite-only registration
   Every account (other than admin-created ones) must be created via a
   valid, active, non-expired, non-exhausted invite code. Codes are managed
   entirely by admins: create, set usage limit, optional expiry, view usage,
   disable, or delete.
   ════════════════════════════════════════════════════════════════════════ */
function genInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

function buildInvite({ maxUses, expiresAt, createdBy }) {
  return {
    id: genUid("inv"),
    code: genInviteCode(),
    maxUses: Math.max(1, parseInt(maxUses, 10) || 1),
    usedCount: 0,
    expiresAt: expiresAt || null, // epoch ms or null = never expires
    status: "active", // active | disabled | deleted
    createdBy: createdBy || null,
    createdAt: Date.now(),
  };
}

// Returns null if the invite is currently usable, otherwise a human-readable
// reason it cannot be used. This is always computed dynamically (never
// trusted from a stale flag) so exhausted/expired codes are rejected even if
// their status field was never explicitly changed.
function inviteRejectReason(inv) {
  if (!inv) return "邀请码无效。";
  if (inv.status === "deleted") return "该邀请码已不存在。";
  if (inv.status === "disabled") return "该邀请码已被禁用。";
  if (inv.expiresAt && Date.now() > inv.expiresAt) return "该邀请码已过期。";
  if (inv.usedCount >= inv.maxUses) return "该邀请码已达到使用次数上限。";
  return null;
}

function isInviteUsable(inv) { return inviteRejectReason(inv) === null; }

function inviteStatusLabel(inv) {
  if (inv.status === "deleted") return { key: "deleted", label: "已删除", color: "#6b7280" };
  if (inv.status === "disabled") return { key: "disabled", label: "已禁用", color: "#f87171" };
  if (inv.expiresAt && Date.now() > inv.expiresAt) return { key: "expired", label: "已过期", color: "#f59e0b" };
  if (inv.usedCount >= inv.maxUses) return { key: "used-up", label: "已用完", color: "#a78bfa" };
  return { key: "active", label: "生效中", color: "#22c55e" };
}

/* ════════════════════════════════════════════════════════════════════════
   DRAFT / TOURNAMENT HELPERS (shared by admin + spectator views)
   ════════════════════════════════════════════════════════════════════════ */
function parseRoundOrder(str) {
  const cleaned = (str || "").replace(/\s/g, "");
  const tokens = cleaned.includes(",") ? cleaned.split(",").map((s) => parseInt(s, 10) - 1) : cleaned.split("").map((ch) => parseInt(ch, 10) - 1);
  return tokens.filter((n) => !isNaN(n) && n >= 0 && n <= 7);
}

function computeDraftMeta(t) {
  const roundOrderValid = t.roundOrders.map((str) => { const p = parseRoundOrder(str); return p.length === 8 && new Set(p).size === 8; });
  const customSnakeOrder = t.roundOrders.flatMap((str, ri) => parseRoundOrder(str).map((teamIdx) => ({ round: ri + 1, teamIdx })));
  const allCaptainsAssigned = t.teams.length === 8 && t.teams.every((tm) => tm.captain !== null);
  const draftFinished = t.draftPhase === "teammate" && t.pickIndex >= customSnakeOrder.length;
  const currentPick = t.draftPhase === "teammate" && !draftFinished ? customSnakeOrder[t.pickIndex] : null;
  const activeTeamIdx = currentPick ? currentPick.teamIdx : -1;
  const roundLabel = currentPick ? currentPick.round : t.roundOrders.length;
  return { roundOrderValid, customSnakeOrder, allCaptainsAssigned, draftFinished, currentPick, activeTeamIdx, roundLabel };
}

// Returns one of: waiting | live-draft | final-teams | current-matches | bracket | grand-final | champion
function getStage(t) {
  if (!t.teams || t.teams.length !== 8) return "waiting";
  const meta = computeDraftMeta(t);
  if (!meta.draftFinished) return "live-draft";
  const { round1, wb, lb } = t;
  if (!round1.matches) return "final-teams";
  const round1Decided = round1.matches.every((m) => m.winner);
  if (!round1Decided) return "current-matches";
  if (wb.champion != null) return "champion";
  if (wb.matches && wb.matches.length === 1 && wb.champion == null) return "grand-final";
  return "bracket";
}

const STAGE_LABELS = {
  waiting: "等待选手加入",
  "live-draft": "选秀进行中",
  "final-teams": "最终战队",
  "current-matches": "当前赛程",
  bracket: "对阵图",
  "grand-final": "总决赛",
  champion: "锦标赛冠军",
};

/* ════════════════════════════════════════════════════════════════════════
   PRESENTATIONAL PRIMITIVES (unchanged visual language)
   ════════════════════════════════════════════════════════════════════════ */
function CoreRoleBadge({ coreRole }) {
  if (!Array.isArray(coreRole) || coreRole.length === 0) return null;
  return (
    <span className="inline-block text-xs font-bold px-2.5 py-1 rounded"
      style={{ background: `${CORE_ROLE_COLOR}22`, color: CORE_ROLE_COLOR, border: `1px solid ${CORE_ROLE_COLOR}55` }}>
      {coreRoleLabel(coreRole)}
    </span>
  );
}
function SubRoleBadge({ positions }) {
  const label = posLabel(positions);
  if (!label) return null;
  return (
    <span className="inline-block text-xs font-bold px-2.5 py-1 rounded"
      style={{ background: "rgba(0,245,212,0.08)", color: TEAL, border: `1px solid ${TEAL}55` }}>
      {label}
    </span>
  );
}
function CaptainBadge() {
  return (
    <span className="inline-block text-xs font-bold px-2.5 py-1 rounded"
      style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.4)" }}>
      队长
    </span>
  );
}
function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
      style={isAdmin
        ? { background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.4)" }
        : { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.4)" }}>
      {isAdmin ? "管理员" : "选手"}
    </span>
  );
}
function StatusBadge({ enabled }) {
  return (
    <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
      style={enabled
        ? { background: "rgba(0,245,212,0.1)", color: TEAL_SOFT, border: `1px solid ${TEAL_DIM}` }
        : { background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" }}>
      {enabled ? "已启用" : "已禁用"}
    </span>
  );
}
function SourceBadge({ source }) {
  return (
    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
      {source === "self" ? "自行注册" : "管理员创建"}
    </span>
  );
}

function Avatar({ avatarId = DEFAULT_AVATAR_ID, avatarUrl = null, size = 36, glow = false }) {
  const fallbackColor = DEFAULT_AVATAR.color;
  if (avatarUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "10px", flexShrink: 0,
        border: glow ? `1.5px solid ${TEAL}` : `1px solid ${TEAL_DIM}`,
        boxShadow: glow ? `0 0 12px ${TEAL}66` : "none",
        overflow: "hidden", background: "#000",
      }}>
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "10px", flexShrink: 0,
      background: `${fallbackColor}15`,
      border: glow ? `1.5px solid ${fallbackColor}` : `1px solid ${fallbackColor}44`,
      boxShadow: glow ? `0 0 12px ${fallbackColor}66` : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {DEFAULT_AVATAR.render(size * 0.8, fallbackColor)}
    </div>
  );
}

function GlowHeading({ children, size = "text-2xl", className = "" }) {
  return (
    <h1 className={`${size} font-black tracking-wide text-white ${className}`}
      style={{ textShadow: "0 0 6px rgba(0,245,212,0.9), 0 0 18px rgba(0,245,212,0.55), 0 0 42px rgba(0,245,212,0.3)", letterSpacing: "0.04em" }}>
      {children}
    </h1>
  );
}
function PillButton({ active, children, onClick, disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`rounded-full font-bold transition-all duration-150 border ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
      style={active
        ? { background: TEAL, color: "#000", borderColor: TEAL, boxShadow: "0 0 16px rgba(0,245,212,0.8)" }
        : disabled
        ? { background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.05)", cursor: "not-allowed" }
        : { background: "rgba(0,0,0,0.4)", color: TEAL_SOFT, borderColor: TEAL_DIM }
      }
      onMouseEnter={(e) => { if (!active && !disabled) { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = "#fff"; } }}
      onMouseLeave={(e) => { if (!active && !disabled) { e.currentTarget.style.borderColor = TEAL_DIM; e.currentTarget.style.color = TEAL_SOFT; } }}
    >{children}</button>
  );
}
// Shared Captain / Core Role / Sub Role selector — used identically on the
// Registration form and the Admin Dashboard's Create/Edit Player form so
// every role field has the same width, height, font size, padding, and
// label styling everywhere in the app.
function RoleFieldSet({ isCaptain, coreRole, positions, onToggleCaptain, onToggleCoreRole, onTogglePosition }) {
  const roleLabelClass = "block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5";
  const roleButtonClass = "rounded-full font-bold border px-3 py-1.5 text-xs transition-all";
  return (
    <>
      <label className={roleLabelClass}>队长身份</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button type="button" onClick={onToggleCaptain}
          className={roleButtonClass}
          style={isCaptain
            ? { background: "#16a34a", color: "#fff", borderColor: "#22c55e", boxShadow: "0 0 14px rgba(34,197,94,0.7)" }
            : { background: "rgba(0,0,0,0.4)", color: "#4a7c59", borderColor: "#1a3d28" }}>
          队长
        </button>
      </div>

      <label className={roleLabelClass}>主要位置</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {POSITIONS.map((p) => {
          const isActive = !isCaptain && coreRole.includes(p.id);
          return (
            <button key={p.id} type="button" disabled={isCaptain} onClick={() => onToggleCoreRole(p.id)}
              className={roleButtonClass}
              style={isCaptain
                ? { background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.06)", cursor: "not-allowed" }
                : isActive
                ? { background: CORE_ROLE_COLOR, color: "#000", borderColor: CORE_ROLE_COLOR, boxShadow: `0 0 12px ${CORE_ROLE_COLOR}99` }
                : { background: "rgba(0,0,0,0.4)", color: "#c97d20", borderColor: "#7a4a10" }}>
              {p.label}
            </button>
          );
        })}
      </div>

      <label className={roleLabelClass}>备选位置</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {POSITIONS.map((p) => (
          <PillButton key={p.id} small active={!isCaptain && positions.includes(p.id)} disabled={isCaptain} onClick={() => onTogglePosition(p.id)}>
            {p.label}
          </PillButton>
        ))}
      </div>
    </>
  );
}
function PrimaryButton({ children, onClick, disabled, variant = "solid", className = "" }) {
  const [hover, setHover] = useState(false);
  const solidStyle = { background: `linear-gradient(to bottom, ${TEAL}, #00c2a8)`, color: "#000", borderColor: TEAL, boxShadow: hover ? "0 0 32px rgba(0,245,212,0.95)" : "0 0 22px rgba(0,245,212,0.65)", transform: hover ? "translateY(-2px)" : "translateY(0)" };
  const ghostStyle = { background: "rgba(0,0,0,0.4)", color: hover ? "#fff" : TEAL_SOFT, borderColor: hover ? TEAL : TEAL_DIM };
  const dangerStyle = { background: hover ? "rgba(248,113,113,0.18)" : "rgba(0,0,0,0.4)", color: "#f87171", borderColor: "#5a1414" };
  const style = variant === "solid" ? solidStyle : variant === "danger" ? dangerStyle : ghostStyle;
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={`px-6 py-3 rounded-xl font-extrabold tracking-wide text-sm uppercase transition-all duration-150 border ${className}`}
      style={{ ...style, opacity: disabled ? 0.3 : 1, cursor: disabled ? "not-allowed" : "pointer", transform: disabled ? "translateY(0)" : (style.transform || "translateY(0)") }}>
      {children}
    </button>
  );
}
function PanelFrame({ children, className = "" }) {
  return (
    <div className={`relative rounded-2xl border ${className}`}
      style={{ background: "linear-gradient(to bottom, #0a1414, #060a0a)", borderColor: "rgba(0,245,212,0.25)", boxShadow: "0 0 0 1px rgba(0,245,212,0.06), 0 0 24px rgba(0,245,212,0.08)" }}>
      {children}
    </div>
  );
}
function RollButton({ children, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="px-5 py-3 rounded-xl font-extrabold tracking-wide text-sm uppercase transition-all duration-150 border"
      style={{ background: "linear-gradient(to bottom, #a78bfa, #7c3aed)", color: "#fff", borderColor: "#a78bfa",
        boxShadow: hover ? "0 0 32px rgba(167,139,250,0.95)" : "0 0 22px rgba(167,139,250,0.65)",
        transform: hover ? "translateY(-2px)" : "translateY(0)" }}>
      {children}
    </button>
  );
}

function TeamCard({ team, activeTeamIdx, teamIdx, useCaptainName = false }) {
  const isActive = activeTeamIdx === teamIdx;
  const color = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
  const displayName = useCaptainName && team.captain ? `${team.captain.name}的战队` : `${teamIdx + 1}号战队`;
  return (
    <PanelFrame className={`p-3 mb-3 transition-all duration-300 ${isActive ? "scale-[1.03]" : ""}`}>
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ boxShadow: isActive ? `0 0 0 2px ${color}, 0 0 26px ${color}99` : "none", transition: "box-shadow 0.3s" }} />
      <div className="relative mb-2">
        <div className="text-center px-6">
          <span className="text-[11px] font-black tracking-widest truncate inline-block max-w-full" style={{ color, textShadow: `0 0 8px ${color}99`, textTransform: useCaptainName ? "none" : "uppercase" }}>{displayName}</span>
        </div>
        {isActive && <span className="absolute top-1/2 right-0 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse flex-shrink-0" style={{ background: TEAL, color: "#000" }}>选人中</span>}
      </div>
      <div className="flex items-center gap-2 mb-2 p-1.5 rounded-lg bg-black/40 border border-white/5">
        {team.captain ? (
          <>
            <Avatar avatarId={team.captain.avatarId} avatarUrl={team.captain.avatarUrl} size={34} glow />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-white truncate">{team.captain.name}</div>
              <div className="mt-0.5"><CaptainBadge /></div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <div className="w-[34px] h-[34px] rounded-lg border border-dashed border-white/15 flex items-center justify-center text-white/20 text-xs flex-shrink-0">?</div>
            <span className="text-[11px] italic text-white/25">等待队长</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        {team.slots.map((slot, i) => (
          <div key={i} className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] ${slot ? "bg-black/30" : "bg-black/10 border-dashed border-white/10 text-white/25"}`}
            style={slot ? { borderColor: TEAL_DIM } : {}}>
            <span className="w-6 h-5 flex items-center justify-center rounded text-[9px] font-bold flex-shrink-0"
              style={{ background: slot ? `${color}22` : "transparent", color: slot ? color : "#3a4a4a", border: `1px solid ${slot ? color+"55" : "#1c2b2e"}` }}>
              {POSITIONS[i % 5]?.id ?? "?"}
            </span>
            {slot ? (
              <>
                <Avatar avatarId={slot.avatarId} avatarUrl={slot.avatarUrl} size={20} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-white text-[10px]">{slot.name}</div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <CoreRoleBadge coreRole={slot.coreRole} />
                    <SubRoleBadge positions={slot.positions} />
                  </div>
                </div>
              </>
            ) : <span className="italic">空位</span>}
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&display=swap');
      .font-display { font-family: 'Orbitron', sans-serif; }
      ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #060a0a; }
      ::-webkit-scrollbar-thumb { background: ${TEAL_DIM}; border-radius: 4px; }
      input::placeholder { color: rgba(255,255,255,0.2); }
      input:focus { outline: none; border-color: ${TEAL} !important; box-shadow: 0 0 10px rgba(0,245,212,0.4); }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
  );
}

function AvatarUploadField({ avatarUrl, setAvatarUrl }) {
  const handleAvatarFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result);
    reader.readAsDataURL(file);
  };
  const inputId = useRef(`avatar-upload-${genUid()}`).current;
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{
          width: 52, height: 52,
          background: avatarUrl ? "#000" : `${DEFAULT_AVATAR.color}15`,
          border: `1.5px solid ${avatarUrl ? TEAL : DEFAULT_AVATAR.color + "44"}`,
          boxShadow: avatarUrl ? `0 0 12px ${TEAL}66` : "none",
        }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="头像预览" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : DEFAULT_AVATAR.render(38, DEFAULT_AVATAR.color)}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId}
          className="cursor-pointer rounded-lg font-bold border px-3 py-2 text-xs transition-all inline-block text-center"
          style={{ background: "rgba(0,0,0,0.4)", color: TEAL_SOFT, borderColor: TEAL_DIM }}>
          ⬆ 上传图片
        </label>
        <input id={inputId} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
        {avatarUrl && (
          <button onClick={() => setAvatarUrl(null)} className="text-[10px] underline text-left" style={{ color: "rgba(255,255,255,0.35)" }}>
            移除图片
          </button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   AUTH SCREEN — Login / Register
   ════════════════════════════════════════════════════════════════════════ */
function AuthScreen({ onLogin, onRegister, error }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);
  const [coreRole, setCoreRole] = useState([]);
  const [positions, setPositions] = useState([]);

  // Same role rule as the Admin Dashboard's player form: a player is either
  // a Captain, or a non-captain with at least one Core Role selected (Sub
  // Role is optional either way). Picking Captain clears core/sub role and
  // vice versa, since a player can't be a captain and a drafted role at once.
  const toggleCaptainRole = () => { setIsCaptain((v) => !v); setPositions([]); setCoreRole([]); };
  const toggleCoreRoleId = (id) => {
    setIsCaptain(false);
    setCoreRole((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id].sort((a, b) => a - b));
    setPositions((prev) => prev.filter((p) => p !== id));
  };
  const togglePositionId = (id) => {
    setIsCaptain(false);
    setPositions((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].sort((a, b) => a - b));
    setCoreRole((prev) => prev.filter((r) => r !== id));
  };

  const roleValid = isCaptain || coreRole.length > 0;

  const submit = () => {
    if (mode === "login") onLogin({ username: username.trim(), password });
    else onRegister({
      username: username.trim(), password, confirmPassword, displayName: displayName.trim(), avatarUrl, inviteCode: inviteCode.trim(),
      isCaptain, coreRole, positions,
    });
  };

  const submitDisabled = !username.trim() || !password || (mode === "register" && (!displayName.trim() || !inviteCode.trim() || !roleValid));

  // Let Enter submit the form from either the username or password field,
  // exactly like clicking the Login/Create Account button (including
  // respecting the same disabled/validation conditions).
  const handleFieldKeyDown = (e) => {
    if (e.key === "Enter" && !submitDisabled) submit();
  };

  const switchMode = (m) => {
    setMode(m); setUsername(""); setPassword(""); setConfirmPassword(""); setDisplayName(""); setAvatarUrl(null); setInviteCode("");
    setIsCaptain(false); setCoreRole([]); setPositions([]);
  };

  return (
    <div className="min-h-screen w-full text-white font-sans flex items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse at top, #0b1716 0%, #050807 55%, #020303 100%)" }}>
      <GlobalStyle />
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-9 h-9 rounded-md flex items-center justify-center font-display font-black"
            style={{ background: TEAL, color: "#000", boxShadow: "0 0 18px rgba(0,245,212,0.8)" }}>D</div>
          <span className="font-display font-bold tracking-[0.2em] text-sm" style={{ color: TEAL_SOFT }}>DRAFTNET // DOTA 5v5</span>
        </div>
        <PanelFrame className="p-6">
          <div className="flex gap-2 mb-5">
            <div className="flex-1"><PillButton active={mode === "login"} onClick={() => switchMode("login")}>登录</PillButton></div>
            <div className="flex-1"><PillButton active={mode === "register"} onClick={() => switchMode("register")}>注册</PillButton></div>
          </div>

          {mode === "register" && (
            <>
              <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">邀请码</label>
              <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="例如 AB3D-EFGH"
                className="w-full mb-1 px-3 py-2 rounded-lg text-sm text-white border bg-black/50 font-mono tracking-wider" style={{ borderColor: TEAL_DIM }} />
              <p className="text-[10px] text-white/30 mb-3">注册需要邀请码。请向管理员获取有效邀请码后再创建账号。</p>

              <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">昵称</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="其他选手将看到的名称"
                className="w-full mb-3 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />
              <label className="block text-[10px] font-bold text-white/50 mb-2 uppercase tracking-wider">头像（可选）</label>
              <AvatarUploadField avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl} />

              <RoleFieldSet isCaptain={isCaptain} coreRole={coreRole} positions={positions}
                onToggleCaptain={toggleCaptainRole} onToggleCoreRole={toggleCoreRoleId} onTogglePosition={togglePositionId} />
              {!roleValid && <p className="text-[10px] text-white/30 mb-3">请选择队长身份，或至少一个主要位置。</p>}
            </>
          )}

          <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">用户名</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={handleFieldKeyDown} placeholder="用户名"
            className="w-full mb-3 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />

          <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">密码</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleFieldKeyDown} placeholder="密码"
            className="w-full mb-3 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />

          {mode === "register" && (
            <>
              <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">确认密码</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={handleFieldKeyDown} placeholder="请再次输入密码"
                className="w-full mb-3 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />
            </>
          )}

          {error && <div className="text-[11px] font-bold text-center mb-3" style={{ color: "#f87171" }}>{error}</div>}

          <PrimaryButton onClick={submit} disabled={submitDisabled} className="w-full">
            {mode === "login" ? "登录" : "创建账号"}
          </PrimaryButton>
        </PanelFrame>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   NAV BAR
   ════════════════════════════════════════════════════════════════════════ */
function NavBar({ currentUser, view, setView, onLogout }) {
  return (
    <div className="sticky top-0 z-20 backdrop-blur-md border-b" style={{ background: "rgba(0,0,0,0.6)", borderColor: TEAL_DIM }}>
      <div className="max-w-[1700px] mx-auto px-5 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center font-display font-black"
            style={{ background: TEAL, color: "#000", boxShadow: "0 0 18px rgba(0,245,212,0.8)" }}>D</div>
          <span className="font-display font-bold tracking-[0.2em] text-sm" style={{ color: TEAL_SOFT }}>DRAFTNET // DOTA 5v5</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentUser.role === "admin" && (
            <PillButton small active={view === "admin"} onClick={() => setView("admin")}>⚙ 管理员后台</PillButton>
          )}
          {(currentUser.role === "player" || currentUser.role === "admin") && (
            <PillButton small active={view === "home"} onClick={() => setView("home")}>🏠 主页</PillButton>
          )}
          <PillButton small active={view === "spectator"} onClick={() => setView("spectator")}>📺 观众视图</PillButton>
        </div>
        <div className="flex items-center gap-2">
          <Avatar avatarId={currentUser.avatarId} avatarUrl={currentUser.avatarUrl} size={30} />
          <div className="text-right">
            <div className="text-[11px] font-bold text-white leading-none">{currentUser.displayName}</div>
            <div className="mt-0.5"><RoleBadge role={currentUser.role} /></div>
          </div>
          <button onClick={onLogout} className="ml-2 text-[10px] px-3 py-1.5 rounded-lg border font-bold"
            style={{ borderColor: "#5a1414", color: "#f87171", background: "rgba(0,0,0,0.3)" }}>退出登录</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ACCOUNT CARD — used in Admin Player Management
   ════════════════════════════════════════════════════════════════════════ */
function AccountCard({ account, onEdit, onDelete, onResetPassword, onToggleEnabled, onToggleRole, isSelf }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="relative flex flex-col gap-2 p-3 rounded-xl border bg-black/40" style={{ borderColor: TEAL_DIM }}>
      <div className="flex items-center gap-2.5">
        <Avatar avatarId={account.avatarId} avatarUrl={account.avatarUrl} size={40} glow={account.isCaptain} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white truncate">{account.displayName}</div>
          <div className="text-[10px] text-white/40 truncate">@{account.username}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <RoleBadge role={account.role} />
        <StatusBadge enabled={account.enabled} />
        <SourceBadge source={account.source} />
        {account.joined && (
          <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{ background: "rgba(0,245,212,0.1)", color: TEAL, border: `1px solid ${TEAL}55` }}>已加入</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {account.isCaptain
          ? <CaptainBadge />
          : <><CoreRoleBadge coreRole={account.coreRole} /><SubRoleBadge positions={account.positions} /></>}
        {!account.isCaptain && (!account.coreRole || account.coreRole.length === 0) && (
          <span className="text-[10px] italic text-white/30">尚未设置选秀角色</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-1 pt-2 border-t border-white/5">
        <button onClick={() => onEdit(account)} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ borderColor: TEAL_DIM, color: TEAL_SOFT }}>✏ 编辑</button>
        <button onClick={() => onResetPassword(account)} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ borderColor: "#7a4a10", color: "#c97d20" }}>🔑 重置密码</button>
        <button onClick={() => onToggleEnabled(account)} disabled={isSelf} title={isSelf ? "无法禁用自己的账号" : undefined}
          className="text-[10px] px-2 py-1 rounded-lg border font-bold disabled:opacity-30 disabled:cursor-not-allowed"
          style={account.enabled ? { borderColor: "#5a1414", color: "#f87171" } : { borderColor: "rgba(34,197,94,0.4)", color: "#22c55e" }}>
          {account.enabled ? "⛔ 禁用" : "✓ 启用"}
        </button>
        <button onClick={() => onToggleRole(account)} disabled={isSelf} title={isSelf ? "无法更改自己的角色" : undefined}
          className="text-[10px] px-2 py-1 rounded-lg border font-bold disabled:opacity-30 disabled:cursor-not-allowed" style={{ borderColor: "rgba(167,139,250,0.4)", color: "#a78bfa" }}>
          {account.role === "admin" ? "↓ 降级为选手" : "↑ 提升为管理员"}
        </button>

        {isSelf ? (
          <span className="text-[10px] text-white/25 italic" title="登录状态下无法删除自己的账号">🔒 删除（本人）</span>
        ) : confirmingDelete ? (
          <>
            <span className="text-[10px] text-white/50 font-bold">确定删除该账号？</span>
            <button onClick={() => { onDelete(account); setConfirmingDelete(false); }} className="text-[10px] px-2 py-1 rounded-lg border font-bold"
              style={{ background: "rgba(248,113,113,0.15)", borderColor: "#f87171", color: "#f87171" }}>✓ 是，删除</button>
            <button onClick={() => setConfirmingDelete(false)} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ borderColor: TEAL_DIM, color: TEAL_SOFT }}>取消</button>
          </>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ borderColor: "#5a1414", color: "#ff8080" }}>× 删除</button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ADMIN — PLAYER MANAGEMENT (replaces + extends the old Create Player page)
   ════════════════════════════════════════════════════════════════════════ */
function AdminPlayerManagement({ accounts, setAccounts, currentUser }) {
  const emptyForm = { username: "", password: "", displayName: "", isCaptain: false, positions: [], coreRole: [], avatarUrl: null };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetValue, setResetValue] = useState("");
  const [filter, setFilter] = useState("all");
  const [usernameError, setUsernameError] = useState("");

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setUsernameError(""); };

  const toggleCaptain = () => setForm((f) => ({ ...f, isCaptain: !f.isCaptain, positions: [], coreRole: [] }));
  const togglePosition = (id) => setForm((f) => ({ ...f, isCaptain: false, positions: f.positions.includes(id) ? f.positions.filter((p) => p !== id) : [...f.positions, id].sort((a, b) => a - b), coreRole: f.coreRole.filter((r) => r !== id) }));
  const toggleCoreRole = (id) => setForm((f) => ({ ...f, isCaptain: false, coreRole: f.coreRole.includes(id) ? f.coreRole.filter((r) => r !== id) : [...f.coreRole, id].sort((a, b) => a - b), positions: f.positions.filter((p) => p !== id) }));

  const submitForm = () => {
    if (!form.displayName.trim()) return;
    if (!form.isCaptain && form.coreRole.length === 0) return;
    if (editingId) {
      setAccounts((prev) => prev.map((a) => a.id === editingId ? {
        ...a, displayName: form.displayName.trim(), isCaptain: form.isCaptain,
        positions: form.isCaptain ? [CAPTAIN_ID] : [...form.positions],
        coreRole: [...form.coreRole], avatarUrl: form.avatarUrl || null,
      } : a));
      resetForm();
    } else {
      if (!form.username.trim() || !form.password) { setUsernameError("需要填写用户名和密码才能为该选手创建登录账号。"); return; }
      if (accounts.some((a) => a.username.toLowerCase() === form.username.trim().toLowerCase())) { setUsernameError("该用户名已被使用。"); return; }
      const newAccount = {
        id: genUid("acct"), username: form.username.trim(), passwordHash: simpleHash(form.password),
        displayName: form.displayName.trim(), avatarId: DEFAULT_AVATAR_ID, avatarUrl: form.avatarUrl || null,
        role: "player", enabled: true, source: "admin",
        isCaptain: form.isCaptain, positions: form.isCaptain ? [CAPTAIN_ID] : [...form.positions],
        coreRole: [...form.coreRole], joined: false, createdAt: Date.now(),
      };
      setAccounts((prev) => [...prev, newAccount]);
      resetForm();
    }
  };

  const editAccount = (a) => {
    setForm({ username: a.username, password: "", displayName: a.displayName, isCaptain: a.isCaptain, positions: a.isCaptain ? [] : [...(a.positions || [])], coreRole: [...(a.coreRole || [])], avatarUrl: a.avatarUrl || null });
    setEditingId(a.id);
    setUsernameError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Confirmation and self-account guards are handled inline in AccountCard's
  // UI (disabled buttons + an inline confirm step) rather than via
  // window.confirm/alert, since sandboxed preview environments commonly
  // block native browser dialogs — which silently swallows the click and
  // makes the button look completely unresponsive.
  const deleteAccount = (a) => {
    setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    if (editingId === a.id) resetForm();
  };

  const openResetPassword = (a) => { setResetTarget(a); setResetValue(""); };
  const confirmResetPassword = () => {
    if (!resetValue) return;
    setAccounts((prev) => prev.map((a) => a.id === resetTarget.id ? { ...a, passwordHash: simpleHash(resetValue) } : a));
    setResetTarget(null); setResetValue("");
  };

  const toggleEnabled = (a) => {
    if (a.id === currentUser.id) return;
    setAccounts((prev) => prev.map((x) => x.id === a.id ? { ...x, enabled: !x.enabled } : x));
  };

  const toggleRole = (a) => {
    if (a.id === currentUser.id) return;
    setAccounts((prev) => prev.map((x) => x.id === a.id ? { ...x, role: x.role === "admin" ? "player" : "admin" } : x));
  };

  const [confirmingDemoRoster, setConfirmingDemoRoster] = useState(false);
  const loadDemoRoster = () => {
    setAccounts((prev) => [...prev, ...buildDemoAccounts()]);
    setConfirmingDemoRoster(false);
  };

  const visibleAccounts = accounts.filter((a) => filter === "all" ? true : filter === "admins" ? a.role === "admin" : filter === "captains" ? a.isCaptain : filter === "unassigned" ? (!a.isCaptain && (!a.coreRole || a.coreRole.length === 0)) : a.role === "player");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      <PanelFrame className="p-4 h-fit">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xs font-bold tracking-widest" style={{ color: editingId ? CORE_ROLE_COLOR : TEAL }}>
            {editingId ? "✏ 编辑选手" : "创建选手"}
          </h2>
          {editingId && <button onClick={resetForm} className="text-[10px] underline" style={{ color: "rgba(255,255,255,0.35)" }}>取消</button>}
        </div>

        {!editingId && (
          <>
            <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">用户名（登录用）</label>
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="用户名"
              className="w-full mb-3 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />
            <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">临时密码</label>
            <input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="临时密码"
              className="w-full mb-3 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />
          </>
        )}

        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">昵称</label>
        <input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="选手名称"
          className="w-full mb-3 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />

        <label className="block text-[10px] font-bold text-white/50 mb-2 uppercase tracking-wider">头像</label>
        <AvatarUploadField avatarUrl={form.avatarUrl} setAvatarUrl={(url) => setForm((f) => ({ ...f, avatarUrl: url }))} />

        <RoleFieldSet isCaptain={form.isCaptain} coreRole={form.coreRole} positions={form.positions}
          onToggleCaptain={toggleCaptain} onToggleCoreRole={toggleCoreRole} onTogglePosition={togglePosition} />

        {usernameError && <div className="text-[11px] font-bold mb-2" style={{ color: "#f87171" }}>{usernameError}</div>}

        <PrimaryButton onClick={submitForm} disabled={!form.displayName.trim() || (!form.isCaptain && form.coreRole.length === 0)} className="w-full">
          {editingId ? "✓ 保存修改" : "+ 创建选手"}
        </PrimaryButton>

        {confirmingDemoRoster ? (
          <div className="w-full mt-3 flex items-center gap-1.5">
            <span className="text-[10px] text-white/50 font-bold flex-1">添加8名队长 + 32名队员？</span>
            <button onClick={loadDemoRoster} className="text-[10px] px-2 py-1.5 rounded-lg border font-bold" style={{ background: "rgba(0,245,212,0.12)", borderColor: TEAL, color: TEAL }}>✓ 是</button>
            <button onClick={() => setConfirmingDemoRoster(false)} className="text-[10px] px-2 py-1.5 rounded-lg border font-bold" style={{ borderColor: TEAL_DIM, color: TEAL_SOFT }}>取消</button>
          </div>
        ) : (
          <button onClick={() => setConfirmingDemoRoster(true)} className="w-full mt-3 text-[10px] px-3 py-2 rounded-lg border" style={{ borderColor: TEAL_DIM, color: TEAL_SOFT, background: "rgba(0,0,0,0.3)" }}>
            ↻ 加载演示名单（8名队长 + 32名队员）
          </button>
        )}
      </PanelFrame>

      <div className="space-y-4">
        <PanelFrame className="p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-display text-xs font-bold tracking-widest" style={{ color: TEAL }}>所有注册选手（{accounts.length}）</h2>
            <div className="flex gap-1.5 flex-wrap">
              {[["all", "全部"], ["players", "选手"], ["captains", "队长"], ["unassigned", "未分配"], ["admins", "管理员"]].map(([key, label]) => (
                <PillButton key={key} small active={filter === key} onClick={() => setFilter(key)}>{label}</PillButton>
              ))}
            </div>
          </div>
          {visibleAccounts.length === 0 ? (
            <div className="py-10 text-center text-white/30 text-sm">没有符合筛选条件的账号。</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleAccounts.map((a) => (
                <AccountCard key={a.id} account={a} onEdit={editAccount} onDelete={deleteAccount} onResetPassword={openResetPassword} onToggleEnabled={toggleEnabled} onToggleRole={toggleRole} isSelf={a.id === currentUser.id} />
              ))}
            </div>
          )}
        </PanelFrame>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <PanelFrame className="p-5 w-full max-w-sm">
            <h3 className="font-display text-sm font-bold tracking-widest mb-3" style={{ color: TEAL }}>重置密码 —— {resetTarget.displayName}</h3>
            <input type="text" value={resetValue} onChange={(e) => setResetValue(e.target.value)} placeholder="新密码"
              className="w-full mb-4 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />
            <div className="flex gap-2">
              <PrimaryButton variant="ghost" onClick={() => setResetTarget(null)}>取消</PrimaryButton>
              <PrimaryButton onClick={confirmResetPassword} disabled={!resetValue}>设置密码</PrimaryButton>
            </div>
          </PanelFrame>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ADMIN — DRAFT CONTROL (screen 2 logic, unchanged, driven by admin only)
   ════════════════════════════════════════════════════════════════════════ */
function DraftSequenceStrip({ customSnakeOrder, pickIndex, roundOrders, draftFinished }) {
  return (
    <PanelFrame className="p-4 mb-4 overflow-x-auto">
      <div className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(125,243,225,0.4)" }}>
        完整选秀顺序 —— 共{roundOrders.length}轮 {customSnakeOrder.length}个选人顺位
      </div>
      <div className="flex flex-row items-center gap-1 flex-wrap">
        {customSnakeOrder.map((pick, idx) => {
          const isPast = idx < pickIndex; const isCurrent = idx === pickIndex;
          const isRoundStart = idx === 0 || pick.round !== customSnakeOrder[idx-1].round;
          return (
            <React.Fragment key={idx}>
              {isRoundStart && idx > 0 && <div className="flex items-center mx-1"><div className="w-px h-7" style={{ background: "rgba(0,245,212,0.2)" }} /></div>}
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <span className="text-[7px] font-black tracking-wider" style={{ color: isRoundStart ? "rgba(0,245,212,0.45)" : "transparent" }}>{isRoundStart ? `R${pick.round}` : "."}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black transition-all duration-200"
                  style={isCurrent ? { background: "rgba(74,222,128,0.18)", color: "#4ade80", border: "1.5px solid rgba(74,222,128,0.75)", boxShadow: "0 0 10px rgba(74,222,128,0.8)", transform: "scale(1.25)" }
                    : isPast ? { background: "transparent", color: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.04)" }
                    : { background: "rgba(0,245,212,0.03)", color: "rgba(0,245,212,0.3)", border: "1px solid rgba(0,245,212,0.1)" }}>
                  {pick.teamIdx+1}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {draftFinished && <span className="ml-3 text-[12px] font-black" style={{ color: "#4ade80" }}>✓ 已完成</span>}
      </div>
    </PanelFrame>
  );
}

function AdminDraftControl({ captainPool, draftPool, tournament, setTournament, onBack, onProceed }) {
  const [selectedCaptain, setSelectedCaptain] = useState(null);
  const [draftHistory, setDraftHistory] = useState([]);

  const { teams, pickIndex, pool, lastPick, draftPhase, captainCandidates, roundOrders, roundOrdersLocked } = tournament;
  const meta = computeDraftMeta(tournament);
  const { roundOrderValid, customSnakeOrder, allCaptainsAssigned, draftFinished, currentPick, activeTeamIdx, roundLabel } = meta;
  const allDrafted = draftFinished;

  const saveSnapshot = () => ({ teams: JSON.parse(JSON.stringify(teams)), pool: pool ? [...pool] : null, captainCandidates: [...captainCandidates], selectedCaptain, pickIndex, draftPhase, lastPick });

  const handleCaptainClick = (captain) => setSelectedCaptain((prev) => prev?.id === captain.id ? null : captain);

  const handleTeamSlotClick = (teamIdx) => {
    if (!selectedCaptain || teams[teamIdx]?.captain) return;
    setDraftHistory((h) => [...h, saveSnapshot()]);
    setTournament((prev) => {
      const next = prev.teams.map((t) => ({ ...t }));
      next[teamIdx] = { ...next[teamIdx], captain: selectedCaptain };
      return { ...prev, teams: next, captainCandidates: prev.captainCandidates.filter((c) => c.id !== selectedCaptain.id), lastPick: { player: selectedCaptain, teamIdx, phase: "captain" } };
    });
    setSelectedCaptain(null);
  };

  const startTeammateDraft = () => { if (!allCaptainsAssigned || !roundOrderValid.every(Boolean)) return; setTournament((prev) => ({ ...prev, draftPhase: "teammate", pickIndex: 0, roundOrdersLocked: true })); };

  const pickPlayer = (player) => {
    if (draftPhase !== "teammate" || draftFinished) return;
    setDraftHistory((h) => [...h, saveSnapshot()]);
    const teamIdx = activeTeamIdx;
    setTournament((prev) => {
      const next = prev.teams.map((t) => ({ ...t, slots: [...t.slots] }));
      const slotIdx = next[teamIdx].slots.findIndex((s) => s === null);
      if (slotIdx === -1) return prev;
      next[teamIdx].slots[slotIdx] = player;
      return { ...prev, teams: next, pool: prev.pool.filter((p) => p.id !== player.id), lastPick: { player, teamIdx, phase: "teammate", round: currentPick?.round }, pickIndex: prev.pickIndex + 1 };
    });
  };

  const undoLastPick = () => {
    if (draftHistory.length === 0) return;
    const prevSnap = draftHistory[draftHistory.length - 1];
    setTournament((prev) => ({ ...prev, teams: prevSnap.teams, pool: prevSnap.pool, captainCandidates: prevSnap.captainCandidates, pickIndex: prevSnap.pickIndex, draftPhase: prevSnap.draftPhase, lastPick: prevSnap.lastPick, roundOrdersLocked: prevSnap.draftPhase === "captain" ? false : prev.roundOrdersLocked }));
    setSelectedCaptain(prevSnap.selectedCaptain);
    setDraftHistory((h) => h.slice(0, -1));
  };

  const setRoundOrders = (updater) => setTournament((prev) => ({ ...prev, roundOrders: typeof updater === "function" ? updater(prev.roundOrders) : updater }));

  if (teams.length !== 8) return <div className="flex items-center justify-center h-[60vh] text-white/40">加载中…</div>;

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-6">
      <PanelFrame className="p-4 mb-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col gap-2 flex-shrink-0">
            <PrimaryButton variant="ghost" onClick={onBack}>← 返回选手管理</PrimaryButton>
            <button onClick={undoLastPick} disabled={draftHistory.length === 0}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all"
              style={{ background: draftHistory.length > 0 ? "rgba(251,191,36,0.08)" : "rgba(0,0,0,0.2)", borderColor: draftHistory.length > 0 ? "#fbbf2466" : "rgba(255,255,255,0.06)", color: draftHistory.length > 0 ? "#fbbf24" : "rgba(255,255,255,0.15)", cursor: draftHistory.length === 0 ? "not-allowed" : "pointer", boxShadow: draftHistory.length > 0 ? "0 0 10px rgba(251,191,36,0.2)" : "none" }}>
              ↩ 撤销上一次选择
              {draftHistory.length > 0 && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-black" style={{ background: "#fbbf2422", color: "#fbbf24" }}>{draftHistory.length}</span>}
            </button>
          </div>
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[10px] font-black px-3 py-0.5 rounded-full tracking-widest"
                style={{ background: draftPhase === "captain" ? "rgba(34,197,94,0.12)" : "rgba(0,245,212,0.12)", color: draftPhase === "captain" ? "#22c55e" : TEAL, border: `1px solid ${draftPhase === "captain" ? "rgba(34,197,94,0.4)" : TEAL+"55"}` }}>
                {draftPhase === "captain" ? "⭐ 第一阶段 —— 队长分配" : "👥 第二阶段 —— 队员选秀"}
              </span>
            </div>
            {draftPhase === "captain" ? (
              <><GlowHeading size="text-xl" className="font-display">{selectedCaptain ? `将 ${selectedCaptain.name.toUpperCase()} 分配到战队` : "选择一名队长"}</GlowHeading>
              <div className="text-[11px] text-white/40 mt-1">{selectedCaptain ? "现在点击一个空的战队位置 →" : `剩余${captainCandidates.length}人 · 已分配${8-captainCandidates.length}/8`}</div></>
            ) : allDrafted ? <GlowHeading size="text-xl" className="font-display">全部选手已选完 🏆</GlowHeading> : (
              <><div className="text-[11px] tracking-[0.3em] font-bold mb-1" style={{ color: "rgba(125,243,225,0.6)" }}>第{roundLabel}轮，共{roundOrders.length}轮</div>
              <GlowHeading size="text-xl" className="font-display">{teams[activeTeamIdx]?.captain?.name?.toUpperCase()} 的选人回合</GlowHeading>
              <div className="text-[11px] text-white/40 mt-1">战队{activeTeamIdx+1} · 第{pickIndex+1}/{customSnakeOrder.length}顺位</div></>
            )}
          </div>
          <div className="flex-shrink-0">
            <PrimaryButton onClick={onProceed} disabled={!allDrafted}>进入最终对阵 →</PrimaryButton>
          </div>
        </div>
        <div className="mt-4 flex gap-2 items-center text-[9px] text-white/30">
          <span className="w-16 text-right">队长</span>
          <div className="w-36 h-1.5 rounded-full bg-black/50 overflow-hidden border" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
            <div className="h-full transition-all duration-500" style={{ width: `${((8-captainCandidates.length)/8)*100}%`, background: "linear-gradient(to right,#16a34a,#22c55e)", boxShadow: "0 0 8px #22c55e" }} />
          </div>
          <span className="w-20 text-center">队员</span>
          <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden border" style={{ borderColor: TEAL_DIM }}>
            <div className="h-full transition-all duration-500" style={{ width: draftPhase === "teammate" ? `${(pickIndex/customSnakeOrder.length)*100}%` : "0%", background: `linear-gradient(to right,${TEAL},#0ea5e9)`, boxShadow: "0 0 8px #00f5d4" }} />
          </div>
        </div>
        {lastPick && <div className="text-center text-[10px] text-white/30 mt-2">上一步：<span style={{ color: TEAL_SOFT }}>{lastPick.player.name}</span>{lastPick.phase === "captain" ? ` → 战队${lastPick.teamIdx+1}（队长）` : ` → 战队${lastPick.teamIdx+1}`}</div>}
      </PanelFrame>

      {!roundOrdersLocked && (
        <PanelFrame className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="font-display text-sm font-bold tracking-widest" style={{ color: TEAL }}>队员选秀顺序设置</h2>
              <p className="text-[11px] text-white/30 mt-0.5">无需逗号分隔 —— 例如 <span className="font-mono" style={{ color: TEAL_SOFT }}>12345678</span></p>
            </div>
            <button onClick={() => setRoundOrders(["12345678","87654321","12345678","87654321"])}
              className="text-[10px] px-3 py-1.5 rounded-lg border" style={{ borderColor: TEAL_DIM, color: TEAL_SOFT, background: "rgba(0,0,0,0.3)" }}>↺ 恢复默认蛇形顺序</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roundOrders.map((val, ri) => (
              <div key={ri}>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: roundOrderValid[ri] ? TEAL : "#f87171" }}>
                  第{ri+1}轮 {roundOrderValid[ri] ? "✓" : "⚠"}
                </label>
                <input value={val} onChange={(e) => setRoundOrders((prev) => prev.map((v,i) => i===ri ? e.target.value : v))}
                  placeholder="例如 12345678" maxLength={20}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white border bg-black/50 font-mono tracking-widest"
                  style={{ borderColor: roundOrderValid[ri] ? TEAL_DIM : "#f8717166" }} />
              </div>
            ))}
          </div>
        </PanelFrame>
      )}

      {draftPhase === "captain" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <PanelFrame className="p-4">
            <h2 className="font-display text-sm font-bold tracking-widest mb-3" style={{ color: "#22c55e" }}>⭐ 队长候选池（{captainCandidates.length}人未分配）</h2>
            <p className="text-[11px] text-white/30 mb-3">点击选择，然后点击一个空的战队位置 →</p>
            <div className="grid grid-cols-2 gap-2">
              {captainCandidates.map((c) => {
                const isSel = selectedCaptain?.id === c.id;
                return (
                  <button key={c.id} onClick={() => handleCaptainClick(c)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all"
                    style={{ background: isSel ? "rgba(34,197,94,0.12)" : "rgba(0,0,0,0.5)", borderColor: isSel ? "#22c55e" : "rgba(34,197,94,0.25)", boxShadow: isSel ? "0 0 18px rgba(34,197,94,0.4)" : "none", transform: isSel ? "scale(1.02)" : "scale(1)" }}>
                    <Avatar avatarId={c.avatarId ?? DEFAULT_AVATAR_ID} avatarUrl={c.avatarUrl} size={36} glow={isSel} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-white truncate">{c.name}</div>
                      <div className="mt-0.5"><CaptainBadge /></div>
                    </div>
                    {isSel && <span className="flex-shrink-0 text-[9px] font-black" style={{ color: "#22c55e" }}>✓</span>}
                  </button>
                );
              })}
              {captainCandidates.length === 0 && <div className="col-span-2 flex flex-col items-center py-8 text-white/30 text-center"><div className="text-3xl mb-2">✅</div><div className="text-sm">所有队长已分配完毕！</div></div>}
            </div>
          </PanelFrame>
          <PanelFrame className="p-4">
            <h2 className="font-display text-sm font-bold tracking-widest mb-3" style={{ color: TEAL }}>战队位置 {selectedCaptain ? `—— 分配给"${selectedCaptain.name}"` : ""}</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {teams.map((team, idx) => {
                const color = TEAM_COLORS[idx]; const canAssign = !team.captain && !!selectedCaptain;
                return (
                  <button key={idx} onClick={() => handleTeamSlotClick(idx)} disabled={!!team.captain || !selectedCaptain}
                    className="flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all"
                    style={{ background: team.captain ? "rgba(0,0,0,0.4)" : canAssign ? `${color}11` : "rgba(0,0,0,0.2)", borderColor: team.captain ? color : canAssign ? color : "rgba(255,255,255,0.08)", borderStyle: team.captain ? "solid" : "dashed", boxShadow: canAssign ? `0 0 12px ${color}44` : "none", cursor: team.captain ? "default" : canAssign ? "pointer" : "not-allowed" }}>
                    <span className="w-6 h-6 flex items-center justify-center rounded text-[10px] font-black flex-shrink-0" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>{idx+1}</span>
                    {team.captain ? (
                      <><Avatar avatarId={team.captain.avatarId ?? DEFAULT_AVATAR_ID} avatarUrl={team.captain.avatarUrl} size={26} glow />
                      <div className="min-w-0"><div className="text-[11px] font-bold text-white truncate">{team.captain.name}</div>
                      <div className="mt-0.5"><CaptainBadge /></div></div></>
                    ) : <span className="text-[11px] italic" style={{ color: canAssign ? color : "rgba(255,255,255,0.2)" }}>{canAssign ? "→ 分配到此处" : "空位"}</span>}
                  </button>
                );
              })}
            </div>
            {allCaptainsAssigned && (
              <button onClick={startTeammateDraft} disabled={!roundOrderValid.every(Boolean)}
                className="w-full py-3 rounded-xl font-extrabold tracking-widest text-sm uppercase border transition-all"
                style={{ background: roundOrderValid.every(Boolean) ? `linear-gradient(to bottom,${TEAL},#00c2a8)` : "rgba(0,0,0,0.3)", color: roundOrderValid.every(Boolean) ? "#000" : "rgba(255,255,255,0.2)", borderColor: roundOrderValid.every(Boolean) ? TEAL : "rgba(255,255,255,0.08)", boxShadow: roundOrderValid.every(Boolean) ? "0 0 22px rgba(0,245,212,0.65)" : "none", cursor: roundOrderValid.every(Boolean) ? "pointer" : "not-allowed" }}>
                {roundOrderValid.every(Boolean) ? "🚀 锁定并开始队员选秀 →" : "⚠ 请先修正轮次顺序"}
              </button>
            )}
          </PanelFrame>
        </div>
      )}

      {draftPhase === "teammate" && (
        <>
          <DraftSequenceStrip customSnakeOrder={customSnakeOrder} pickIndex={pickIndex} roundOrders={roundOrders} draftFinished={allDrafted} />
          <PanelFrame className="p-4 mb-4">
            <h2 className="font-display text-sm font-bold tracking-widest mb-3" style={{ color: TEAL }}>👥 待选选手（{pool?.length ?? 0}）</h2>
            {pool && pool.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {pool.map((p) => (
                  <button key={p.id} onClick={() => pickPlayer(p)} disabled={allDrafted}
                    className="flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all"
                    style={{ background: "rgba(0,0,0,0.4)", borderColor: TEAL_DIM, opacity: allDrafted ? 0.3 : 1, cursor: allDrafted ? "not-allowed" : "pointer" }}>
                    <Avatar avatarId={p.avatarId ?? DEFAULT_AVATAR_ID} avatarUrl={p.avatarUrl} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-white truncate">{p.name}</div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <CoreRoleBadge coreRole={p.coreRole} /><SubRoleBadge positions={p.positions} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-white/30">
                <div className="text-4xl mb-2">🏆</div>
                <div className="font-display text-sm tracking-widest">选秀完成</div>
              </div>
            )}
          </PanelFrame>
        </>
      )}

      <div className="mb-3"><h2 className="font-display text-sm font-bold tracking-widest" style={{ color: TEAL }}>全部8支战队</h2></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {teams.map((team, i) => <TeamCard key={i} team={team} activeTeamIdx={activeTeamIdx} teamIdx={i} />)}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MATCH BLOCK — shared render for round1 / winner bracket / loser bracket.
   Pass onPick=null for a read-only (spectator) rendering.
   ════════════════════════════════════════════════════════════════════════ */
function teamNameFor(teams, idx) {
  const cap = teams[idx]?.captain;
  return cap ? `${cap.name}的战队` : `${idx + 1}号战队`;
}

function MatchBlock({ label, match, onPick, teams, keyPrefix }) {
  const { a, b, winner } = match;
  const decided = winner != null;
  const renderSide = (idx, side) => {
    const lost = decided && winner !== side;
    const won = decided && winner === side;
    return (
      <div className="min-w-0 flex flex-col gap-2">
        <div className="relative" style={{ opacity: lost ? 0.35 : 1, filter: lost ? "grayscale(70%)" : "none", transition: "all 0.3s" }}>
          {won && <div className="absolute -top-2 -right-2 z-10 text-xl">🏆</div>}
          <TeamCard team={teams[idx]} activeTeamIdx={-1} teamIdx={idx} useCaptainName />
        </div>
        {!decided && (onPick
          ? <PrimaryButton onClick={() => onPick(side)}>获胜方：{teamNameFor(teams, idx)}</PrimaryButton>
          : <div className="text-center text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg border" style={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.08)" }}>⏳ 等待结果</div>
        )}
      </div>
    );
  };
  return (
    <PanelFrame className="p-4" key={keyPrefix}>
      <div className="text-center text-[11px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: "#a78bfa" }}>{label}</div>
      <div className="text-center text-sm font-bold text-white mb-3">{teamNameFor(teams, a)} vs {teamNameFor(teams, b)}</div>
      <div className="grid grid-cols-2 gap-3 items-start">
        {renderSide(a, "a")}
        {renderSide(b, "b")}
      </div>
      {decided && (
        <div className="text-center mt-3 text-[11px] font-bold" style={{ color: "#4ade80" }}>
          ✓ {teamNameFor(teams, winner === "a" ? a : b)} 晋级
        </div>
      )}
    </PanelFrame>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ADMIN — BRACKET CONTROL (screen 3 logic, unchanged, admin only)
   ════════════════════════════════════════════════════════════════════════ */
function AdminBracketControl({ tournament, setTournament, onBack, onEndTournament }) {
  const { teams, round1, wb, lb } = tournament;
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const shuffleIndices = (arr) => {
    const s = [...arr];
    for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
    return s;
  };
  const pairUp = (arr) => { const matches = []; for (let i = 0; i < arr.length; i += 2) matches.push({ a: arr[i], b: arr[i + 1], winner: null }); return matches; };

  const rollRound1 = () => setTournament((prev) => ({ ...prev, round1: { matches: pairUp(shuffleIndices(prev.teams.map((_, i) => i))) } }));

  const pickRound1Winner = (matchIdx, side) => {
    setTournament((prev) => {
      const matches = prev.round1.matches.map((m, i) => (i === matchIdx ? { ...m, winner: side } : m));
      let nextWb = prev.wb, nextLb = prev.lb;
      if (matches.every((m) => m.winner)) {
        const winners = matches.map((m) => (m.winner === "a" ? m.a : m.b));
        const losers = matches.map((m) => (m.winner === "a" ? m.b : m.a));
        nextWb = { pool: winners, matches: null, champion: null };
        nextLb = { pool: losers, matches: null, finalists: null };
      }
      return { ...prev, round1: { matches }, wb: nextWb, lb: nextLb };
    });
  };

  const rollSubBracket = (key) => setTournament((prev) => ({ ...prev, [key]: { ...prev[key], pool: null, matches: pairUp(shuffleIndices(prev[key].pool)) } }));

  const pickWbWinner = (matchIdx, side) => {
    setTournament((prev) => {
      const matches = prev.wb.matches.map((m, i) => (i === matchIdx ? { ...m, winner: side } : m));
      if (matches.every((m) => m.winner)) {
        const winners = matches.map((m) => (m.winner === "a" ? m.a : m.b));
        if (winners.length === 1) return { ...prev, wb: { pool: null, matches: null, champion: winners[0] } };
        if (winners.length === 2) return { ...prev, wb: { pool: null, matches: [{ a: winners[0], b: winners[1], winner: null }], champion: null } };
        return { ...prev, wb: { pool: winners, matches: null, champion: null } };
      }
      return { ...prev, wb: { ...prev.wb, matches } };
    });
  };

  const pickLbWinner = (matchIdx, side) => {
    setTournament((prev) => {
      const matches = prev.lb.matches.map((m, i) => (i === matchIdx ? { ...m, winner: side } : m));
      if (matches.every((m) => m.winner)) {
        const winners = matches.map((m) => (m.winner === "a" ? m.a : m.b));
        if (winners.length === 1) return { ...prev, lb: { pool: null, matches: null, finalists: winners } };
        if (winners.length === 2) return { ...prev, lb: { pool: null, matches: [{ a: winners[0], b: winners[1], winner: null }], finalists: null } };
        return { ...prev, lb: { pool: winners, matches: null, finalists: null } };
      }
      return { ...prev, lb: { ...prev.lb, matches } };
    });
  };

  const resetTournament = () => setTournament((prev) => ({ ...prev, round1: { matches: null }, wb: { pool: null, matches: null, champion: null }, lb: { pool: null, matches: null, finalists: null } }));

  const round1Decided = round1.matches != null && round1.matches.every((m) => m.winner);
  const stage = wb.champion != null ? "champion" : round1Decided ? "brackets" : round1.matches != null ? "round1" : "teams";

  const renderWbBracket = () => {
    if (wb.champion != null) {
      return (
        <div className="flex flex-col gap-3 items-center">
          <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#facc15" }}>胜者组冠军</div>
          <div className="w-full max-w-sm"><TeamCard team={teams[wb.champion]} activeTeamIdx={-1} teamIdx={wb.champion} useCaptainName /></div>
          <div className="text-2xl">🏆</div>
        </div>
      );
    }
    if (wb.matches == null) {
      return (
        <div className="flex flex-col gap-3 items-center">
          <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#a78bfa" }}>胜者组</div>
          <div className="grid grid-cols-2 gap-2 w-full max-w-md">
            {(wb.pool || []).map((idx) => (
              <div key={idx} className="rounded-lg border px-3 py-2 text-center text-[11px] font-bold truncate"
                style={{ borderColor: `${TEAM_COLORS[idx % TEAM_COLORS.length]}55`, color: TEAM_COLORS[idx % TEAM_COLORS.length] }}>{teamNameFor(teams, idx)}</div>
            ))}
          </div>
          <RollButton onClick={() => rollSubBracket("wb")}>🎲 生成胜者组对阵</RollButton>
        </div>
      );
    }
    const isFinal = wb.matches.length === 1;
    return (
      <div className="flex flex-col gap-4">
        <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#a78bfa" }}>胜者组</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {wb.matches.map((m, i) => <MatchBlock key={`wb-${i}`} label={isFinal ? "胜者组 —— 决赛" : `胜者组 —— 第${i + 1}场`} match={m} onPick={(side) => pickWbWinner(i, side)} teams={teams} keyPrefix={`wb-${i}`} />)}
        </div>
      </div>
    );
  };

  const renderLbBracket = () => {
    if (lb.finalists != null) {
      return (
        <div className="flex flex-col gap-3 items-center">
          <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#4ade80" }}>败者组亚军</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            {lb.finalists.map((idx) => <TeamCard key={idx} team={teams[idx]} activeTeamIdx={-1} teamIdx={idx} useCaptainName />)}
          </div>
        </div>
      );
    }
    if (lb.matches == null) {
      return (
        <div className="flex flex-col gap-3 items-center">
          <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#a78bfa" }}>败者组</div>
          <div className="grid grid-cols-2 gap-2 w-full max-w-md">
            {(lb.pool || []).map((idx) => (
              <div key={idx} className="rounded-lg border px-3 py-2 text-center text-[11px] font-bold truncate"
                style={{ borderColor: `${TEAM_COLORS[idx % TEAM_COLORS.length]}55`, color: TEAM_COLORS[idx % TEAM_COLORS.length] }}>{teamNameFor(teams, idx)}</div>
            ))}
          </div>
          <RollButton onClick={() => rollSubBracket("lb")}>🎲 生成败者组对阵</RollButton>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#a78bfa" }}>败者组</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {lb.matches.map((m, i) => <MatchBlock key={`lb-${i}`} label={`败者组 —— 第${i + 1}场`} match={m} onPick={(side) => pickLbWinner(i, side)} teams={teams} keyPrefix={`lb-${i}`} />)}
        </div>
      </div>
    );
  };

  if (teams.length !== 8) return <div className="flex items-center justify-center h-[60vh] text-white/40">加载中…</div>;

  return (
    <div className="max-w-[1700px] mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <GlowHeading size="text-3xl" className="font-display">最终战队与对阵总览</GlowHeading>
          <p className="text-white/40 text-sm mt-1">
            {stage === "teams" && "8支已选满的5v5战队。生成对阵以开始第一轮。"}
            {stage === "round1" && "第一轮 —— 选出每场比赛的获胜方以继续。"}
            {stage === "brackets" && "第一轮已结束。胜者组决出冠军；败者组比赛至决出亚军。"}
            {stage === "champion" && "锦标赛已结束。"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stage !== "teams" && <PrimaryButton variant="ghost" onClick={resetTournament}>↺ 重置对阵</PrimaryButton>}
          <PrimaryButton variant="ghost" onClick={onBack}>← 返回选秀控制</PrimaryButton>
        </div>
      </div>

      {stage === "teams" && (
        <>
          <div className="flex justify-center mb-6"><RollButton onClick={rollRound1}>🎲 随机生成对阵</RollButton></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            {teams.map((_, idx) => <TeamCard key={idx} team={teams[idx]} activeTeamIdx={-1} teamIdx={idx} useCaptainName />)}
          </div>
        </>
      )}

      {stage === "round1" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {round1.matches.map((m, i) => <MatchBlock key={`r1-${i}`} label={`第${i + 1}场`} match={m} onPick={(side) => pickRound1Winner(i, side)} teams={teams} keyPrefix={`r1-${i}`} />)}
        </div>
      )}

      {stage === "brackets" && <div className="flex flex-col gap-8">{renderWbBracket()}{renderLbBracket()}</div>}

      {stage === "champion" && (
        <div className="flex flex-col items-center gap-8 py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl">🏆</div>
            <GlowHeading size="text-3xl" className="font-display">锦标赛冠军</GlowHeading>
            <div className="w-full max-w-sm"><TeamCard team={teams[wb.champion]} activeTeamIdx={-1} teamIdx={wb.champion} useCaptainName /></div>
          </div>
          {lb.finalists != null ? (
            <div className="flex flex-col items-center gap-3">
              <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#4ade80" }}>败者组亚军</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {lb.finalists.map((idx) => <TeamCard key={idx} team={teams[idx]} activeTeamIdx={-1} teamIdx={idx} useCaptainName />)}
              </div>
            </div>
          ) : <div className="w-full max-w-3xl">{renderLbBracket()}</div>}

          <div className="flex flex-col items-center gap-2 mt-4 pt-6 border-t w-full max-w-md" style={{ borderColor: TEAL_DIM }}>
            {confirmingEnd ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <p className="text-[12px] text-white/50 text-center">
                  这将结束本次锦标赛并为所有人重置。所有队长和选手需要返回主页，重新点击"加入锦标赛"才能参加下一届比赛。
                </p>
                <div className="flex gap-2">
                  <PrimaryButton onClick={() => { onEndTournament(); setConfirmingEnd(false); }}>✓ 是，结束锦标赛</PrimaryButton>
                  <PrimaryButton variant="ghost" onClick={() => setConfirmingEnd(false)}>取消</PrimaryButton>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmingEnd(true)}
                className="text-[11px] px-4 py-2 rounded-lg border font-bold"
                style={{ borderColor: "#5a1414", color: "#f87171", background: "rgba(0,0,0,0.3)" }}>
                🏁 结束锦标赛
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ADMIN — INVITE CODE MANAGEMENT
   Create codes with a required usage limit + optional expiry, view usage
   counts, and disable/delete codes at any time.
   ════════════════════════════════════════════════════════════════════════ */
function InviteCodeManagement({ invites, setInvites, currentUser, accounts }) {
  const [maxUses, setMaxUses] = useState(5);
  const [expiresDate, setExpiresDate] = useState(""); // yyyy-mm-dd, optional
  const [filter, setFilter] = useState("all"); // all | active | disabled | expired | used-up
  const [copiedId, setCopiedId] = useState(null);
  const [copyFailedId, setCopyFailedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const list = invites || [];

  const createCode = () => {
    const uses = parseInt(maxUses, 10);
    if (!uses || uses < 1) return;
    const expiresAt = expiresDate ? new Date(`${expiresDate}T23:59:59`).getTime() : null;
    const inv = buildInvite({ maxUses: uses, expiresAt, createdBy: currentUser.id });
    setInvites((prev) => [inv, ...(prev || [])]);
    setMaxUses(5);
    setExpiresDate("");
  };

  const setStatus = (id, status) => setInvites((prev) => (prev || []).map((i) => i.id === id ? { ...i, status } : i));

  // Deleting a code is permanent and immediate: it's removed from the
  // underlying list entirely (not just flagged), so it drops out of every
  // filter view right away instead of lingering with a "Deleted" badge.
  // Confirmation is done inline (not via window.confirm) because sandboxed
  // preview environments commonly block native browser dialogs, which would
  // silently swallow the click and make the button look completely dead.
  const requestDelete = (id) => setConfirmDeleteId(id);
  const cancelDelete = () => setConfirmDeleteId(null);
  const confirmDelete = (id) => {
    setInvites((prev) => (prev || []).filter((i) => i.id !== id));
    setConfirmDeleteId(null);
  };

  // Robust copy: tries the async Clipboard API first (properly awaited, so a
  // rejection is actually caught), falls back to the legacy execCommand
  // approach against a real input element, and if both are blocked (common
  // inside sandboxed iframes) selects the text so the user can hit Ctrl/Cmd+C
  // themselves instead of silently claiming success.
  const copyCode = async (inv) => {
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inv.code);
        ok = true;
      }
    } catch { ok = false; }

    const input = document.getElementById(`invite-code-input-${inv.id}`);
    if (!ok && input) {
      input.focus();
      input.select();
      input.setSelectionRange(0, 99999);
      try { ok = document.execCommand("copy"); } catch { ok = false; }
    }

    if (ok) {
      setCopyFailedId(null);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 1500);
    } else {
      setCopiedId(null);
      setCopyFailedId(inv.id);
      if (input) { input.focus(); input.select(); }
    }
  };

  const visible = list.filter((inv) => {
    if (filter === "all") return true;
    const st = inviteStatusLabel(inv).key;
    return st === filter;
  });

  const usernamesForInvite = (code) => accounts.filter((a) => a.inviteCodeUsed === code).map((a) => a.displayName);

  return (
    <div className="flex flex-col gap-5">
      <PanelFrame className="p-5">
        <div className="text-sm font-bold text-white mb-1">创建邀请码</div>
        <p className="text-[11px] text-white/40 mb-4">注册需要邀请码 —— 选手只有输入下方有效且生效中的邀请码才能创建账号。</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">最大使用次数 <span style={{ color: "#f87171" }}>*</span></label>
            <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)}
              className="w-28 px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">过期时间（可选）</label>
            <input type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm text-white border bg-black/50" style={{ borderColor: TEAL_DIM, colorScheme: "dark" }} />
          </div>
          <PrimaryButton onClick={createCode} disabled={!maxUses || parseInt(maxUses, 10) < 1}>+ 生成邀请码</PrimaryButton>
        </div>
      </PanelFrame>

      <div className="flex items-center gap-2 flex-wrap">
        {["all", "active", "disabled", "expired", "used-up"].map((f) => (
          <PillButton key={f} small active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "全部" : f === "active" ? "生效中" : f === "disabled" ? "已禁用" : f === "expired" ? "已过期" : "已用完"}
          </PillButton>
        ))}
        <span className="text-[11px] text-white/30 ml-auto">{visible.length} 个邀请码</span>
      </div>

      {visible.length === 0 ? (
        <PanelFrame className="p-6 text-center text-white/30 text-sm">该筛选条件下暂无邀请码。</PanelFrame>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((inv) => {
            const status = inviteStatusLabel(inv);
            const usable = isInviteUsable(inv);
            const users = usernamesForInvite(inv.code);
            return (
              <div key={inv.id} className="relative flex flex-col gap-2 p-3 rounded-xl border bg-black/40" style={{ borderColor: TEAL_DIM }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <input
                      id={`invite-code-input-${inv.id}`}
                      readOnly
                      value={inv.code}
                      onClick={(e) => e.target.select()}
                      title="点击以选中"
                      className="min-w-0 flex-1 bg-transparent border-none outline-none font-mono text-sm font-black tracking-wider text-white truncate cursor-text"
                    />
                    <button
                      onClick={() => copyCode(inv)}
                      className="shrink-0 text-[10px] px-2 py-1 rounded-lg border font-bold"
                      style={
                        copiedId === inv.id
                          ? { borderColor: "rgba(0,245,212,0.5)", color: TEAL }
                          : copyFailedId === inv.id
                          ? { borderColor: "#7a4a10", color: "#c97d20" }
                          : { borderColor: TEAL_DIM, color: TEAL_SOFT }
                      }
                    >
                      {copiedId === inv.id ? "✓ 已复制" : copyFailedId === inv.id ? "已选中 —— 请按 ⌘/Ctrl+C" : "⧉ 复制"}
                    </button>
                  </div>
                  <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0"
                    style={{ background: `${status.color}22`, color: status.color, border: `1px solid ${status.color}55` }}>{status.label}</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-white/50">
                  <span>已使用 <span className="font-bold text-white">{inv.usedCount}</span> / {inv.maxUses}</span>
                  <span>·</span>
                  <span>{inv.expiresAt ? `${new Date(inv.expiresAt).toLocaleDateString()} 过期` : "永不过期"}</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (inv.usedCount / inv.maxUses) * 100)}%`, background: usable ? TEAL : status.color }} />
                </div>

                {users.length > 0 && (
                  <div className="text-[10px] text-white/30 truncate">使用者：{users.join(", ")}</div>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-1 pt-2 border-t border-white/5">
                  {inv.status === "active" ? (
                    <button onClick={() => setStatus(inv.id, "disabled")} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ borderColor: "#5a1414", color: "#f87171" }}>⛔ 禁用</button>
                  ) : (
                    <button onClick={() => setStatus(inv.id, "active")} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ borderColor: "rgba(34,197,94,0.4)", color: "#22c55e" }}>✓ 启用</button>
                  )}
                  {confirmDeleteId === inv.id ? (
                    <>
                      <span className="text-[10px] text-white/50 font-bold">确定删除该邀请码？</span>
                      <button onClick={() => confirmDelete(inv.id)} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ background: "rgba(248,113,113,0.15)", borderColor: "#f87171", color: "#f87171" }}>✓ 是，删除</button>
                      <button onClick={cancelDelete} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ borderColor: TEAL_DIM, color: TEAL_SOFT }}>取消</button>
                    </>
                  ) : (
                    <button onClick={() => requestDelete(inv.id)} className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ borderColor: "#5a1414", color: "#ff8080" }}>× 删除</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — wraps Player Management / Draft Control / Bracket Control / Invite Codes
   ════════════════════════════════════════════════════════════════════════ */
function AdminDashboard({ accounts, setAccounts, currentUser, tournament, setTournament, invites, setInvites }) {
  const [adminScreen, setAdminScreen] = useState(1);

  const captainPool = useMemo(() => accounts.filter((a) => a.enabled && a.isCaptain).map(toPlayerShape), [accounts]);
  const draftPool = useMemo(() => accounts.filter((a) => a.enabled && !a.isCaptain && a.coreRole && a.coreRole.length > 0).map(toPlayerShape), [accounts]);

  const enterLobby = () => {
    if (captainPool.length < 8 || draftPool.length === 0) return;
    setTournament((prev) => ({
      ...prev,
      teams: Array.from({ length: 8 }, () => ({ captain: null, slots: [null, null, null, null] })),
      captainCandidates: [...captainPool],
      pool: [...draftPool],
      draftPhase: "captain",
      pickIndex: 0,
      lastPick: null,
      roundOrdersLocked: false,
      round1: { matches: null }, wb: { pool: null, matches: null, champion: null }, lb: { pool: null, matches: null, finalists: null },
    }));
    setAdminScreen(2);
  };

  // Fully ends the current tournament: resets the tournament/bracket state back
  // to a blank slate and clears every account's "joined" flag, so all Captains
  // and Players must return to the Home page and click Join Tournament again
  // to take part in the next tournament. Spectator View reads the same
  // tournament + accounts state, so it automatically falls back to "Waiting
  // for Players" with 0 joined once this runs.
  const endTournament = () => {
    setTournament(() => initialTournament());
    setAccounts((prev) => prev.map((a) => ({ ...a, joined: false })));
    setAdminScreen(1);
  };

  // Cancels a tournament that's already underway (draft lobby, live draft, or
  // bracket) because of an unexpected situation — a disconnected Captain, a
  // Player who has to leave, a needed roster swap, etc. Unlike End Tournament
  // (which is only reachable once a champion has been crowned), Reset
  // Tournament is available the moment a lobby has been entered, from any
  // Admin screen. It performs the exact same underlying reset as End
  // Tournament — wipe the tournament/bracket state and every account's
  // "joined" flag — so every connected Player, Captain, and Spectator sees
  // the tournament disappear and everyone lands back on Home / Waiting for
  // Players, needing to Join Tournament again before a fresh draft can begin.
  const resetTournament = () => {
    setTournament(() => initialTournament());
    setAccounts((prev) => prev.map((a) => ({ ...a, joined: false })));
    setAdminScreen(1);
  };

  const tournamentInProgress = tournament.teams.length === 8;
  const [confirmingReset, setConfirmingReset] = useState(false);

  const canStartDraft = captainPool.length >= 8 && draftPool.length > 0;
  const actionButtonClass = "rounded-full font-bold transition-all duration-150 border px-3 py-1.5 text-xs";

  return (
    <div className="max-w-[1700px] mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <GlowHeading size="text-2xl" className="font-display">管理员后台</GlowHeading>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="w-2.5 h-2.5 rounded-full transition-all"
              style={adminScreen === s ? { background: TEAL, boxShadow: "0 0 10px #00f5d4" } : { background: "rgba(255,255,255,0.1)" }} />
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <PillButton small active={adminScreen === 1} onClick={() => setAdminScreen(1)}>1 · 选手管理</PillButton>
          <PillButton small active={adminScreen === 2} disabled={tournament.teams.length !== 8} onClick={() => setAdminScreen(2)}>2 · 选秀控制</PillButton>
          <PillButton small active={adminScreen === 3} disabled={!(tournament.draftPhase === "teammate" && computeDraftMeta(tournament).draftFinished)} onClick={() => setAdminScreen(3)}>3 · 对阵控制</PillButton>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center mb-4 pb-4" style={{ borderBottom: `1px solid ${TEAL_DIM}` }}>
        <button onClick={enterLobby} disabled={!canStartDraft}
          className={actionButtonClass}
          style={!canStartDraft
            ? { background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.05)", cursor: "not-allowed" }
            : { background: TEAL, color: "#000", borderColor: TEAL, boxShadow: "0 0 16px rgba(0,245,212,0.8)" }}>
          ⚡ 开始选秀
        </button>
        <PillButton small active={adminScreen === "invites"} onClick={() => setAdminScreen("invites")}>🎟 邀请码</PillButton>
        {tournamentInProgress && (
          <button onClick={() => setConfirmingReset(true)}
            className={actionButtonClass}
            style={{ borderColor: "#5a3a14", color: "#fbbf24", background: "rgba(0,0,0,0.3)" }}>
            ⚠ 重置锦标赛
          </button>
        )}
      </div>

      {confirmingReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <PanelFrame className="p-6 max-w-md w-full">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-3xl">⚠️</div>
              <h3 className="font-display text-sm font-bold tracking-widest" style={{ color: "#fbbf24" }}>重置锦标赛？</h3>
              <p className="text-[12px] text-white/50">
                这将立即取消当前锦标赛 —— 选秀大厅、战队、对阵图及全部进度都会被清空。所有队长和选手都会被移出锦标赛并返回主页，所有人（包括观众）都需要重新点击"加入锦标赛"才能开始新一轮选秀。此操作无法撤销。
              </p>
              <div className="flex gap-2 mt-2">
                <PrimaryButton onClick={() => { resetTournament(); setConfirmingReset(false); }}>✓ 是，重置锦标赛</PrimaryButton>
                <PrimaryButton variant="ghost" onClick={() => setConfirmingReset(false)}>取消</PrimaryButton>
              </div>
            </div>
          </PanelFrame>
        </div>
      )}

      {adminScreen === 1 && (
        <div className="pb-8">
          <AdminPlayerManagement accounts={accounts} setAccounts={setAccounts} currentUser={currentUser} />
        </div>
      )}
      {adminScreen === 2 && (
        <AdminDraftControl captainPool={captainPool} draftPool={draftPool} tournament={tournament} setTournament={setTournament} onBack={() => setAdminScreen(1)} onProceed={() => setAdminScreen(3)} />
      )}
      {adminScreen === 3 && (
        <AdminBracketControl tournament={tournament} setTournament={setTournament} onBack={() => setAdminScreen(2)} onEndTournament={endTournament} />
      )}
      {adminScreen === "invites" && (
        <div className="pb-8">
          <InviteCodeManagement invites={invites} setInvites={setInvites} currentUser={currentUser} accounts={accounts} />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SPECTATOR — single read-only page, auto-detects tournament stage
   ════════════════════════════════════════════════════════════════════════ */
function ParticipantCard({ account, accentColor }) {
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border" style={{ borderColor: `${accentColor}4d` }}>
      <Avatar avatarId={account.avatarId} avatarUrl={account.avatarUrl} size={26} />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-white truncate">{account.displayName}</div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-white/35 truncate">@{account.username}</span>
          {!account.isCaptain && (account.coreRole?.length > 0 || account.positions?.length > 0) && (
            <span className="flex items-center gap-1">
              <CoreRoleBadge coreRole={account.coreRole} />
              <SubRoleBadge positions={account.positions} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantsPanel({ joinedCaptains, joinedTeammates }) {
  return (
    <PanelFrame className="p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display text-xs font-bold tracking-widest" style={{ color: TEAL }}>锦标赛参与者</h2>
        <span className="text-[10px] text-white/30">选手加入或离开时实时更新</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: "#22c55e" }}>已加入队长（{joinedCaptains.length}）</h3>
          <div className="flex flex-wrap gap-2">
            {joinedCaptains.map((a) => <ParticipantCard key={a.id} account={a} accentColor="#22c55e" />)}
            {joinedCaptains.length === 0 && <span className="text-[11px] italic text-white/25">暂无</span>}
          </div>
        </div>
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: TEAL }}>已加入选手（{joinedTeammates.length}）</h3>
          <div className="flex flex-wrap gap-2">
            {joinedTeammates.map((a) => <ParticipantCard key={a.id} account={a} accentColor={TEAL} />)}
            {joinedTeammates.length === 0 && <span className="text-[11px] italic text-white/25">暂无</span>}
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

function SpectatorContent({ tournament, accounts }) {
  const stage = getStage(tournament);
  const meta = computeDraftMeta(tournament);
  const { teams, pool, captainCandidates, draftPhase, pickIndex, lastPick, round1, wb, lb, roundOrders } = tournament;
  const { customSnakeOrder, activeTeamIdx, roundLabel, draftFinished } = meta;

  const joinedPlayers = accounts.filter((a) => a.joined);
  const joinedCaptains = joinedPlayers.filter((a) => a.isCaptain);
  const joinedTeammates = joinedPlayers.filter((a) => !a.isCaptain);

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <GlowHeading size="text-2xl" className="font-display">观众视图</GlowHeading>
        <span className="text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest animate-pulse"
          style={{ background: "rgba(0,245,212,0.12)", color: TEAL, border: `1px solid ${TEAL}55` }}>
          🔴 {STAGE_LABELS[stage]}
        </span>
      </div>

      {stage === "waiting" && (
        <ParticipantsPanel joinedCaptains={joinedCaptains} joinedTeammates={joinedTeammates} />
      )}

      {stage === "waiting" && (
        <PanelFrame className="p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">⏳</div>
            <GlowHeading size="text-xl" className="font-display">等待选手加入</GlowHeading>
            <p className="text-white/40 text-sm text-center max-w-md">锦标赛尚未开始。当管理员开始选秀时，此页面将自动更新。</p>
          </div>
        </PanelFrame>
      )}

      {stage === "live-draft" && (
        <>
          <PanelFrame className="p-4 mb-4">
            <div className="text-center">
              <span className="text-[10px] font-black px-3 py-0.5 rounded-full tracking-widest"
                style={{ background: draftPhase === "captain" ? "rgba(34,197,94,0.12)" : "rgba(0,245,212,0.12)", color: draftPhase === "captain" ? "#22c55e" : TEAL, border: `1px solid ${draftPhase === "captain" ? "rgba(34,197,94,0.4)" : TEAL+"55"}` }}>
                {draftPhase === "captain" ? "⭐ 第一阶段 —— 队长分配" : "👥 第二阶段 —— 队员选秀"}
              </span>
              {draftPhase === "captain" ? (
                <><GlowHeading size="text-xl" className="font-display mt-2">队长选秀进行中</GlowHeading>
                <div className="text-[11px] text-white/40 mt-1">剩余{captainCandidates.length}名队长 · 已分配{8-captainCandidates.length}/8</div></>
              ) : (
                <><div className="text-[11px] tracking-[0.3em] font-bold mb-1 mt-2" style={{ color: "rgba(125,243,225,0.6)" }}>第{roundLabel}轮，共{roundOrders.length}轮</div>
                <GlowHeading size="text-xl" className="font-display">{teams[activeTeamIdx]?.captain?.name?.toUpperCase() || "…"} 的选人回合</GlowHeading>
                <div className="text-[11px] text-white/40 mt-1">战队{activeTeamIdx+1} · 第{pickIndex+1}/{customSnakeOrder.length}顺位</div></>
              )}
              {lastPick && <div className="text-center text-[10px] text-white/30 mt-2">上一步：<span style={{ color: TEAL_SOFT }}>{lastPick.player.name}</span>{lastPick.phase === "captain" ? ` → 战队${lastPick.teamIdx+1}（队长）` : ` → 战队${lastPick.teamIdx+1}`}</div>}
            </div>
          </PanelFrame>
          {draftPhase === "teammate" && pool && (
            <>
              <DraftSequenceStrip customSnakeOrder={customSnakeOrder} pickIndex={pickIndex} roundOrders={roundOrders} draftFinished={draftFinished} />
              <PanelFrame className="p-4 mb-4">
                <h2 className="font-display text-sm font-bold tracking-widest mb-3" style={{ color: TEAL }}>👥 待选选手（{pool.length}）</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {pool.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-lg border" style={{ background: "rgba(0,0,0,0.4)", borderColor: TEAL_DIM }}>
                      <Avatar avatarId={p.avatarId ?? DEFAULT_AVATAR_ID} avatarUrl={p.avatarUrl} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-white truncate">{p.name}</div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap"><CoreRoleBadge coreRole={p.coreRole} /><SubRoleBadge positions={p.positions} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelFrame>
            </>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            {teams.map((team, i) => <TeamCard key={i} team={team} activeTeamIdx={activeTeamIdx} teamIdx={i} />)}
          </div>
        </>
      )}

      {stage === "final-teams" && (
        <>
          <div className="text-center text-white/40 text-sm mb-6">选秀完成！正在等待管理员生成对阵……</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            {teams.map((_, idx) => <TeamCard key={idx} team={teams[idx]} activeTeamIdx={-1} teamIdx={idx} useCaptainName />)}
          </div>
        </>
      )}

      {stage === "current-matches" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {round1.matches.map((m, i) => <MatchBlock key={`r1-${i}`} label={`第${i + 1}场`} match={m} onPick={null} teams={teams} keyPrefix={`r1-${i}`} />)}
        </div>
      )}

      {(stage === "bracket" || stage === "grand-final") && (
        <div className="flex flex-col gap-8">
          {wb.matches == null ? (
            <div className="flex flex-col gap-3 items-center">
              <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#a78bfa" }}>胜者组 —— 等待管理员生成对阵</div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {(wb.pool || []).map((idx) => (
                  <div key={idx} className="rounded-lg border px-3 py-2 text-center text-[11px] font-bold truncate"
                    style={{ borderColor: `${TEAM_COLORS[idx % TEAM_COLORS.length]}55`, color: TEAM_COLORS[idx % TEAM_COLORS.length] }}>{teamNameFor(teams, idx)}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#a78bfa" }}>{wb.matches.length === 1 ? "总决赛" : "胜者组"}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {wb.matches.map((m, i) => <MatchBlock key={`wb-${i}`} label={wb.matches.length === 1 ? "总决赛" : `胜者组 —— 第${i + 1}场`} match={m} onPick={null} teams={teams} keyPrefix={`wb-${i}`} />)}
              </div>
            </div>
          )}

          {lb.finalists != null ? (
            <div className="flex flex-col gap-3 items-center">
              <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#4ade80" }}>败者组亚军</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {lb.finalists.map((idx) => <TeamCard key={idx} team={teams[idx]} activeTeamIdx={-1} teamIdx={idx} useCaptainName />)}
              </div>
            </div>
          ) : lb.matches == null ? (
            <div className="flex flex-col gap-3 items-center">
              <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#a78bfa" }}>败者组 —— 等待管理员生成对阵</div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {(lb.pool || []).map((idx) => (
                  <div key={idx} className="rounded-lg border px-3 py-2 text-center text-[11px] font-bold truncate"
                    style={{ borderColor: `${TEAM_COLORS[idx % TEAM_COLORS.length]}55`, color: TEAM_COLORS[idx % TEAM_COLORS.length] }}>{teamNameFor(teams, idx)}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#a78bfa" }}>败者组</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {lb.matches.map((m, i) => <MatchBlock key={`lb-${i}`} label={`败者组 —— 第${i + 1}场`} match={m} onPick={null} teams={teams} keyPrefix={`lb-${i}`} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {stage === "champion" && (
        <div className="flex flex-col items-center gap-8 py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl">🏆</div>
            <GlowHeading size="text-3xl" className="font-display">锦标赛冠军</GlowHeading>
            <div className="w-full max-w-sm"><TeamCard team={teams[wb.champion]} activeTeamIdx={-1} teamIdx={wb.champion} useCaptainName /></div>
          </div>
          {lb.finalists != null && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: "#4ade80" }}>败者组亚军</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {lb.finalists.map((idx) => <TeamCard key={idx} team={teams[idx]} activeTeamIdx={-1} teamIdx={idx} useCaptainName />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PLAYER HOME — Captains & Players join the tournament and see its status
   ════════════════════════════════════════════════════════════════════════ */
function PlayerHome({ currentUser, setAccounts, tournament, accounts }) {
  const stage = getStage(tournament);
  const joinTournament = () => setAccounts((prev) => prev.map((a) => a.id === currentUser.id ? { ...a, joined: true } : a));

  const joinedPlayers = accounts.filter((a) => a.joined);
  const joinedCaptains = joinedPlayers.filter((a) => a.isCaptain);
  const joinedTeammates = joinedPlayers.filter((a) => !a.isCaptain);

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <PanelFrame className="p-5 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Avatar avatarId={currentUser.avatarId} avatarUrl={currentUser.avatarUrl} size={48} glow />
            <div>
              <div className="text-white font-bold">{currentUser.displayName}</div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {currentUser.isCaptain
                  ? <CaptainBadge />
                  : <><CoreRoleBadge coreRole={currentUser.coreRole} /><SubRoleBadge positions={currentUser.positions} /></>}
                {!currentUser.isCaptain && (!currentUser.coreRole || currentUser.coreRole.length === 0) && (
                  <span className="text-[11px] italic text-white/30">管理员尚未设置您的选秀角色。</span>
                )}
              </div>
            </div>
          </div>
          {!currentUser.joined ? (
            <PrimaryButton onClick={joinTournament}>⚡ 加入锦标赛</PrimaryButton>
          ) : (
            <span className="text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest" style={{ background: "rgba(0,245,212,0.12)", color: TEAL, border: `1px solid ${TEAL}55` }}>✓ 已加入 —— {STAGE_LABELS[stage]}</span>
          )}
        </div>
        {!currentUser.joined && (
          <p className="text-[11px] text-white/30 mt-3">点击"加入锦标赛"，然后回到这里查看管理员推进锦标赛的最新状态。</p>
        )}
      </PanelFrame>

      <PanelFrame className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-display text-xs font-bold tracking-widest" style={{ color: TEAL }}>锦标赛状态</h2>
          <span className="text-[10px] font-black px-3 py-1 rounded-full tracking-widest"
            style={{ background: "rgba(0,245,212,0.12)", color: TEAL, border: `1px solid ${TEAL}55` }}>
            {STAGE_LABELS[stage]}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.05)" }}>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#22c55e" }}>已加入队长</div>
              <div className="text-[11px] text-white/30 mt-0.5">准备好带领一支战队</div>
            </div>
            <div className="text-3xl font-display font-black" style={{ color: "#22c55e" }}>{joinedCaptains.length}</div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: TEAL_DIM, background: "rgba(0,245,212,0.05)" }}>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: TEAL }}>已加入选手</div>
              <div className="text-[11px] text-white/30 mt-0.5">准备好参与选秀</div>
            </div>
            <div className="text-3xl font-display font-black" style={{ color: TEAL }}>{joinedTeammates.length}</div>
          </div>
        </div>
      </PanelFrame>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════════════
   ROOT COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
export default function DraftDashboard() {
  const [accounts, setAccounts] = useSyncedState(STORAGE_KEYS.accounts, null);
  const [tournament, setTournament] = useSyncedState(STORAGE_KEYS.tournament, initialTournament());
  const [invites, setInvites] = useSyncedState(STORAGE_KEYS.invites, []);
  const [sessionUsername, setSessionUsername] = useState(() => readStorage(STORAGE_KEYS.session, null));
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState("home");

  useEffect(() => { if (accounts === null) setAccounts([buildDefaultAdmin()]); }, [accounts]);

  const currentUser = useMemo(() => (accounts || []).find((a) => a.username === sessionUsername) || null, [accounts, sessionUsername]);

  useEffect(() => { if (currentUser) setView(currentUser.role === "admin" ? "admin" : "home"); }, [currentUser?.id]);

  const doLogin = ({ username, password }) => {
    setAuthError("");
    const acct = (accounts || []).find((a) => a.username.toLowerCase() === username.toLowerCase());
    if (!acct) { setAuthError("找不到该用户名对应的账号。"); return; }
    if (!acct.enabled) { setAuthError("该账号已被禁用，请联系管理员。"); return; }
    if (acct.passwordHash !== simpleHash(password)) { setAuthError("密码错误。"); return; }
    setSessionUsername(acct.username);
    writeStorage(STORAGE_KEYS.session, acct.username);
  };

  // Registration is invite-only: no account can be created without a valid,
  // active, non-expired, non-exhausted invite code. The code lookup and the
  // usage-increment happen against the latest persisted invite list so two
  // people racing to use the last remaining use can't both get in.
  // Players now pick their own Captain / Core Role / Sub Role at signup
  // (same rule as the Admin Dashboard's player form: Captain, or a non-
  // captain with at least one Core Role), so an admin no longer needs to set
  // these manually afterwards.
  const doRegister = ({ username, password, confirmPassword, displayName, avatarUrl, inviteCode, isCaptain, coreRole, positions }) => {
    setAuthError("");
    if (!username || !password || !displayName) { setAuthError("请填写所有必填项。"); return; }
    if (!inviteCode) { setAuthError("注册需要邀请码。"); return; }
    if (!isCaptain && (!coreRole || coreRole.length === 0)) { setAuthError("请选择队长身份，或至少一个主要位置。"); return; }
    if (password !== confirmPassword) { setAuthError("两次输入的密码不一致。"); return; }
    if ((accounts || []).some((a) => a.username.toLowerCase() === username.toLowerCase())) { setAuthError("该用户名已被使用。"); return; }

    const latestInvites = readStorage(STORAGE_KEYS.invites, invites || []) || [];
    const invite = latestInvites.find((i) => i.code.toLowerCase() === inviteCode.toLowerCase());
    const rejectReason = inviteRejectReason(invite);
    if (rejectReason) { setAuthError(rejectReason); return; }

    const newAcct = {
      id: genUid("acct"), username, passwordHash: simpleHash(password), displayName,
      avatarId: DEFAULT_AVATAR_ID, avatarUrl: avatarUrl || null,
      role: "player", enabled: true, source: "self", inviteCodeUsed: invite.code,
      isCaptain: !!isCaptain,
      positions: isCaptain ? [CAPTAIN_ID] : [...(positions || [])],
      coreRole: isCaptain ? [] : [...(coreRole || [])],
      joined: false, createdAt: Date.now(),
    };
    setAccounts((prev) => [...(prev || []), newAcct]);
    setInvites((prev) => (prev || []).map((i) => i.id === invite.id ? { ...i, usedCount: i.usedCount + 1 } : i));
    setSessionUsername(username);
    writeStorage(STORAGE_KEYS.session, username);
  };

  const logout = () => { setSessionUsername(null); try { localStorage.removeItem(STORAGE_KEYS.session); } catch {} };

  if (accounts === null) return <div className="min-h-screen flex items-center justify-center text-white/40" style={{ background: "#050807" }}>加载中…</div>;

  if (!currentUser) {
    return <AuthScreen onLogin={doLogin} onRegister={doRegister} error={authError} />;
  }

  return (
    <div className="min-h-screen w-full text-white font-sans" style={{ background: "radial-gradient(ellipse at top, #0b1716 0%, #050807 55%, #020303 100%)" }}>
      <GlobalStyle />
      <NavBar currentUser={currentUser} view={view} setView={setView} onLogout={logout} />

      {view === "admin" && currentUser.role === "admin" && (
        <AdminDashboard accounts={accounts} setAccounts={setAccounts} currentUser={currentUser} tournament={tournament} setTournament={setTournament} invites={invites} setInvites={setInvites} />
      )}

      {view === "home" && (currentUser.role === "player" || currentUser.role === "admin") && (
        <PlayerHome currentUser={currentUser} setAccounts={setAccounts} tournament={tournament} accounts={accounts} />
      )}

      {view === "spectator" && (
        <SpectatorContent tournament={tournament} accounts={accounts} />
      )}
    </div>
  );
}
