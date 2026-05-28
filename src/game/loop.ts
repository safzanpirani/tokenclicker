import type { Game } from "./engine";

export interface LoopHooks {
  onTick: (dt: number) => void;
  onRender: () => void;
  onSave: () => void;
}

const RENDER_INTERVAL = 1 / 30; // seconds
const SAVE_INTERVAL = 15; // seconds

export function startLoop(game: Game, hooks: LoopHooks): void {
  let last = performance.now();
  let renderAcc = 0;
  let saveAcc = 0;

  function frame(now: number): void {
    let dt = (now - last) / 1000;
    last = now;
    // Clamp big jumps (hidden tab / throttling); long gaps are credited as
    // offline progress elsewhere via the lastSaved timestamp.
    if (dt > 1) dt = 1;
    if (dt < 0) dt = 0;

    game.tick(dt);
    hooks.onTick(dt);

    renderAcc += dt;
    if (renderAcc >= RENDER_INTERVAL) {
      hooks.onRender();
      renderAcc = 0;
    }

    saveAcc += dt;
    if (saveAcc >= SAVE_INTERVAL) {
      hooks.onSave();
      saveAcc = 0;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
