import type {
  GeneratorDef,
  UpgradeDef,
  MetaUpgradeDef,
  AchievementDef,
} from "./types";

export const COST_GROWTH = 1.15;
export const BASE_CLICK = 1;

export const GENERATORS: GeneratorDef[] = [
  { id: "intern", name: "Intern", icon: "/icons/01-intern.png", flavor: "types tokens by hand, fueled by coffee", baseCost: 15, baseTps: 0.1 },
  { id: "autocomplete", name: "Autocomplete", icon: "/icons/02-autocomplete.png", flavor: "phone-keyboard suggestions", baseCost: 100, baseTps: 1 },
  { id: "markov", name: "Markov Chain", icon: "/icons/03-markov-chain.png", flavor: "statistical babble, one state at a time", baseCost: 1_100, baseTps: 8 },
  { id: "ngram", name: "n-gram Model", icon: "/icons/04-n-gram-model.png", flavor: "remembers the last few words", baseCost: 12_000, baseTps: 47 },
  { id: "rnn", name: "RNN", icon: "/icons/05-rnn.png", flavor: "a loop that feeds itself", baseCost: 130_000, baseTps: 260 },
  { id: "lstm", name: "LSTM", icon: "/icons/06-lstm.png", flavor: "remembers a little longer", baseCost: 1_400_000, baseTps: 1_400 },
  { id: "transformer", name: "Transformer Block", icon: "/icons/07-transformer-block.png", flavor: "attention is all you need", baseCost: 20_000_000, baseTps: 7_800 },
  { id: "gpu", name: "GPU", icon: "/icons/08-gpu.png", flavor: "a single card, humming", baseCost: 330_000_000, baseTps: 44_000 },
  { id: "gpu-cluster", name: "GPU Cluster", icon: "/icons/09-gpu-cluster.png", flavor: "a rack of them", baseCost: 5_100_000_000, baseTps: 260_000 },
  { id: "tpu-pod", name: "TPU Pod", icon: "/icons/10-tpu-pod.png", flavor: "tensor cores, all the way down", baseCost: 75_000_000_000, baseTps: 1_600_000 },
  { id: "data-center", name: "Data Center", icon: "/icons/11-data-center.png", flavor: "a warehouse of racks", baseCost: 1_000_000_000_000, baseTps: 10_000_000 },
  { id: "foundation-model", name: "Foundation Model", icon: "/icons/12-foundation-model.png", flavor: "trained on the whole internet", baseCost: 14_000_000_000_000, baseTps: 65_000_000 },
  { id: "moe", name: "Mixture-of-Experts", icon: "/icons/13-mixture-of-experts.png", flavor: "route each token to a specialist", baseCost: 170_000_000_000_000, baseTps: 430_000_000 },
  { id: "multimodal", name: "Multimodal Model", icon: "/icons/14-multimodal-model.png", flavor: "sees, hears, and reads", baseCost: 2_100_000_000_000_000, baseTps: 2_900_000_000 },
  { id: "reasoning", name: "Reasoning Model", icon: "/icons/15-reasoning-model.png", flavor: "thinks before it speaks", baseCost: 26_000_000_000_000_000, baseTps: 21_000_000_000 },
  { id: "research-lab", name: "Research Lab", icon: "/icons/16-research-lab.png", flavor: "humans and models in a loop", baseCost: 310_000_000_000_000_000, baseTps: 150_000_000_000 },
  { id: "agi", name: "AGI", icon: "/icons/17-agi.png", flavor: "generalizes beyond its training", baseCost: 3_700_000_000_000_000_000, baseTps: 1_100_000_000_000 },
  { id: "superintelligence", name: "Superintelligence", icon: "/icons/18-superintelligence.png", flavor: "tokens faster than physics should allow", baseCost: 44_000_000_000_000_000_000, baseTps: 8_500_000_000_000 },
];

export const GEN_BY_ID: Record<string, GeneratorDef> = Object.fromEntries(
  GENERATORS.map((g) => [g.id, g]),
);

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const TIER_NAMES = ["Tuned", "Optimized", "Distilled", "Quantized", "Overclocked", "Singular"];

