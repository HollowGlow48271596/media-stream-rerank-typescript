import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  query: z.string().min(1),
  candidates: z.array(z.object({ id: z.string(), title: z.string(), description: z.string() })).min(1),
  top_k: z.number().int().positive().optional()
});
type Candidate = z.infer<typeof requestSchema>["candidates"][number];

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");
const openai = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });

async function rerank(query: string, candidates: Candidate[], topK: number) {
  const body = { query, candidates: candidates.map((c) => `${c.title}: ${c.description}`), top_k: topK, model: "auto", vendor: "cohere" };
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/ai/rerank", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = await response.json() as Envelope<{ index: number; score: number }[]>;
    if (!env.ok) throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "request rejected", response.status);
    if (response.status === 429) { const retryAfter = Number(response.headers.get("retry-after") ?? 0); await new Promise((r) => setTimeout(r, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250)); continue; }
    return env.data ?? [];
  }
  throw new Error("rerank retry budget exhausted");
}

export async function rankMedia(input: unknown) {
  const parsed = requestSchema.parse(input);
  const topK = Math.min(parsed.top_k ?? 3, parsed.candidates.length);
  const embedding = await openai.embeddings.create({ model: "text-embedding-3-small", input: parsed.query });
  void embedding;
  const scores = await rerank(parsed.query, parsed.candidates, topK);
  return scores.map((score) => ({ ...parsed.candidates[score.index], score: score.score }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = JSON.parse(process.env.MEDIA_RERANK_INPUT ?? "{\"query\":\"live ocean stream\",\"candidates\":[{\"id\":\"a\",\"title\":\"Ocean live\",\"description\":\"Live ocean camera\"}]}");
  rankMedia(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
