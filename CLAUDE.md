# tokenclicker

A cookie-clicker-style idle game where the "cookie" is an **LLM token**. Every
click and every generator emits a *real* LLM token — a word or subword fragment —
that flies as a chip into a live "context window" stream that reads like a model
generating text. Hosted (planned) at **token.safzan.dev**.

Status: built and playable (core loop, prestige, goldens, achievements, dex,
save/import, theme-aware icons). Iterating on polish + throughput visualization.

---

## Core concept

- Currency = **tokens** (Tk). You generate them by clicking and by buying
  generators that produce tokens/sec (**Tk/s**).
- Every generated token is a genuine LLM token boundary (real tokenizer vocab),
  shown as a flying "chip" that lands in the on-screen context-window stream.
- The stream reads like coherent, on-theme AI/ML text ("the model learns to
  predict the next token given prior context…").

---

## Locked architecture decisions

| Area | Decision |
|------|----------|
| App type | Pure static client-side. No backend, no accounts. |
| Stack | **Vanilla TypeScript + Vite + Tailwind v4**. Dedicated `requestAnimationFrame` game loop drives state directly — no framework re-render in the hot path. |
| Text engine | **Pre-baked corpus** (see below). No model, no tokenizer, no Web Worker at runtime. |
| Save | localStorage autosave + **base64 export/import save strings** (portable save codes). |
| Deploy | **Vercel** (Git-based, static). No R2, no functions needed for v1. |
| Aesthetic | Match safzan.dev: charcoal `#141414` ink, single orange accent `#F97316` (`hsl(24 95% 53%)`), Google Sans / Google Sans Code, sharp ~4px radius, terminal feel (`→` prompts, blinking `▋` cursor, mono labels). |
| Layout | **Stream-centric two-pane**: the live stream is the centerpiece AND the click target (click it to GENERATE); right pane is the shop with tabs (Generators / Upgrades / Stats / Achievements). Stacks vertically on mobile. |

---

## Text engine: pre-baked corpus

1. **Build time (once):** a strong LLM (Claude, right now) writes a large, varied,
   on-theme AI/ML corpus.
2. **Pre-tokenize** that corpus with a real tokenizer (o200k_base / cl100k or a
   model tokenizer) into sequences of real token *display strings* (spaces decoded
   to a visible marker).
3. Ship as a static `corpus.json` (a few hundred KB).
4. **Runtime:** stream tokens from the corpus (pick a start, advance token by
   token, recombine/shuffle across passages). Each token = one flying chip + one
   token appended to the stream. No model/tokenizer loaded in the browser.

Result: instant load, $0 runtime cost, no backend, fully offline, best-quality
text, and chips are still genuine token boundaries. Player cannot distinguish
baked-and-shuffled from live.

The "giant list of possible tokens" = the set of unique tokens in the corpus
(plus optionally the full vocab list for rare-token flavor events).

---

## Game systems

### Generators (18-tier LLM-compute ladder)
Cheapest → most expensive. Each has a base cost and base Tk/s; cost grows ~1.15×
per purchase, tiers ~10–15× apart (cookie-clicker style).

1. Intern · 2. Autocomplete · 3. Markov Chain · 4. n-gram Model · 5. RNN ·
6. LSTM · 7. Transformer Block · 8. GPU · 9. GPU Cluster · 10. TPU Pod ·
11. Data Center · 12. Foundation Model · 13. Mixture-of-Experts ·
14. Multimodal Model · 15. Reasoning Model · 16. Research Lab · 17. AGI ·
18. Superintelligence

### Upgrades
Per-generator doublers (unlock at owning 1/10/25/50/100/150…) + global Tk/s and
click-power multipliers. Themed (e.g. "Flash Attention: Transformers ×2").

### Prestige — "Retrain → Parameters (θ)"
Reset tokens/generators/upgrades; bank **Parameters (θ)** from lifetime tokens via
a cube-root curve (à la Cookie Clicker heavenly chips). Each θ = permanent global
Tk/s multiplier (scaling laws). θ funds a persistent **Scaling** meta-upgrade tree.
θ never resets.

### Golden tokens (the "golden cookie")
A rare clickable that drifts across the stream. Effects (themed): Frenzy (×7 Tk/s,
~77s), Cache Hit (lump sum), Click Frenzy (×777 click power, ~13s).

### Achievements
Badges for milestones (token totals, generator counts, first retrain, golden
tokens clicked…). Each grants a tiny permanent bonus.

### Offline / idle progress
Earn a reduced share (~50%) of Tk/s while away, capped (~3h), with a
"while you were away…" welcome-back popup.

---

## Throughput visualization (conveying high Tk/s)

The readable stream + flying chips stay deliberately slow so each token is
legible — but that means they can't represent the real production rate (e.g.
4.5k Tk/s). These are the ways to *visually* convey magnitude beyond what
legible text can. The stream rate is decoupled from the currency rate: text
flow ≈ `4 + log10(tps+1)·6` (cap 45/s), chips ≈ `1.5 + log10(tps+1)·0.8` (cap
6/s). A single `intensity` 0..1 = `clamp((log10(tps+1) − 1) / 4, 0, 1)` drives
the ambient layers.

