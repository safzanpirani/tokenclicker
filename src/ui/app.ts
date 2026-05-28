import type { Game } from "../game/engine";
import type { TokenStream } from "../text/stream";
import { GENERATORS, UPGRADES, ACHIEVEMENTS, NEWS } from "../game/data";
import { fmt, fmtInt, fmtTime } from "../game/format";
import { spawnChip, showToast } from "./fx";
import { playClick, playGolden } from "./sound";

export interface AppCallbacks {
  onSave(): void;
  onRetrain(): void;
  onSettings(): void;
  onDex(): void;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

type BuyAmount = 1 | 10 | 100 | "max";

const TABS = [
  ["generators", "Generators"],
  ["upgrades", "Upgrades"],
  ["stats", "Stats"],
  ["achievements", "Badges"],
] as const;

/** Theme-aware icon path: charcoal in light mode, light-ink in dark mode. */
function iconSrc(charcoalPath: string): string {
  const dark = document.documentElement.classList.contains("dark");
  return dark ? charcoalPath.replace("/icons/", "/icons/dark/") : charcoalPath;
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  html = "",
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html) el.innerHTML = html;
  return el;
}

export class App {
  private streamBody!: HTMLElement;
  private streamScroll!: HTMLElement;
  private streamWrap!: HTMLElement;
  private tokensEl!: HTMLElement;
  private rateEl!: HTMLElement;
  private clickEl!: HTMLElement;
  private buffsEl!: HTMLElement;
  private thetaEl!: HTMLElement;
  private retrainBtn!: HTMLButtonElement;

  private genRows = new Map<string, { root: HTMLElement; cost: HTMLElement; owned: HTMLElement; rate: HTMLElement }>();
  private upgradesPanel!: HTMLElement;
  private statsPanel!: HTMLElement;
  private achPanel!: HTMLElement;

  private newsTextEl!: HTMLElement;
  private newsAcc = 99; // force an immediate headline on first update
  private lastNewsText = "";

  private dexCountEl!: HTMLElement;
  readonly legendaryPool: string[];

  private buyAmount: BuyAmount = 1;
  private activeTab = "generators";
  private streamText = "";
  private ambientAcc = 0;
  private lastUpgradeSig = "";
  private lastAchCount = -1;

  constructor(
    private root: HTMLElement,
    private game: Game,
    private stream: TokenStream,
    private cb: AppCallbacks,
  ) {
    // Rarest readable tokens in the corpus become the "legendary" pool.
    this.legendaryPool = stream.vocab.filter((t) => t.trim().length >= 3).slice(-60);
    this.build();
    this.seedStream();
    this.rebuildUpgrades();
    this.rebuildAchievements();
    this.render();
  }

  // ---- layout --------------------------------------------------------------

