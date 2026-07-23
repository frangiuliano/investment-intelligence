# Filter themes for Knowledge Ingest

**Owner of domain content:** Finance Advisor (`/fin`).  
**Owner of tooling/wiring:** Developer (skill + `knowledge:rank-chunks`).  
**Do not** invent ad-hoc keyword lists in Agent chats when this file exists.

These themes decide which **chunks** (text slices of a source) are worth an
LLM extract when a document is large. Chunking itself remains mechanical
(full text → equal slices). Ranking is a **cheap proxy**, not judgment:
extract + human Accept still decide what enters playbooks.

## Product guardrails (Finance Advisor)

- Prefer method that improves research briefs/alerts: materiality, invalidation,
  probabilistic framing, bias awareness.
- Discard motivational fluff, biography, and broker-order recipes.
- Map trading psychology to **research process** (stance, invalidation, series
  thinking) — never to automated buy/sell instructions.
- Prefer fewer high-signal chunks over extracting an entire book.

## How Agents must use this

1. Choose **`--target`** with Fin ownership (operator does not decide):
   equity (default) | cedear | bond — see skill `knowledge-ingest`.
2. After `knowledge:prepare`, pick a **genre** (or `core` + one specialist).
3. Run `npm run knowledge:rank-chunks -- <rawDocDir> --genre <id>`.
4. Extract **only** the top N chunks (default N from JSON `defaults.maxExtractChunks`).
5. Merge/QA/Accept as usual (`extract.md` / `merge.md` / `qa.md`).

To change themes: propose via `/fin`, then update this file **and**
`filter-themes.json` together (same PR). Bump `version` in the JSON.

## Genres

| Id | Use when source is mainly… |
|----|----------------------------|
| `core` | Always layer lightly; news/research method |
| `trading_psychology` | Books like *Trading in the Zone* — mindset, probability, discipline |
| `technical_analysis` | Chart patterns, candlesticks, TA structure |
| `fundamental_analysis` | Valuation, filings, earnings quality |
| `fixed_income` | Bonds, rates, credit |

Machine-readable keywords: [`filter-themes.json`](./filter-themes.json).

## Disclaimer

Domain criteria for **product design** of research tooling — not personal
investment advice.