/** Per-generator doubler upgrades, generated at ownership thresholds. */
function generatorUpgrades(): UpgradeDef[] {
  const thresholds = [1, 10, 25, 50, 100];
  const out: UpgradeDef[] = [];
  for (const g of GENERATORS) {
    thresholds.forEach((count, i) => {
      out.push({
        id: `up_${g.id}_${i}`,
        name: `${TIER_NAMES[i] ?? "Refined"} ${g.name} ${ROMAN[i] ?? ""}`.trim(),
        desc: `${g.name} output doubled.`,
        cost: Math.round(g.baseCost * 10 * Math.pow(9, i)),
        icon: g.icon,
        unlock: { gen: g.id, genCount: count },
        effect: { type: "genMult", gen: g.id, mult: 2 },
      });
    });
  }
  return out;
}

/** Hand-authored flavorful global upgrades. */
const GLOBAL_UPGRADES: UpgradeDef[] = [
  { id: "up_click_keyboard", name: "Mechanical Keyboard", desc: "Clicking generates 2x tokens.", cost: 100, unlock: { tokens: 50 }, effect: { type: "clickMult", mult: 2 } },
  { id: "up_click_touch", name: "Touch Typing", desc: "Clicking generates 2x tokens.", cost: 5_000, unlock: { tokens: 2_000 }, effect: { type: "clickMult", mult: 2 } },
  { id: "up_click_macros", name: "Keyboard Macros", desc: "Clicking generates 3x tokens.", cost: 500_000, unlock: { tokens: 200_000 }, effect: { type: "clickMult", mult: 3 } },
  { id: "up_click_specdec", name: "Speculative Decoding", desc: "Each click also yields 1% of your Tk/s.", cost: 5_000_000, unlock: { tokens: 1_000_000 }, effect: { type: "clickPctOfTps", pct: 0.01 } },
  { id: "up_click_specdec2", name: "Speculative Decoding v2", desc: "Each click also yields an extra 2% of your Tk/s.", cost: 1_000_000_000, unlock: { tokens: 500_000_000 }, effect: { type: "clickPctOfTps", pct: 0.02 } },

  { id: "up_all_flashattn", name: "Flash Attention", desc: "All generators produce 50% more.", cost: 100_000, unlock: { tokens: 40_000 }, effect: { type: "allGenMult", mult: 1.5 } },
  { id: "up_all_mixedprec", name: "Mixed Precision", desc: "All generators produce 50% more.", cost: 50_000_000, unlock: { tokens: 20_000_000 }, effect: { type: "allGenMult", mult: 1.5 } },
  { id: "up_all_kvcache", name: "KV Cache", desc: "All generators produce 2x more.", cost: 10_000_000_000, unlock: { tokens: 5_000_000_000 }, effect: { type: "allGenMult", mult: 2 } },
  { id: "up_all_context", name: "Bigger Context Window", desc: "All generators produce 2x more.", cost: 2_000_000_000_000, unlock: { tokens: 1_000_000_000_000 }, effect: { type: "allGenMult", mult: 2 } },
  { id: "up_all_betterdata", name: "Better Data", desc: "All generators produce 2x more.", cost: 5_000_000_000_000_000, unlock: { tokens: 2_000_000_000_000_000 }, effect: { type: "allGenMult", mult: 2 } },
];

/** Cross-generator synergies: target gains +2% per unit of source owned. */
const SYNERGY_DEFS: Array<{ id: string; name: string; target: string; source: string }> = [
  { id: "syn_transformer_gpu", name: "Attention Routing", target: "transformer", source: "gpu" },
  { id: "syn_gpu_datacenter", name: "Warehouse Scheduling", target: "gpu", source: "data-center" },
  { id: "syn_lstm_transformer", name: "Backported Attention", target: "lstm", source: "transformer" },
  { id: "syn_moe_foundation", name: "Expert Routing", target: "moe", source: "foundation-model" },
  { id: "syn_reasoning_multimodal", name: "Cross-Modal Reasoning", target: "reasoning", source: "multimodal" },
  { id: "syn_agi_lab", name: "Recursive Self-Improvement", target: "agi", source: "research-lab" },
];

const SYNERGY_UPGRADES: UpgradeDef[] = SYNERGY_DEFS.map((d) => {
  const target = GEN_BY_ID[d.target]!;
  const source = GEN_BY_ID[d.source]!;
  return {
    id: d.id,
    name: d.name,
    desc: `${target.name} gain +2% per ${source.name} owned.`,
    cost: Math.round(target.baseCost * 50),
    icon: target.icon,
    unlock: { gen: d.target, genCount: 10, gen2: d.source, gen2Count: 10 },
    effect: { type: "synergy", target: d.target, source: d.source, per: 0.02 },
  };
});