  private build(): void {
    this.root.innerHTML = `
      <div class="flex flex-col h-[100dvh] overflow-hidden">
        <header class="flex items-center justify-between px-4 sm:px-6 h-14 border-b shrink-0">
          <div class="mono font-semibold tracking-tight flex items-center gap-2">
            <span class="text-accent">●</span> tokenclicker
          </div>
          <div class="flex items-center gap-2 sm:gap-3">
            <div class="flex items-center gap-1.5 mono text-sm">
              <img src="${iconSrc("/icons/t2-parameter.png")}" data-icon="/icons/t2-parameter.png" alt="" class="w-6 h-6 icon-tile" />
              <span id="theta" class="tnum font-semibold">0</span>
              <span class="text-muted-foreground hidden sm:inline">θ</span>
            </div>
            <button id="dex-btn" class="focusable mono text-sm px-2.5 py-1.5 card hover:border-accent transition-colors" aria-label="Token dex">✦ <span id="dex-count" class="tnum">0</span></button>
            <button id="retrain-btn" class="focusable relative mono text-sm px-3 py-1.5 card hover:border-accent transition-colors">Retrain</button>
            <button id="settings-btn" class="focusable mono text-sm px-2.5 py-1.5 card hover:border-accent transition-colors" aria-label="Settings">⚙</button>
          </div>
        </header>

        <div class="shrink-0 border-b px-4 sm:px-6 py-1.5 flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span class="section-label shrink-0">news</span>
          <span id="news-text" class="mono text-xs text-muted-foreground truncate" style="transition: opacity .25s"></span>
        </div>

        <main class="flex-1 min-h-0 grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[1fr_minmax(320px,420px)] overflow-hidden">
          <!-- left: stats + stream -->
          <section class="flex flex-col min-h-0 p-4 sm:p-6 gap-4 border-b md:border-b-0 md:border-r overflow-hidden">
            <div class="shrink-0">
              <div class="flex items-baseline gap-2">
                <span id="tokens" class="tnum text-3xl sm:text-4xl font-semibold mono">0</span>
                <span class="text-muted-foreground mono text-sm">tokens</span>
              </div>
              <div class="mono text-sm text-muted-foreground mt-1">
                <span id="rate">0 Tk/s</span>
                <span class="mx-1">·</span>
                <span>click <span id="clickpow" class="text-accent">+1</span></span>
              </div>
              <div id="buffs" class="flex flex-wrap gap-1.5 mt-2"></div>
            </div>

            <div id="stream" class="relative flex-1 min-h-[180px] card overflow-hidden cursor-pointer select-none focusable" role="button" tabindex="0" aria-label="Generate a token">
              <div class="absolute top-2 left-3 section-label pointer-events-none">context window</div>
              <div id="stream-scroll" class="absolute left-0 right-0 top-8 bottom-0 px-3 sm:px-4 pb-10 overflow-hidden">
                <div class="mono text-[15px] sm:text-base leading-relaxed text-foreground/90">
                  <span id="stream-body"></span><span class="cursor"></span>
                </div>
              </div>
              <div class="gen-flash" id="gen-flash"></div>
              <div class="absolute bottom-2 left-1/2 -translate-x-1/2 section-label prompt pointer-events-none">click to generate</div>
            </div>
          </section>

          <!-- right: shop -->
          <aside class="flex flex-col min-h-0 overflow-hidden">
            <nav id="tabs" class="flex border-b shrink-0">
              ${TABS.map(
                ([id, label], i) =>
                  `<button data-tab="${id}" class="tab flex-1 mono text-xs sm:text-sm py-2.5 border-b-2 ${
                    i === 0 ? "border-accent text-foreground" : "border-transparent text-muted-foreground"
                  } transition-colors">${label}</button>`,
              ).join("")}
            </nav>
            <div class="flex items-center gap-1 px-3 py-2 border-b shrink-0 mono text-xs" id="buy-bar">
              <span class="text-muted-foreground mr-1">buy</span>
              ${([1, 10, 100, "max"] as BuyAmount[])
                .map(
                  (a) =>
                    `<button data-amt="${a}" class="buyamt px-2 py-1 card ${a === 1 ? "border-accent text-foreground" : "text-muted-foreground"}">${a === "max" ? "Max" : "x" + a}</button>`,
                )
                .join("")}
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto">
              <div data-panel="generators" id="gen-panel" class="p-2 flex flex-col gap-1.5"></div>
              <div data-panel="upgrades" id="up-panel" class="p-2 hidden"></div>
              <div data-panel="stats" id="stats-panel" class="p-4 hidden mono text-sm"></div>
              <div data-panel="achievements" id="ach-panel" class="p-2 hidden"></div>
            </div>
          </aside>
        </main>
      </div>
    `;

    this.streamBody = this.root.querySelector("#stream-body")!;
    this.streamScroll = this.root.querySelector("#stream-scroll")!;
    this.streamWrap = this.root.querySelector("#stream")!;
    this.tokensEl = this.root.querySelector("#tokens")!;
    this.rateEl = this.root.querySelector("#rate")!;
    this.clickEl = this.root.querySelector("#clickpow")!;
    this.buffsEl = this.root.querySelector("#buffs")!;
    this.thetaEl = this.root.querySelector("#theta")!;
    this.retrainBtn = this.root.querySelector("#retrain-btn")!;
    this.newsTextEl = this.root.querySelector("#news-text")!;
    this.dexCountEl = this.root.querySelector("#dex-count")!;
    this.upgradesPanel = this.root.querySelector("#up-panel")!;
    this.statsPanel = this.root.querySelector("#stats-panel")!;
    this.achPanel = this.root.querySelector("#ach-panel")!;

    this.buildGeneratorRows();
    this.wireEvents();
  }

  private buildGeneratorRows(): void {
    const panel = this.root.querySelector("#gen-panel")!;
    panel.innerHTML = "";
    this.genRows.clear();
    for (const g of GENERATORS) {
      const row = h(
        "button",
        "gen-row focusable text-left card px-3 py-2 flex items-center gap-3 hover:border-accent transition-colors disabled:cursor-default",
      );
      row.innerHTML = `
        <img src="${iconSrc(g.icon)}" data-icon="${g.icon}" alt="" class="w-9 h-9 shrink-0 icon-tile" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium truncate">${g.name}</span>
            <span class="owned mono text-sm text-muted-foreground tnum">0</span>
          </div>
          <div class="flex items-center justify-between gap-2 mono text-xs">
            <span class="cost text-accent tnum">${fmt(g.baseCost)}</span>
            <span class="rate text-muted-foreground tnum"></span>
          </div>
        </div>`;
      row.addEventListener("click", () => this.buyGenerator(g.id));
      panel.appendChild(row);
      this.genRows.set(g.id, {
        root: row,
        cost: row.querySelector(".cost")!,
        owned: row.querySelector(".owned")!,
        rate: row.querySelector(".rate")!,
      });
    }
  }

  private wireEvents(): void {
    this.streamWrap.addEventListener("pointerdown", (e) => this.onStreamClick(e));
    this.streamWrap.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const r = this.streamWrap.getBoundingClientRect();
        this.generateClick(r.left + r.width / 2, r.top + r.height / 2);
      }
    });

    this.retrainBtn.addEventListener("click", () => this.cb.onRetrain());
    this.root.querySelector("#settings-btn")!.addEventListener("click", () => this.cb.onSettings());
    this.root.querySelector("#dex-btn")!.addEventListener("click", () => this.cb.onDex());

    this.root.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab!));
    });
    this.root.querySelectorAll<HTMLButtonElement>(".buyamt").forEach((btn) => {
      btn.addEventListener("click", () => this.setBuyAmount(btn.dataset.amt as string));
    });
  }

  // ---- interactions --------------------------------------------------------

  private onStreamClick(e: PointerEvent): void {
    this.generateClick(e.clientX, e.clientY);
  }

  private generateClick(x: number, y: number): void {
    this.game.click();
    if (this.game.state.settings.sound) playClick();
    // flash + chip from the click point
    const flash = this.root.querySelector<HTMLElement>("#gen-flash")!;
    const r = this.streamWrap.getBoundingClientRect();
    flash.style.setProperty("--fx", `${x - r.left}px`);
    flash.style.setProperty("--fy", `${y - r.top}px`);
    flash.classList.remove("go");
    void flash.offsetWidth;
    flash.classList.add("go");
    this.emitToken(x, y);
    this.game.checkAchievements();
    this.render();
  }

  private setBuyAmount(amt: string): void {
    this.buyAmount = amt === "max" ? "max" : (Number(amt) as BuyAmount);
    this.root.querySelectorAll<HTMLButtonElement>(".buyamt").forEach((b) => {
      const on = b.dataset.amt === amt;
      b.classList.toggle("border-accent", on);
      b.classList.toggle("text-foreground", on);
      b.classList.toggle("text-muted-foreground", !on);
    });
    this.render();
  }

  private buyAmountFor(id: string): number {
    if (this.buyAmount === "max") return Math.max(1, this.game.genMaxAffordable(id));
    return this.buyAmount;
  }

  private buyGenerator(id: string): void {
    const n = this.buyAmountFor(id);
    if (this.game.buyGenerator(id, n)) {
      this.game.checkAchievements();
      this.render();
    }
  }

  private switchTab(tab: string): void {
    this.activeTab = tab;
    this.root.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("border-accent", on);
      b.classList.toggle("text-foreground", on);
      b.classList.toggle("border-transparent", !on);
      b.classList.toggle("text-muted-foreground", !on);
    });
    this.root.querySelectorAll<HTMLElement>("[data-panel]").forEach((p) => {
      p.classList.toggle("hidden", p.dataset.panel !== tab);
    });
    const buyBar = this.root.querySelector<HTMLElement>("#buy-bar")!;
    buyBar.classList.toggle("hidden", tab !== "generators");
    this.render();
  }

  // ---- stream + chips ------------------------------------------------------

  private seedStream(): void {
    for (let i = 0; i < 60; i++) {
      const tok = this.stream.next();
      this.streamText += tok;
      this.game.discover(tok);
    }
    this.streamBody.textContent = this.streamText;
    this.scrollStream();
  }

  private appendStream(tok: string): void {
    this.streamText += tok;
    if (this.streamText.length > 2400) this.streamText = this.streamText.slice(-2000);
    // Render the bulk as plain text, with the newest token wrapped so it can
    // flash in — gives the text a live "streaming" feel as it grows.
    const prefix = this.streamText.slice(0, this.streamText.length - tok.length);
    this.streamBody.textContent = prefix;
    const span = document.createElement("span");
    span.className = "tok-new";
    span.textContent = tok;
    this.streamBody.appendChild(span);
    this.scrollStream();
  }

  private scrollStream(): void {
    this.streamScroll.scrollTop = this.streamScroll.scrollHeight;
  }

  /** Advance the stream by one token and pop a readable chip at (x,y). */
  private emitToken(x: number, y: number): void {
    const leg = this.maybeLegendary();
    if (leg) {
      this.emitLegendary(leg, x, y);
      return;
    }
    const tok = this.stream.next();
    this.appendStream(tok);
    this.game.discover(tok);
    spawnChip(tok, x, y);
  }

  private maybeLegendary(): string | null {
    if (Math.random() > 0.004 || this.legendaryPool.length === 0) return null;
    const found = new Set(this.game.state.legendaries);
    const undiscovered = this.legendaryPool.filter((t) => !found.has(t));
    if (undiscovered.length === 0) return null;
    return undiscovered[Math.floor(Math.random() * undiscovered.length)] ?? null;
  }

  private emitLegendary(tok: string, x: number, y: number): void {
    this.appendStream(tok);
    this.game.discover(tok);
    this.game.discoverLegendary(tok);
    const gain = this.game.legendaryReward();
    spawnChip(tok, x, y, true);
    showToast(`✦ legendary token <span class="text-accent">"${escapeHtml(tok.trim())}"</span> · +${fmt(gain)} tokens`);
    if (this.game.state.settings.sound) playGolden();
    this.render();
  }

  private updateNews(dt: number): void {
    this.newsAcc += dt;
    if (this.newsAcc < 9) return;
    this.newsAcc = 0;
    const s = this.game.state;
    const eligible = NEWS.filter(
      (n) =>
        (n.min === undefined || s.totalLifetimeTokens >= n.min) &&
        (n.retrains === undefined || s.retrains >= n.retrains) &&
        (n.gen === undefined || this.game.genCount(n.gen) > 0),
    );
    if (eligible.length === 0) return;
    let pick = eligible[Math.floor(Math.random() * eligible.length)]!;
    for (let i = 0; i < 4 && eligible.length > 1 && pick.text === this.lastNewsText; i++) {
      pick = eligible[Math.floor(Math.random() * eligible.length)]!;
    }
    this.lastNewsText = pick.text;
    this.newsTextEl.style.opacity = "0";
    window.setTimeout(() => {
      this.newsTextEl.textContent = pick.text;
      this.newsTextEl.style.opacity = "1";
    }, 250);
  }

  /** Called every frame: ambient stream flow scaled by Tk/s (cosmetic only). */
  update(dt: number): void {
    this.updateNews(dt);
    const tps = this.game.tps();
    let rate = tps > 0 ? 1.2 + Math.log10(tps + 1) * 0.9 : 0.5;
    rate = Math.min(rate, 6);
    this.ambientAcc += rate * dt;
    let budget = 2; // cap chips per frame
    const wrap = this.streamWrap.getBoundingClientRect();
    while (this.ambientAcc >= 1 && budget-- > 0) {
      this.ambientAcc -= 1;
      const ox = wrap.left + 24 + Math.random() * Math.max(40, wrap.width - 48);
      const oy = wrap.bottom - 28 - Math.random() * 40;
      this.emitToken(ox, oy);
    }
    if (this.ambientAcc > 2) this.ambientAcc = 2;
  }

  // ---- render --------------------------------------------------------------

  render(): void {
    const g = this.game;
    this.tokensEl.textContent = fmt(g.state.tokens);
    this.rateEl.textContent = `${fmt(g.recentTps())} Tk/s`;
    this.clickEl.textContent = `+${fmt(g.clickPower())}`;
    this.thetaEl.textContent = fmt(g.state.theta);
    this.dexCountEl.textContent = fmtInt(g.state.discovered.length);

    // retrain pending indicator
    const pending = g.pendingTheta();
    this.retrainBtn.classList.toggle("border-accent", pending > 0);
    this.retrainBtn.classList.toggle("text-accent", pending > 0);
    this.retrainBtn.innerHTML = pending > 0 ? `Retrain <span class="text-accent">+${fmt(pending)}</span>` : "Retrain";

    this.renderBuffs();

    if (this.activeTab === "generators") this.renderGenerators();
    else if (this.activeTab === "upgrades") this.renderUpgrades();
    else if (this.activeTab === "stats") this.renderStats();
    else if (this.activeTab === "achievements") this.maybeRebuildAch();
  }

  private renderBuffs(): void {
    const now = Date.now();
    const active = this.game.state.buffs.filter((b) => b.until > now);
    if (active.length === 0) {
      if (this.buffsEl.childElementCount) this.buffsEl.innerHTML = "";
      return;
    }
    this.buffsEl.innerHTML = active
      .map((b) => {
        const secs = Math.ceil((b.until - now) / 1000);
        const label = b.kind === "frenzy" ? `Frenzy ${b.mult}x` : `Click ${b.mult}x`;
        return `<span class="mono text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground tnum">${label} · ${fmtTime(secs)}</span>`;
      })
      .join("");
  }

  private isRevealed(baseCost: number, owned: number): boolean {
    return owned > 0 || this.game.state.totalLifetimeTokens >= baseCost * 0.2;
  }

  private renderGenerators(): void {
    for (const g of GENERATORS) {
      const refs = this.genRows.get(g.id);
      if (!refs) continue;
      const owned = this.game.genCount(g.id);
      const revealed = this.isRevealed(g.baseCost, owned);
      if (!revealed) {
        refs.root.classList.add("opacity-40", "pointer-events-none");
        refs.cost.textContent = "???";
        refs.owned.textContent = "";
        refs.rate.textContent = "";
        const nameEl = refs.root.querySelector(".font-medium");
        if (nameEl) nameEl.textContent = "??????";
        continue;
      }
      refs.root.classList.remove("opacity-40", "pointer-events-none");
      const nameEl = refs.root.querySelector(".font-medium");
      if (nameEl && nameEl.textContent !== g.name) nameEl.textContent = g.name;

      const n = this.buyAmountFor(g.id);
      const cost = this.game.genBulkCost(g.id, n);
      const affordable = this.game.state.tokens >= cost;
      refs.cost.textContent = `${fmt(cost)}${this.buyAmount === "max" && n > 1 ? ` ×${n}` : this.buyAmount !== 1 && this.buyAmount !== "max" ? ` ×${n}` : ""}`;
      refs.cost.classList.toggle("text-accent", affordable);
      refs.cost.classList.toggle("text-muted-foreground", !affordable);
      refs.owned.textContent = fmtInt(owned);
      const perUnit = this.game.genUnitTps(g.id);
      refs.rate.textContent = owned > 0 ? `${fmt(perUnit * owned)} Tk/s` : `${fmt(perUnit)}/ea`;
      (refs.root as HTMLButtonElement).disabled = !affordable;
      refs.root.classList.toggle("opacity-60", !affordable);
    }
  }

  private rebuildUpgrades(): void {
    const avail = this.game.availableUpgrades();
    this.lastUpgradeSig = avail.map((u) => u.id).join(",");
    if (avail.length === 0) {
      this.upgradesPanel.innerHTML = `<div class="p-6 text-center text-muted-foreground mono text-sm">No upgrades available yet.<br/>Buy generators to unlock them.</div>`;
      return;
    }
    this.upgradesPanel.innerHTML = "";
    const grid = h("div", "grid grid-cols-1 gap-1.5");
    for (const u of avail.slice(0, 60)) {
      const card = h(
        "button",
        "up-card focusable text-left card px-3 py-2 flex items-center gap-3 hover:border-accent transition-colors",
      );
      card.dataset.id = u.id;
      card.innerHTML = `
        ${u.icon ? `<img src="${iconSrc(u.icon)}" data-icon="${u.icon}" alt="" class="w-8 h-8 shrink-0 icon-tile" />` : ""}
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm truncate">${u.name}</div>
          <div class="text-xs text-muted-foreground truncate">${u.desc}</div>
        </div>
        <div class="cost mono text-xs tnum shrink-0">${fmt(u.cost)}</div>`;
      card.addEventListener("click", () => {
        if (this.game.buyUpgrade(u.id)) {
          this.game.checkAchievements();
          this.rebuildUpgrades();
          this.render();
        }
      });
      grid.appendChild(card);
    }
    this.upgradesPanel.appendChild(grid);
  }

  private renderUpgrades(): void {
    const avail = this.game.availableUpgrades();
    const sig = avail.map((u) => u.id).join(",");
    if (sig !== this.lastUpgradeSig) {
      this.rebuildUpgrades();
      return;
    }
    this.upgradesPanel.querySelectorAll<HTMLElement>(".up-card").forEach((card) => {
      const id = card.dataset.id!;
      const u = UPGRADES.find((x) => x.id === id);
      if (!u) return;
      const ok = this.game.state.tokens >= u.cost;
      const costEl = card.querySelector(".cost")!;
      costEl.classList.toggle("text-accent", ok);
      costEl.classList.toggle("text-muted-foreground", !ok);
      card.classList.toggle("opacity-60", !ok);
    });
  }

  private renderStats(): void {
    const s = this.game.state;
    const rows: [string, string][] = [
      ["tokens", fmt(s.tokens)],
      ["Tk/s", fmt(this.game.tps())],
      ["per click", fmt(this.game.clickPower())],
      ["this run", fmt(s.lifetimeTokens)],
      ["all-time", fmt(s.totalLifetimeTokens)],
      ["hand-typed", fmt(s.handmadeTokens)],
      ["clicks", fmtInt(s.clicks)],
      ["generators", fmtInt(GENERATORS.reduce((a, g) => a + this.game.genCount(g.id), 0))],
      ["upgrades", `${s.upgrades.length}`],
      ["achievements", `${s.achievements.length} / ${ACHIEVEMENTS.length}`],
      ["Parameters (θ)", fmt(s.theta)],
      ["retrains", fmtInt(s.retrains)],
      ["golden clicked", fmtInt(s.goldenClicks)],
      ["time played", fmtTime((Date.now() - s.startedAt) / 1000)],
    ];
    this.statsPanel.innerHTML = rows
      .map(
        ([k, v]) =>
          `<div class="flex justify-between py-1 border-b border-border/60"><span class="text-muted-foreground">${k}</span><span class="tnum">${v}</span></div>`,
      )
      .join("");
  }

  private rebuildAchievements(): void {
    this.lastAchCount = this.game.state.achievements.length;
    const owned = new Set(this.game.state.achievements);
    this.achPanel.innerHTML = `
      <div class="mono text-xs text-muted-foreground px-1 pb-2">${owned.size} / ${ACHIEVEMENTS.length} unlocked</div>
      <div class="grid grid-cols-1 gap-1.5">
        ${ACHIEVEMENTS.map((a) => {
          const got = owned.has(a.id);
          return `<div class="card px-3 py-2 ${got ? "" : "opacity-45"}">
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium text-sm">${got ? a.name : "???"}</span>
              <span class="mono text-[10px] ${got ? "text-accent" : "text-muted-foreground"}">${got ? "✓" : "locked"}</span>
            </div>
            <div class="text-xs text-muted-foreground">${a.desc}</div>
          </div>`;
        }).join("")}
      </div>`;
  }

  private maybeRebuildAch(): void {
    if (this.game.state.achievements.length !== this.lastAchCount) this.rebuildAchievements();
  }

  /** Swap all icon sources for the current theme (charcoal ↔ light-ink). */
  refreshIcons(): void {
    this.root.querySelectorAll<HTMLImageElement>("img[data-icon]").forEach((img) => {
      const base = img.dataset.icon;
      if (base) img.src = iconSrc(base);
    });
  }

  /** Call after retrain / import to fully refresh shop + panels. */
  fullRefresh(): void {
    this.buyAmount = 1;
    this.setBuyAmount("1");
    this.rebuildUpgrades();
    this.rebuildAchievements();
    this.render();
  }
}
