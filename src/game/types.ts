export interface GeneratorDef {
  id: string;
  name: string;
  icon: string;
  flavor: string;
  baseCost: number;
  baseTps: number;
}

export type UpgradeEffect =
  | { type: "genMult"; gen: string; mult: number }
  | { type: "allGenMult"; mult: number }
  | { type: "clickMult"; mult: number }
  | { type: "clickPctOfTps"; pct: number }
  // `target` generator gains +per per unit of `source` generator owned.
  | { type: "synergy"; target: string; source: string; per: number };

export interface UpgradeUnlock {
  gen?: string;
  genCount?: number;
  gen2?: string;
  gen2Count?: number;
  tokens?: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  icon?: string;
  unlock: UpgradeUnlock;
  effect: UpgradeEffect;
}

export type MetaEffect =
  | { type: "globalMult"; mult: number }
  | { type: "clickMult"; mult: number }
  | { type: "thetaBoost"; perTheta: number }
  | { type: "offlineCap"; hours: number }
  | { type: "offlineRate"; rate: number };

export interface MetaUpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number; // in theta
  effect: MetaEffect;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  test: (s: GameState, e: Stats) => boolean;
}

export interface Stats {
  tps: number;
  clickPower: number;
}

export type GoldenKind = "frenzy" | "clickFrenzy" | "lump";

export interface Buff {
  kind: GoldenKind;
  mult: number;
  until: number; // epoch ms
}

export interface Settings {
  sound: boolean;
  theme: "light" | "dark";
}

export interface GameState {
  v: number;
  tokens: number;
  lifetimeTokens: number; // this run, drives prestige
  totalLifetimeTokens: number; // all runs (stat)
  handmadeTokens: number; // clicked tokens (stat)
  clicks: number;
  generators: Record<string, number>;
  upgrades: string[];
  theta: number;
  metaUpgrades: string[];
  retrains: number;
  achievements: string[];
  goldenClicks: number;
  discovered: string[]; // unique tokens seen (token dex) — persists across retrain
  legendaries: string[]; // rare tokens discovered
  buffs: Buff[];
  settings: Settings;
  startedAt: number;
  lastSaved: number;
}
