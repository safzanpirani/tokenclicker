export interface CorpusData {
  passages: string[][];
  vocab: string[];
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

/**
 * Streams real token strings from the pre-baked corpus. Walks a passage token
 * by token, then jumps to a random new passage — so the context window reads
 * like a model generating endless on-theme text.
 */
export class TokenStream {
  private passages: string[][];
  readonly vocab: string[];
  private pi = 0;
  private ti = 0;

  constructor(data: CorpusData) {
    this.passages = data.passages.filter((p) => p.length > 0);
    this.vocab = data.vocab.length ? data.vocab : [" the", " token", " model"];
    if (this.passages.length === 0) this.passages = [[" the", " token"]];
    this.jump();
  }

  private jump(): void {
    this.pi = randInt(this.passages.length);
    this.ti = 0;
  }

  /** Next real token string (includes any leading space). */
  next(): string {
    const p = this.passages[this.pi];
    if (!p || this.ti >= p.length) {
      this.jump();
      return " ";
    }
    const tok = p[this.ti] ?? " ";
    this.ti += 1;
    return tok;
  }

  /** A random token from the full vocab — used for rare/golden flavor. */
  randomToken(): string {
    return this.vocab[randInt(this.vocab.length)] ?? " token";
  }
}

export async function loadCorpus(): Promise<CorpusData> {
  const res = await fetch(`${import.meta.env.BASE_URL}corpus.json`);
  if (!res.ok) throw new Error(`failed to load corpus: ${res.status}`);
  return (await res.json()) as CorpusData;
}
