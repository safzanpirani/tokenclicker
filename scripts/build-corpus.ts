/**
 * Build-time corpus tokenizer.
 *
 * Reads corpus/source.txt, splits into passages (blank-line separated), and
 * tokenizes each with the real o200k_base tokenizer (GPT-4o's vocab). Emits
 * public/corpus.json containing per-token DISPLAY STRINGS so the runtime needs
 * no tokenizer or model at all — it just streams real token boundaries.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { encode, decode } from "gpt-tokenizer/encoding/o200k_base";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const sourcePath = resolve(root, "corpus/source.txt");
const outPath = resolve(root, "public/corpus.json");

const raw = readFileSync(sourcePath, "utf8");

const passages = raw
  .split(/\n\s*\n/)
  .map((p) => p.replace(/\s+/g, " ").trim())
  .filter((p) => p.length > 0);

const tokenizedPassages: string[][] = [];
const vocab = new Map<string, number>();
let totalTokens = 0;

for (const passage of passages) {
  const ids = encode(passage);
  const tokens: string[] = [];
  for (const id of ids) {
    const piece = decode([id]);
    tokens.push(piece);
    vocab.set(piece, (vocab.get(piece) ?? 0) + 1);
    totalTokens += 1;
  }
  tokenizedPassages.push(tokens);
}

// Unique tokens, most-frequent first — used for rare-token flavor events.
const uniqueTokens = [...vocab.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([tok]) => tok);

const out = {
  encoding: "o200k_base",
  generatedAt: new Date().toISOString(),
  passageCount: tokenizedPassages.length,
  totalTokens,
  uniqueTokenCount: uniqueTokens.length,
  passages: tokenizedPassages,
  vocab: uniqueTokens,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out));

console.log(
  `corpus.json: ${out.passageCount} passages, ${out.totalTokens} tokens, ` +
    `${out.uniqueTokenCount} unique → ${outPath}`,
);
