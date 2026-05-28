import type { Game } from "../game/engine";
import type { App } from "./app";
import { escapeHtml } from "./app";
import { META_UPGRADES } from "../game/data";
import { fmt, fmtTime } from "../game/format";
import { exportSave } from "../game/save";
import { showToast } from "./fx";

export interface SettingsControls {
  save: () => void;
  importAndReload: (code: string) => boolean;
  hardReset: () => void;
  applyTheme: (theme: "light" | "dark") => void;
}

type Builder = (rerender: () => void, close: () => void) => HTMLElement;

function overlay(build: Builder): void {
  const back = document.createElement("div");
  back.className =
    "fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4";
  const card = document.createElement("div");
  card.className = "card w-full max-w-md max-h-[85dvh] overflow-y-auto p-5 shadow-xl";
  back.appendChild(card);

  const close = () => back.remove();
  const rerender = () => {
    card.innerHTML = "";
    card.appendChild(build(rerender, close));
  };
  back.addEventListener("pointerdown", (e) => {
    if (e.target === back) close();
  });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", esc);
    }
  });
  rerender();
  document.body.appendChild(back);
}

function header(title: string): string {
  return `<div class="flex items-center justify-between mb-4">
    <h2 class="mono font-semibold text-lg flex items-center gap-2"><span class="text-accent">●</span> ${title}</h2>
    <button data-close class="focusable mono text-muted-foreground hover:text-foreground px-2">✕</button>
  </div>`;
}

export function openRetrainModal(game: Game, app: App, save: () => void): void {
  overlay((rerender, close) => {
    const pending = game.pendingTheta();
    const perBonus = (0.01 + metaThetaBoost(game)) * 100;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      ${header("Retrain")}
      <p class="text-sm text-muted-foreground mb-3">
        Retraining wipes your tokens, generators, and upgrades — but banks
        <span class="text-foreground">Parameters (θ)</span> drawn from your all-time tokens.
        Each θ permanently boosts all production.
      </p>
      <div class="card p-3 mb-4 mono text-sm flex flex-col gap-1">
        <div class="flex justify-between"><span class="text-muted-foreground">banked θ</span><span class="tnum">${fmt(game.state.theta)}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">gain on retrain</span><span class="tnum text-accent">+${fmt(pending)}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">each θ gives</span><span class="tnum">+${perBonus.toFixed(2)}%</span></div>
      </div>
      <button data-retrain class="focusable w-full mono py-2.5 rounded ${
        pending > 0
          ? "bg-accent text-accent-foreground hover:opacity-90"
          : "card text-muted-foreground cursor-not-allowed"
      } transition" ${pending > 0 ? "" : "disabled"}>
        ${pending > 0 ? `Retrain for +${fmt(pending)} θ` : "Not enough lifetime tokens yet"}
      </button>

      <div class="section-label mt-5 mb-2">Scaling tree · spend θ</div>
      <div class="flex flex-col gap-1.5" data-tree></div>
    `;

    const tree = wrap.querySelector("[data-tree]")!;
    for (const m of META_UPGRADES) {
      const owned = game.state.metaUpgrades.includes(m.id);
      const can = !owned && game.state.theta >= m.cost;
      const node = document.createElement("button");
      node.className = `focusable text-left card px-3 py-2 flex items-center gap-3 transition-colors ${
        owned ? "border-accent" : can ? "hover:border-accent" : "opacity-55"
      }`;
      node.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm">${m.name}</div>
          <div class="text-xs text-muted-foreground">${m.desc}</div>
        </div>
        <div class="mono text-xs tnum shrink-0 ${owned ? "text-accent" : ""}">${owned ? "owned" : fmt(m.cost) + " θ"}</div>`;
      if (can) {
        node.addEventListener("click", () => {
          if (game.buyMeta(m.id)) {
            app.render();
            save();
            rerender();
          }
        });
      }
      tree.appendChild(node);
    }

    wrap.querySelector("[data-close]")!.addEventListener("click", close);
    const rt = wrap.querySelector<HTMLButtonElement>("[data-retrain]")!;
    rt.addEventListener("click", () => {
      const gained = game.retrain();
      if (gained > 0) {
        app.fullRefresh();
        save();
        showToast(`Retrained — banked <span class="text-accent">+${fmt(gained)} θ</span>`);
        rerender();
      }
    });
    return wrap;
  });
}

function metaThetaBoost(game: Game): number {
  let b = 0;
  for (const id of game.state.metaUpgrades) {
    const m = META_UPGRADES.find((x) => x.id === id);
    if (m && m.effect.type === "thetaBoost") b += m.effect.perTheta;
  }
  return b;
}

