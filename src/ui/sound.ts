let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(freq: number, durMs: number, gain: number, type: OscillatorType = "triangle"): void {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durMs / 1000);
}

export function playClick(): void {
  blip(420 + Math.random() * 80, 60, 0.05, "square");
}

export function playGolden(): void {
  blip(660, 90, 0.08);
  setTimeout(() => blip(990, 140, 0.08), 70);
}
