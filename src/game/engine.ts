import {
  GENERATORS,
  GEN_BY_ID,
  UPGRADES,
  UPGRADE_BY_ID,
  META_BY_ID,
  ACHIEVEMENTS,
  COST_GROWTH,
  BASE_CLICK,
} from "./data";
import type { GameState, GoldenKind, UpgradeDef } from "./types";

const OFFLINE_BASE_RATE = 0.5;
const OFFLINE_BASE_CAP_H = 3;
const THETA_DIVISOR = 1_000_000; // tokens that map to ~1 theta at the low end
const BASE_THETA_BONUS = 0.01; // each Parameter = +1% global by default

export interface GoldenRoll {
  kind: GoldenKind;
  mult: number;
  durationMs: number;
  label: string;
}

export function freshState(): GameState {
  const now = Date.now();
  return {
    v: 1,
    tokens: 0,
    lifetimeTokens: 0,
    totalLifetimeTokens: 0,
    handmadeTokens: 0,
    clicks: 0,
    generators: {},
    upgrades: [],
    theta: 0,
    metaUpgrades: [],
    retrains: 0,
    achievements: [],
    goldenClicks: 0,
    discovered: [],
    legendaries: [],
    buffs: [],
    settings: { sound: false, theme: "light" },
    startedAt: now,
    lastSaved: now,
  };
}

const RATE_WINDOW_MS = 5000;

export class Game {
  state: GameState;
  private _tps = 0;
  private _clickPower = BASE_CLICK;
  // Rolling record of recently-earned tokens (passive + clicks + golden lumps)
  // used for the displayed "live" Tk/s — distinct from passive _tps.
  private earnSamples: Array<[number, number]> = [];
  private discoveredSet = new Set<string>();

  constructor(state: GameState) {
    this.state = state;
    this.discoveredSet = new Set(state.discovered);
    this.recompute();
  }

  /** Record a token in the dex. Returns true if it was newly discovered. */
  discover(token: string): boolean {
    if (this.discoveredSet.has(token)) return false;
    this.discoveredSet.add(token);
    this.state.discovered.push(token);
    return true;
  }

  /** Record a rare/legendary token. Returns true if newly found. */
  discoverLegendary(token: string): boolean {
    if (this.state.legendaries.includes(token)) return false;
    this.state.legendaries.push(token);
    return true;
  }

  /** Token burst awarded for discovering a legendary token. */
  legendaryReward(): number {
    const gain = Math.max(50, this._tps * 45);
    this.addTokens(gain);
    this.recordEarn(gain);
    return gain;
  }

  // ---- derived multipliers -------------------------------------------------

  private ownedGenMult(genId: string): number {
    let mult = 1;
    for (const id of this.state.upgrades) {
      const u = UPGRADE_BY_ID[id];
      if (!u) continue;
      if (u.effect.type === "genMult" && u.effect.gen === genId) mult *= u.effect.mult;
      else if (u.effect.type === "synergy" && u.effect.target === genId) {
        mult *= 1 + u.effect.per * (this.state.generators[u.effect.source] ?? 0);
      }
    }
    return mult;
  }

  private perThetaBonus(): number {
    let bonus = BASE_THETA_BONUS;
    for (const id of this.state.metaUpgrades) {
      const m = META_BY_ID[id];
      if (m && m.effect.type === "thetaBoost") bonus += m.effect.perTheta;
    }
    return bonus;
  }

  private globalMultiplier(): number {
    let mult = 1;
    for (const id of this.state.upgrades) {
      const u = UPGRADE_BY_ID[id];
      if (u && u.effect.type === "allGenMult") mult *= u.effect.mult;
    }
    for (const id of this.state.metaUpgrades) {
      const m = META_BY_ID[id];
      if (m && m.effect.type === "globalMult") mult *= m.effect.mult;
    }
    // Parameters (prestige) bonus.
    mult *= 1 + this.state.theta * this.perThetaBonus();
    // Achievements: +1% each.
    mult *= 1 + 0.01 * this.state.achievements.length;
    // Frenzy buffs.
    const now = Date.now();
    for (const b of this.state.buffs) {
      if (b.kind === "frenzy" && b.until > now) mult *= b.mult;
    }
    return mult;
  }