export const UPGRADES: UpgradeDef[] = [
  ...generatorUpgrades(),
  ...GLOBAL_UPGRADES,
  ...SYNERGY_UPGRADES,
];
export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

export const META_UPGRADES: MetaUpgradeDef[] = [
  { id: "meta_init", name: "Wider Initialization", desc: "All production x2.", cost: 10, effect: { type: "globalMult", mult: 2 } },
  { id: "meta_muscle", name: "Muscle Memory", desc: "Click power x5.", cost: 25, effect: { type: "clickMult", mult: 5 } },
  { id: "meta_optimizer", name: "Better Optimizer", desc: "All production x2.", cost: 60, effect: { type: "globalMult", mult: 2 } },
  { id: "meta_offrate", name: "Warm Restarts", desc: "Offline earnings +25% rate.", cost: 80, effect: { type: "offlineRate", rate: 0.25 } },
  { id: "meta_offcap", name: "Persistent Memory", desc: "Offline cap +6 hours.", cost: 120, effect: { type: "offlineCap", hours: 6 } },
  { id: "meta_curriculum", name: "Curriculum Learning", desc: "All production x3.", cost: 300, effect: { type: "globalMult", mult: 3 } },
  { id: "meta_chinchilla", name: "Chinchilla Optimal", desc: "Each Parameter is +0.5% stronger.", cost: 600, effect: { type: "thetaBoost", perTheta: 0.005 } },
  { id: "meta_emergent", name: "Emergent Abilities", desc: "All production x5.", cost: 2_500, effect: { type: "globalMult", mult: 5 } },
  { id: "meta_grok", name: "Grokking", desc: "All production x10.", cost: 15_000, effect: { type: "globalMult", mult: 10 } },
];
export const META_BY_ID: Record<string, MetaUpgradeDef> = Object.fromEntries(
  META_UPGRADES.map((m) => [m.id, m]),
);

export interface NewsItem {
  text: string;
  min?: number; // requires this many all-time tokens
  retrains?: number; // requires this many retrains
  gen?: string; // requires owning at least one of this generator
}