export function openSettingsModal(game: Game, ctl: SettingsControls): void {
  overlay((rerender, close) => {
    const s = game.state.settings;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      ${header("Settings")}
      <div class="flex items-center justify-between py-2 border-b">
        <span class="text-sm">Theme</span>
        <div class="flex gap-1 mono text-xs">
          <button data-theme="light" class="px-2.5 py-1 card ${s.theme === "light" ? "border-accent text-foreground" : "text-muted-foreground"}">Light</button>
          <button data-theme="dark" class="px-2.5 py-1 card ${s.theme === "dark" ? "border-accent text-foreground" : "text-muted-foreground"}">Dark</button>
        </div>
      </div>
      <div class="flex items-center justify-between py-2 border-b">
        <span class="text-sm">Sound</span>
        <button data-sound class="px-2.5 py-1 card mono text-xs ${s.sound ? "border-accent text-foreground" : "text-muted-foreground"}">${s.sound ? "On" : "Off"}</button>
      </div>

      <div class="section-label mt-4 mb-1">Export save</div>
      <textarea data-export readonly class="w-full h-20 card p-2 mono text-[11px] resize-none">${exportSave(game.state)}</textarea>
      <button data-copy class="focusable mono text-xs px-3 py-1.5 card hover:border-accent mt-1">Copy</button>

      <div class="section-label mt-4 mb-1">Import save</div>
      <textarea data-import placeholder="paste a TKC save code…" class="w-full h-20 card p-2 mono text-[11px] resize-none"></textarea>
      <button data-import-btn class="focusable mono text-xs px-3 py-1.5 card hover:border-accent mt-1">Import &amp; reload</button>

      <div class="section-label mt-5 mb-1 text-destructive/80">Danger</div>
      <button data-wipe class="focusable mono text-xs px-3 py-1.5 card hover:border-red-500 text-red-500/90">Hard reset</button>
    `;

    wrap.querySelector("[data-close]")!.addEventListener("click", close);
    wrap.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach((b) => {
      b.addEventListener("click", () => {
        const theme = b.dataset.theme as "light" | "dark";
        s.theme = theme;
        ctl.applyTheme(theme);
        rerender();
      });
    });
    wrap.querySelector("[data-sound]")!.addEventListener("click", () => {
      s.sound = !s.sound;
      ctl.save();
      rerender();
    });
    wrap.querySelector("[data-copy]")!.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(exportSave(game.state));
        showToast("Save copied to clipboard");
      } catch {
        showToast("Select the text and copy manually");
      }
    });
    wrap.querySelector("[data-import-btn]")!.addEventListener("click", () => {
      const ta = wrap.querySelector<HTMLTextAreaElement>("[data-import]")!;
      if (!ta.value.trim()) return;
      if (!ctl.importAndReload(ta.value)) showToast("Invalid save code");
    });
    wrap.querySelector("[data-wipe]")!.addEventListener("click", () => {
      if (confirm("Hard reset: erase your save permanently?")) ctl.hardReset();
    });
    return wrap;
  });
}

export function openDexModal(game: Game, vocab: string[], legendaryPool: string[]): void {
  overlay((_r, close) => {
    const discovered = new Set(game.state.discovered);
    const legPool = new Set(legendaryPool);
    const total = vocab.length;
    const found = vocab.filter((t) => discovered.has(t)).length;
    const legFound = game.state.legendaries.length;
    const pct = total ? Math.round((found / total) * 100) : 0;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      ${header("Token Dex")}
      <p class="text-sm text-muted-foreground mb-3">Every unique token you've generated. Rare ones glow.</p>
      <div class="flex justify-between mono text-sm mb-1">
        <span>${found} / ${total} discovered</span>
        <span class="text-accent">✦ ${legFound} legendary</span>
      </div>
      <div class="h-1.5 w-full bg-muted rounded overflow-hidden mb-4">
        <div class="h-full bg-accent" style="width:${pct}%"></div>
      </div>
      <div class="flex flex-wrap gap-1">
        ${vocab
          .map((t) => {
            if (!discovered.has(t)) {
              return `<span class="mono text-[11px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/30">·····</span>`;
            }
            const label = t.trim() === "" ? "␣" : escapeHtml(t);
            const cls = legPool.has(t) ? "dex-legend" : "bg-muted";
            return `<span class="mono text-[11px] px-1.5 py-0.5 rounded ${cls}" title="${escapeHtml(t)}">${label}</span>`;
          })
          .join("")}
      </div>`;
    wrap.querySelector("[data-close]")!.addEventListener("click", close);
    return wrap;
  });
}

export function showWelcomeBack(gain: number, seconds: number): void {
  overlay((_r, close) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      ${header("Welcome back")}
      <p class="text-sm text-muted-foreground mb-4">
        While you were away for <span class="text-foreground mono">${fmtTime(seconds)}</span>,
        your models generated
      </p>
      <div class="text-3xl mono font-semibold text-accent mb-5">+${fmt(gain)} <span class="text-base text-muted-foreground">tokens</span></div>
      <button data-close2 class="focusable w-full mono py-2.5 rounded bg-accent text-accent-foreground hover:opacity-90 transition">Collect</button>
    `;
    wrap.querySelector("[data-close]")!.addEventListener("click", close);
    wrap.querySelector("[data-close2]")!.addEventListener("click", close);
    return wrap;
  });
}
