import { freshState } from "./engine";
import type { GameState } from "./types";

const SAVE_KEY = "tokenclicker.save";
const EXPORT_PREFIX = "TKC1:";

function utf8ToBase64(str: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}
function base64ToUtf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Merge a partial/older save onto a fresh state so new fields always exist. */
function sanitize(raw: unknown): GameState {
  const base = freshState();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<GameState>;
  return {
    ...base,
    ...s,
    generators: { ...(s.generators ?? {}) },
    upgrades: Array.isArray(s.upgrades) ? s.upgrades : [],
    metaUpgrades: Array.isArray(s.metaUpgrades) ? s.metaUpgrades : [],
    achievements: Array.isArray(s.achievements) ? s.achievements : [],
    discovered: Array.isArray(s.discovered) ? s.discovered : [],
    legendaries: Array.isArray(s.legendaries) ? s.legendaries : [],
    buffs: Array.isArray(s.buffs) ? s.buffs : [],
    settings: { ...base.settings, ...(s.settings ?? {}) },
  };
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveState(state: GameState): void {
  state.lastSaved = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function wipeSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function exportSave(state: GameState): string {
  return EXPORT_PREFIX + utf8ToBase64(JSON.stringify(state));
}

export function importSave(code: string): GameState | null {
  try {
    const trimmed = code.trim().replace(/^TKC\d+:/, "");
    const json = base64ToUtf8(trimmed);
    const parsed = JSON.parse(json);
    const state = sanitize(parsed);
    if (typeof state.tokens !== "number" || !Number.isFinite(state.tokens)) return null;
    return state;
  } catch {
    return null;
  }
}
