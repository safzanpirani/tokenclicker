import "./styles.css";
import { Game, freshState } from "./game/engine";
import { loadState, saveState, importSave, wipeSave } from "./game/save";
import { loadCorpus, TokenStream, type CorpusData } from "./text/stream";
import { App } from "./ui/app";
import { startLoop } from "./game/loop";
import { startGoldenScheduler } from "./ui/golden";
import { openRetrainModal, openSettingsModal, showWelcomeBack, openDexModal } from "./ui/modals";
import { showToast } from "./ui/fx";
import { playGolden } from "./ui/sound";
import { ACHIEVEMENT_BY_ID } from "./game/data";
import { fmt } from "./game/format";

const FALLBACK_CORPUS: CorpusData = {
  passages: [["the", " model", " learns", " to", " predict", " the", " next", " token"]],
  vocab: ["the", " model", " token", " learns", " predict", " next"],
};

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app")!;

  let corpus: CorpusData;
  try {
    corpus = await loadCorpus();
  } catch {
    corpus = FALLBACK_CORPUS;
  }

  const saved = loadState();
  const state = saved ?? freshState();
  document.documentElement.classList.toggle("dark", state.settings.theme === "dark");

  const game = new Game(state);

  if (saved) {
    const elapsed = Date.now() - (saved.lastSaved || Date.now());
    if (elapsed > 60_000 && game.tps() > 0) {
      const { gain, seconds } = game.applyOffline(elapsed);
      if (gain > 1) showWelcomeBack(gain, seconds);
    }
  }

  const stream = new TokenStream(corpus);

  // When importing or hard-resetting we must NOT let the autosave / beforeunload
  // handler write the old running state over the new one during reload.
  let suppressSave = false;
  const save = () => {
    if (!suppressSave) saveState(state);
  };
  const importAndReload = (code: string): boolean => {
    const imported = importSave(code);
    if (!imported) return false;
    suppressSave = true;
    saveState(imported);
    location.reload();
    return true;
  };
  const hardReset = (): void => {
    suppressSave = true;
    wipeSave();
    location.reload();
  };
  const applyTheme = (theme: "light" | "dark"): void => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    app.refreshIcons();
    save();
  };

  const app: App = new App(root, game, stream, {
    onSave: save,
    onRetrain: () => openRetrainModal(game, app, save),
    onSettings: () => openSettingsModal(game, { save, importAndReload, hardReset, applyTheme }),
    onDex: () => openDexModal(game, stream.vocab, app.legendaryPool),
  });

  game.checkAchievements();
  app.render();

  startLoop(game, {
    onTick: (dt) => {
      app.update(dt);
      const newly = game.checkAchievements();
      if (newly.length) {
        for (const id of newly) {
          const a = ACHIEVEMENT_BY_ID[id];
          if (a) showToast(`Achievement · ${a.name}`);
        }
        app.render();
      }
    },
    onRender: () => app.render(),
    onSave: save,
  });

  startGoldenScheduler(() => {
    const roll = game.rollGolden();
    const { gain } = game.applyGolden(roll);
    game.checkAchievements();
    if (state.settings.sound) playGolden();
    showToast(roll.kind === "lump" ? `Cache Hit · +${fmt(gain)} tokens` : roll.label);
    app.render();
  });

  // Credit idle time when returning to a backgrounded tab (no reload happened).
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      save();
    } else if (hiddenAt) {
      const elapsed = Date.now() - hiddenAt;
      hiddenAt = 0;
      if (elapsed > 60_000 && game.tps() > 0) {
        const { gain, seconds } = game.applyOffline(elapsed);
        if (gain > 1) showWelcomeBack(gain, seconds);
        app.render();
      }
    }
  });

  window.addEventListener("beforeunload", save);
}

void boot();