- **Background token firehose** *(implemented — `src/ui/firehose.ts`)*. A faint
  canvas behind the readable stream: fast-scrolling token fragments whose
  density, scroll-speed, opacity and a card border/inner-glow all ramp with
  `intensity`. Reads as a blur of generation "underneath" the legible chips.
  Respects `prefers-reduced-motion` (freezes, fewer rows). A small corner
  `N Tk/s` label fades in once intensity is high.
- **Parallel context windows.** Past a threshold, spawn additional miniature
  stream panes ("×N parallel"), each scrolling its own text — visualizes batched
  / multi-replica inference. Count scales with tier of throughput.
- **Throughput gauge + sparkline.** A dedicated Tk/s readout with a needle/bar
  that pegs toward "max", plus a rolling sparkline of recent rate — a literal
  instrument rather than implied motion.
- **Batch counter.** An explicit "×N tokens/batch" multiplier badge near the
  stream that grows with rate, framing chips as samples of a much larger batch.
- **Chip burst intensity.** Instead of more chips, occasional *bursts* (a small
  fan of chips on one emit) whose size scales with rate — keeps individual chips
  rare/readable while signaling volume.
- **Token rain.** Vertical falling-token columns (Matrix-style) layered behind
  the stream as an alternative/secondary ambient to the horizontal firehose.

---

## Self-decided defaults (veto anytime)

- **Number formatting:** K, M, B, T, then Qa, Qi, Sx, Sp, Oc, No, Dc, … then
  scientific (`1.23e45`) beyond.
- **Sound:** off by default; optional subtle click blip + golden chime.
- **Balancing:** Tk/s = Σ(generator count × base × generator-upgrades) × global
  multipliers × (1 + θ bonus). Click power = base 1 + flat/% bonuses, optionally
  + a small % of Tk/s ("typing speed").

---

## Icons

Generated separately via Codex image-gen (brief handed off 2026-05-28): flat
monoline vector icons, charcoal + orange accent, transparent PNG, 18 generators +
token + θ currency icons. Style intentionally matches the site aesthetic above.

---

## Deploy (Vercel, Git-based)

- Deployed via Vercel's GitHub integration (import the repo in the Vercel
  dashboard) — NOT the Vercel CLI.
- `vercel.json` pins: build command `pnpm build` (runs `build:corpus` →
  `tsc --noEmit` → `vite build`), output `dist`, framework `vite`, and
  Cache-Control headers (immutable hashed assets, 1-week icons, 1-day corpus,
  no-cache index.html).
- Everything is static — no env vars, no serverless functions.
- Add `token.safzan.dev` as a custom domain on the Vercel project.

Local: `pnpm dev` (Vite). Production preview: `pnpm preview`.
