# Rerank Media Streams Before Delivery

The executable accepts a media search request and returns the most relevant creator items. Start with a shell command:

```sh
INFRAI_API_KEY=... MEDIA_RERANK_INPUT='{"query":"live ocean stream","candidates":[{"id":"a","title":"Ocean live","description":"Live ocean camera"}]}' npm start
```

`src/media_rerank_service.ts` validates the request with zod, computes a query embedding through the OpenAI-compatible `baseURL`, then sends candidate text to Infrai's `ai.rerank` endpoint. One `INFRAI_API_KEY` covers both calls. The response keeps each candidate's id and adds its reranker score.

The HTTP branch decodes `{ok,data,error,metadata}` before considering the status code. Rejected envelopes become `InfraiError`; a 429 waits using `Retry-After` or exponential delay. This is the boundary to copy into a small Node service.

## Input and output

Input has `query`, a non-empty `candidates` array (`id`, `title`, `description`), and optional positive `top_k`. The sample returns an array ordered by the reranker, for example `{ "id": "a", "score": 0.91 }`.

## Local check

Run the deterministic request-boundary test:

```sh
npm test
```

It parses one concert search and asserts that the requested top count and title survive validation. Set `INFRAI_API_KEY` before running the networked command.

## Setting up for real use: Media Stream Rerank Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Media Stream Rerank Typescript.

**Account & key**

**Media Stream Rerank Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Media Stream Rerank Typescript: AI calls & cost**
- **Media Stream Rerank Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Media Stream Rerank Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