  private recompute(): void {
    const global = this.globalMultiplier();
    let tps = 0;
    for (const g of GENERATORS) {
      const count = this.state.generators[g.id] ?? 0;
      if (count > 0) tps += count * g.baseTps * this.ownedGenMult(g.id);
    }
    this._tps = tps * global;

    // click power
    let clickMult = 1;
    let clickPct = 0;
    for (const id of this.state.upgrades) {
      const u = UPGRADE_BY_ID[id];
      if (!u) continue;
      if (u.effect.type === "clickMult") clickMult *= u.effect.mult;
      else if (u.effect.type === "clickPctOfTps") clickPct += u.effect.pct;
    }
    for (const id of this.state.metaUpgrades) {
      const m = META_BY_ID[id];
      if (m && m.effect.type === "clickMult") clickMult *= m.effect.mult;
    }
    const now = Date.now();
    let clickFrenzy = 1;
    for (const b of this.state.buffs) {
      if (b.kind === "clickFrenzy" && b.until > now) clickFrenzy *= b.mult;
    }
    this._clickPower = (BASE_CLICK * clickMult + this._tps * clickPct) * clickFrenzy;
  }

  tps(): number {
    return this._tps;
  }
  clickPower(): number {
    return this._clickPower;
  }

  private recordEarn(n: number): void {
    if (n > 0) this.earnSamples.push([performance.now(), n]);
  }

  /** Live throughput over the last ~5s: passive + clicks + golden lumps. */
  recentTps(): number {
    const cutoff = performance.now() - RATE_WINDOW_MS;
    while (this.earnSamples.length > 0 && (this.earnSamples[0]?.[0] ?? 0) < cutoff) {
      this.earnSamples.shift();
    }
    let sum = 0;
    for (const s of this.earnSamples) sum += s[1];
    return sum / (RATE_WINDOW_MS / 1000);
  }

  /** Effective per-unit Tk/s for a generator, including all multipliers. */
  genUnitTps(id: string): number {
    const def = GEN_BY_ID[id];
    if (!def) return 0;
    return def.baseTps * this.ownedGenMult(id) * this.globalMultiplier();
  }

  // ---- costs ---------------------------------------------------------------

  genCount(id: string): number {
    return this.state.generators[id] ?? 0;
  }

  genCost(id: string, owned = this.genCount(id)): number {
    const def = GEN_BY_ID[id];
    if (!def) return Infinity;
    return Math.ceil(def.baseCost * Math.pow(COST_GROWTH, owned));
  }

  /** Total cost to buy `n` units starting from current ownership. */
  genBulkCost(id: string, n: number): number {
    const def = GEN_BY_ID[id];
    if (!def) return Infinity;
    const owned = this.genCount(id);
    const r = COST_GROWTH;
    const first = def.baseCost * Math.pow(r, owned);
    return Math.ceil((first * (Math.pow(r, n) - 1)) / (r - 1));
  }

  /** Max affordable count for a generator. */
  genMaxAffordable(id: string): number {
    const def = GEN_BY_ID[id];
    if (!def) return 0;
    const owned = this.genCount(id);
    const r = COST_GROWTH;
    const first = def.baseCost * Math.pow(r, owned);
    const n = Math.floor(Math.log((this.state.tokens * (r - 1)) / first + 1) / Math.log(r));
    return Math.max(0, n);
  }

  buyGenerator(id: string, n: number): boolean {
    if (n <= 0) return false;
    const cost = this.genBulkCost(id, n);
    if (this.state.tokens < cost) return false;
    this.state.tokens -= cost;
    this.state.generators[id] = this.genCount(id) + n;
    this.recompute();
    return true;
  }

  // ---- upgrades ------------------------------------------------------------

  isUpgradeUnlocked(u: UpgradeDef): boolean {
    if (this.state.upgrades.includes(u.id)) return false;
    if (u.unlock.gen && u.unlock.genCount) {
      if (this.genCount(u.unlock.gen) < u.unlock.genCount) return false;
    }
    if (u.unlock.gen2 && u.unlock.gen2Count) {
      if (this.genCount(u.unlock.gen2) < u.unlock.gen2Count) return false;
    }
    if (u.unlock.tokens && this.state.lifetimeTokens < u.unlock.tokens) return false;
    return true;
  }

  availableUpgrades(): UpgradeDef[] {
    return UPGRADES.filter((u) => this.isUpgradeUnlocked(u)).sort((a, b) => a.cost - b.cost);
  }

  buyUpgrade(id: string): boolean {
    const u = UPGRADE_BY_ID[id];
    if (!u || !this.isUpgradeUnlocked(u) || this.state.tokens < u.cost) return false;
    this.state.tokens -= u.cost;
    this.state.upgrades.push(id);
    this.recompute();
    return true;
  }

  // ---- meta upgrades (Parameters) -----------------------------------------

