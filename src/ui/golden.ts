const LIFETIME_MS = 13_000;

export interface GoldenHandle {
  el: HTMLImageElement;
  x: number;
  y: number;
}

/** Spawn a golden token somewhere on screen. Calls onClick once if clicked. */
export function spawnGolden(onClick: (h: GoldenHandle) => void): void {
  const el = document.createElement("img");
  el.src = "/icons/t1-token.png";
  el.alt = "golden token";
  el.className = "golden";
  const pad = 80;
  const x = pad + Math.random() * (window.innerWidth - pad * 2);
  const y = pad + Math.random() * (window.innerHeight - pad * 2);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);

  let done = false;
  const remove = () => {
    if (done) return;
    done = true;
    el.style.transition = "opacity .3s, transform .3s";
    el.style.opacity = "0";
    el.style.transform = "scale(.4)";
    setTimeout(() => el.remove(), 320);
  };
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (done) return;
    onClick({ el, x: e.clientX, y: e.clientY });
    remove();
  });
  setTimeout(remove, LIFETIME_MS);
}

/** Schedule recurring golden spawns at random intervals. */
export function startGoldenScheduler(onClick: (h: GoldenHandle) => void): void {
  const next = () => {
    const delay = 90_000 + Math.random() * 120_000; // 1.5–3.5 min
    window.setTimeout(() => {
      if (document.visibilityState === "visible") spawnGolden(onClick);
      next();
    }, delay);
  };
  next();
}
