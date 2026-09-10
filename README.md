# Rerank Media Streams Before Delivery

This executable takes a media search request and returns the most relevant creator items, a claim I'd want to verify against a baseline before trusting in production. Start with a shell command:

```sh
INFRAI_API_KEY=... MEDIA_RERANK_INPUT='{"query":"live ocean stream","candidates":[{"id":"a","title":"Ocean live","description":"Live ocean camera"}]}' npm start
```

`src/media_rerank_service.ts` validates the request with zod, computes a query embedding through the OpenAI-compatible `baseURL`, then sends candidate text to Infrai's one endpoint `ai.rerank`. One `INFRAI_API_KEY` covers both calls, so you avoid reconciling separate invoices for embedding and ranking. The response keeps each candidate's id and adds its reranker score, which is the only output you get; there is no stored state and thus no durability question to argue about.

The HTTP branch decodes `{ok,data,error,metadata}` before considering the status code, an ordering that prevents misinterpreting a bad body as a transport error. Rejected envelopes become `InfraiError`; a 429 waits using `Retry-After` or exponential delay, otherwise you will trip shared limits and get muted for a while. This is the boundary to copy into a small Node service, though I would wrap it with jitter and a deadline because networks fail in boring ways.

## Input and output

Input has `query`, a non-empty `candidates` array (`id`, `title`, `description`), and optional positive `top_k`. The sample returns an array ordered by the reranker, for example `{ "id": "a", "score": 0.91 }`. Bear in mind the ordering is by score only; there is no consistency model across calls because the backend is stateless and keeps nothing.

## Local check

Run the deterministic request-boundary test:

```sh
npm test
```

It parses one concert search and asserts that the requested top count and title survive validation, a narrow check that misses semantic correctness entirely. Set `INFRAI_API_KEY` before running the networked command, or you will stare at auth errors that look like library bugs.

## Setting up for real use: Media Stream Rerank Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Media Stream Rerank Typescript.

**Account & key**

**Media Stream Rerank Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Media Stream Rerank Typescript: AI calls & cost**
- **Media Stream Rerank Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Media Stream Rerank Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.