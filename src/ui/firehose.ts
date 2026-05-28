interface Row {
  y: number;
  x: number;
  text: string;
  len: number;
  sp: number; // per-row speed factor
  a: number; // per-row alpha factor
  accent: boolean;
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A faint canvas layer behind the readable stream: fast-scrolling token
 * fragments whose density + speed scale with throughput, visualizing a
 * "firehose" of generation far beyond what the readable text can show.
 */
export class Firehose {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rows: Row[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;

  constructor(
    private container: HTMLElement,
    private vocab: string[],
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "firehose-canvas";
    container.insertBefore(this.canvas, container.firstChild);
    this.ctx = this.canvas.getContext("2d")!;
    this.resize();
  }

  private resize(): void {
    const r = this.container.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.font = '13px "Google Sans Code", ui-monospace, monospace';
    this.ctx.textBaseline = "top";
  }

  private randStr(len: number): string {
    let s = "";
    for (let i = 0; i < len; i++) s += this.vocab[Math.floor(Math.random() * this.vocab.length)] ?? " the";
    return s.trim();
  }

  private addRow(): void {
    const len = 6 + Math.floor(Math.random() * 12);
    this.rows.push({
      y: Math.random() * this.h,
      x: Math.random() * this.w,
      text: this.randStr(len),
      len,
      sp: 0.6 + Math.random() * 0.9,
      a: 0.55 + Math.random() * 0.6,
      accent: Math.random() < 0.25,
    });
  }

  /** intensity 0..1 — drives row count, scroll speed, and opacity. */
  update(dt: number, intensity: number): void {
    const r = this.container.getBoundingClientRect();
    if (Math.abs(r.width - this.w) > 1 || Math.abs(r.height - this.h) > 1) this.resize();

    const target = reduceMotion ? Math.min(4, Math.round(intensity * 6)) : Math.round(intensity * 18);
    while (this.rows.length < target) this.addRow();
    if (this.rows.length > target) this.rows.length = target;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (target === 0) return;

    const dark = document.documentElement.classList.contains("dark");
    const neutral = dark ? "230,232,238" : "40,40,50";
    const speed = reduceMotion ? 0 : 50 + intensity * 460;
    const baseAlpha = 0.05 + intensity * 0.1;

    for (const row of this.rows) {
      if (!reduceMotion) row.x -= speed * row.sp * dt;
      const tw = ctx.measureText(row.text).width;
      if (row.x + tw < 0) {
        row.text = this.randStr(row.len);
        row.x = this.w + Math.random() * 120;
        row.y = Math.random() * this.h;
      }
      const a = baseAlpha * row.a;
      ctx.fillStyle = row.accent ? `rgba(249,115,22,${a})` : `rgba(${neutral},${a})`;
      ctx.fillText(row.text, row.x, row.y);
    }
  }
}