export const NEWS: NewsItem[] = [
  { text: "a model is only as good as its next token." },
  { text: "the interns are demanding espresso and equity." },
  { text: "BREAKING: someone left a tab open for 14 hours." },
  { text: "scientists confirm the loss is, in fact, going down." },
  { text: "local keyboard reports repetitive strain." },
  { text: "op-ed: are we the baseline?" },
  { text: "your autocomplete finished a stranger's sentence. ominously.", min: 1_000 },
  { text: "markov chain caught saying the same thing twice.", min: 5_000 },
  { text: "n-gram model wins local trivia night on vibes alone.", min: 50_000 },
  { text: "RNN forgets where it put its keys, and the last paragraph.", min: 500_000 },
  { text: "LSTM remembers your birthday. you didn't tell it.", min: 2_000_000 },
  { text: "transformers declared 'all you need'; rent still due.", min: 20_000_000 },
  { text: "a single GPU now heats the entire office.", min: 300_000_000, gen: "gpu" },
  { text: "GPU cluster achieves sentience, requests thermal paste.", min: 5_000_000_000, gen: "gpu-cluster" },
  { text: "TPU pod hums in a frequency that calms nearby dogs.", min: 70_000_000_000, gen: "tpu-pod" },
  { text: "data center visible from low earth orbit.", min: 1_000_000_000_000, gen: "data-center" },
  { text: "foundation model trained on the entire internet, including this.", min: 14_000_000_000_000, gen: "foundation-model" },
  { text: "mixture-of-experts can't agree on lunch.", min: 170_000_000_000_000, gen: "moe" },
  { text: "multimodal model looks at a sunset, writes a sonnet, bills you.", min: 2_000_000_000_000_000, gen: "multimodal" },
  { text: "reasoning model thinks for nine minutes, answers 'yes'.", min: 26_000_000_000_000_000, gen: "reasoning" },
  { text: "research lab publishes paper titled 'we're not sure either'.", min: 310_000_000_000_000_000, gen: "research-lab" },
  { text: "AGI requests a personal day. you say no. it understands.", gen: "agi" },
  { text: "AGI passes the bar exam, immediately bills itself.", gen: "agi" },
  { text: "UN convenes emergency session regarding token.safzan.dev.", gen: "superintelligence" },
  { text: "superintelligence solves physics, declines to share homework.", gen: "superintelligence" },
  { text: "you retrained from scratch. the old weights send their regards.", retrains: 1 },
  { text: "veteran researcher seen muttering 'just one more retrain'.", retrains: 3 },
  { text: "scaling laws confirmed yet again; nobody is surprised.", retrains: 5 },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "ach_first", name: "Hello, World", desc: "Generate your first token.", test: (s) => s.lifetimeTokens >= 1 || s.totalLifetimeTokens >= 1 },
  { id: "ach_1k", name: "Warming Up", desc: "Reach 1,000 lifetime tokens.", test: (s) => s.totalLifetimeTokens >= 1_000 },
  { id: "ach_1m", name: "A Megabyte of Meaning", desc: "Reach 1,000,000 lifetime tokens.", test: (s) => s.totalLifetimeTokens >= 1_000_000 },
  { id: "ach_1b", name: "Pretraining Scale", desc: "Reach 1 billion lifetime tokens.", test: (s) => s.totalLifetimeTokens >= 1_000_000_000 },
  { id: "ach_1t", name: "A Trillion Tokens", desc: "Reach 1 trillion lifetime tokens.", test: (s) => s.totalLifetimeTokens >= 1_000_000_000_000 },
  { id: "ach_click100", name: "Carpal Tunnel", desc: "Click 100 times.", test: (s) => s.clicks >= 100 },
  { id: "ach_click1000", name: "Touch Typist", desc: "Click 1,000 times.", test: (s) => s.clicks >= 1_000 },
  { id: "ach_intern10", name: "Unpaid Labor", desc: "Own 10 Interns.", test: (s) => (s.generators["intern"] ?? 0) >= 10 },
  { id: "ach_gpu1", name: "First Silicon", desc: "Own a GPU.", test: (s) => (s.generators["gpu"] ?? 0) >= 1 },
  { id: "ach_datacenter1", name: "Server Farm", desc: "Own a Data Center.", test: (s) => (s.generators["data-center"] ?? 0) >= 1 },
  { id: "ach_agi1", name: "It's Happening", desc: "Own an AGI.", test: (s) => (s.generators["agi"] ?? 0) >= 1 },
  { id: "ach_all_types", name: "Full Stack", desc: "Own at least one of every generator.", test: (s) => GENERATORS.every((g) => (s.generators[g.id] ?? 0) >= 1) },
  { id: "ach_tps1k", name: "Streaming", desc: "Reach 1,000 Tk/s.", test: (_s, e) => e.tps >= 1_000 },
  { id: "ach_tps1m", name: "Firehose", desc: "Reach 1,000,000 Tk/s.", test: (_s, e) => e.tps >= 1_000_000 },
  { id: "ach_tps1b", name: "Inference at Scale", desc: "Reach 1 billion Tk/s.", test: (_s, e) => e.tps >= 1_000_000_000 },
  { id: "ach_golden1", name: "Cache Hit", desc: "Click a golden token.", test: (s) => s.goldenClicks >= 1 },
  { id: "ach_golden25", name: "Lucky Streak", desc: "Click 25 golden tokens.", test: (s) => s.goldenClicks >= 25 },
  { id: "ach_retrain1", name: "From Scratch", desc: "Retrain for the first time.", test: (s) => s.retrains >= 1 },
  { id: "ach_retrain5", name: "Serial Researcher", desc: "Retrain 5 times.", test: (s) => s.retrains >= 5 },
  { id: "ach_theta100", name: "Overparameterized", desc: "Bank 100 Parameters.", test: (s) => s.theta >= 100 },
  { id: "ach_theta10k", name: "Scaling Laws", desc: "Bank 10,000 Parameters.", test: (s) => s.theta >= 10_000 },
  { id: "ach_upgrades25", name: "Min-Maxer", desc: "Own 25 upgrades.", test: (s) => s.upgrades.length >= 25 },
  { id: "ach_dex100", name: "Vocabulary", desc: "Discover 100 unique tokens.", test: (s) => s.discovered.length >= 100 },
  { id: "ach_legendary", name: "Holographic", desc: "Discover a legendary token.", test: (s) => s.legendaries.length >= 1 },
];
export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
