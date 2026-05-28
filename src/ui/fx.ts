const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function chipLabel(token: string): string {
  if (token.trim() === "") return "␣";
  return token;
}

/**
 * Pop a token chip at (x,y): it fades in, holds readable, then drifts gently
 * upward and fades out. Slow enough that the word itself is legible.
 */
export function spawnChip(token: string, x: number, y: number, legendary = false): void {
  const el = document.createElement("div");
  el.className = legendary ? "chip chip-legendary" : "chip";
  el.textContent = chipLabel(token);
  el.style.transform = `translate(${x}px, ${y}px)`;
  document.body.appendChild(el);

  const dur = reduceMotion ? 700 : legendary ? 2400 : 1500;
  const rise = legendary ? 64 : 44;
  const frames: Keyframe[] = reduceMotion
    ? [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }]
    : [
        { transform: `translate(${x}px, ${y}px) scale(.92)`, opacity: 0, offset: 0 },
        { transform: `translate(${x}px, ${y - 4}px) scale(1)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${x}px, ${y - rise * 0.5}px) scale(1)`, opacity: 1, offset: 0.62 },
        { transform: `translate(${x}px, ${y - rise}px) scale(.97)`, opacity: 0, offset: 1 },
      ];
  const anim = el.animate(frames, { duration: dur, easing: "ease-out", fill: "forwards" });
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();
}

let toastTimer: number | undefined;
export function showToast(msg: string, ms = 3200): void {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className =
      "fixed left-1/2 bottom-6 -translate-x-1/2 z-[80] mono text-sm px-4 py-2 card shadow-lg max-w-[90vw] text-center";
    toast.style.transition = "opacity .25s, transform .25s";
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.style.opacity = "1";
  toast.style.transform = "translate(-50%, 0)";
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast!.style.opacity = "0";
    toast!.style.transform = "translate(-50%, 8px)";
  }, ms);
}