  buyMeta(id: string): boolean {
    const m = META_BY_ID[id];
    if (!m || this.state.metaUpgrades.includes(id) || this.state.theta < m.cost) return false;
    this.state.theta -= m.cost;
    this.state.metaUpgrades.push(id);
    this.recompute();
    return true;
  }

  // ---- earning -------------------------------------------------------------

  addTokens(n: number): void {
    this.state.tokens += n;
    this.state.lifetimeTokens += n;
    this.state.totalLifetimeTokens += n;
  }

  click(): number {
    const n = this._clickPower;
    this.addTokens(n);
    this.recordEarn(n);
    this.state.handmadeTokens += n;
    this.state.clicks += 1;
    return n;
  }

  // ---- prestige ------------------------------------------------------------

  private thetaForLifetime(total: number): number {
    if (total < THETA_DIVISOR) return 0;
    return Math.floor(Math.pow(total / THETA_DIVISOR, 1 / 3));
  }

  /** Parameters you'd gain by retraining right now. */
  pendingTheta(): number {
    return Math.max(0, this.thetaForLifetime(this.state.totalLifetimeTokens) - this.state.theta);
  }

  retrain(): number {
    const gain = this.pendingTheta();
    if (gain <= 0) return 0;
    this.state.theta += gain;
    this.state.retrains += 1;
    // reset the run
    this.state.tokens = 0;
    this.state.lifetimeTokens = 0;
    this.state.handmadeTokens = 0;
    this.state.generators = {};
    this.state.upgrades = [];
    this.state.buffs = [];
    this.recompute();
    return gain;
  }

  // ---- golden tokens -------------------------------------------------------

  rollGolden(): GoldenRoll {
    const roll = Math.random();
    if (roll < 0.45) {
      return { kind: "frenzy", mult: 7, durationMs: 77_000, label: "Frenzy — 7x Tk/s for 77s" };
    }
    if (roll < 0.75) {
      return { kind: "lump", mult: 0, durationMs: 0, label: "Cache Hit — lump sum of tokens" };
    }
    return { kind: "clickFrenzy", mult: 777, durationMs: 13_000, label: "Click Frenzy — 777x clicks for 13s" };
  }

  applyGolden(roll: GoldenRoll): { gain: number } {
    this.state.goldenClicks += 1;
    if (roll.kind === "lump") {
      const gain = Math.max(13, this._tps * 120 + this.state.tokens * 0.05);
      this.addTokens(gain);
      this.recordEarn(gain);
      this.recompute();
      return { gain };
    }
    this.state.buffs.push({ kind: roll.kind, mult: roll.mult, until: Date.now() + roll.durationMs });
    this.recompute();
    return { gain: 0 };
  }

  // ---- tick ----------------------------------------------------------------

  /** Advance the simulation by dt seconds. Returns tokens earned this tick. */
  tick(dt: number): number {
    const before = this.state.buffs.length;
    const now = Date.now();
    this.state.buffs = this.state.buffs.filter((b) => b.until > now);
    if (this.state.buffs.length !== before) this.recompute();

    const earned = this._tps * dt;
    if (earned > 0) {
      this.addTokens(earned);
      this.recordEarn(earned);
    }
    return earned;
  }

  // ---- achievements --------------------------------------------------------

  checkAchievements(): string[] {
    const stats = { tps: this._tps, clickPower: this._clickPower };
    const unlocked: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (!this.state.achievements.includes(a.id) && a.test(this.state, stats)) {
        this.state.achievements.push(a.id);
        unlocked.push(a.id);
      }
    }
    if (unlocked.length) this.recompute();
    return unlocked;
  }

  // ---- offline -------------------------------------------------------------

  offlineParams(): { rate: number; capSeconds: number } {
    let rate = OFFLINE_BASE_RATE;
    let capH = OFFLINE_BASE_CAP_H;
    for (const id of this.state.metaUpgrades) {
      const m = META_BY_ID[id];
      if (!m) continue;
      if (m.effect.type === "offlineRate") rate += m.effect.rate;
      else if (m.effect.type === "offlineCap") capH += m.effect.hours;
    }
    return { rate, capSeconds: capH * 3600 };
  }

  applyOffline(elapsedMs: number): { gain: number; seconds: number } {
    const { rate, capSeconds } = this.offlineParams();
    const seconds = Math.min(elapsedMs / 1000, capSeconds);
    const gain = this._tps * seconds * rate;
    if (gain > 0) this.addTokens(gain);
    return { gain, seconds };
  }
}
