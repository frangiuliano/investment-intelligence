# Rubric: Event types

- id: `event-types`
- knowledgeVersion: `0.1.0`

Canonical `event_type` codes for analysis — **must match** runtime
`EVENT_TYPE_VALUES` in `src/analysis/gemini.constants.ts`. Prefer one primary
type per article. Do not invent codes outside this table.

## Taxonomy

| Code | Use when |
|------|----------|
| `ipo` | IPO, listing, debut pricing |
| `earnings` | Results, EPS/revenue prints, earnings-call takeaways, **and guidance** raise/cut/initiate (same code as the Gemini analysis prompt) |
| `m_and_a` | Merger, acquisition, definitive agreement, tender |
| `regulation` | Material regulator/policy action (fine, approval, ban, rule change) |
| `other` | Clear catalyst outside the list above (e.g. rating action, product launch/recall, lawsuit/settlement, restructuring, pure macro with a named issuer hook) |
| `none` | No meaningful corporate/market event (including pure price commentary) |

## Selection rules

- Choose the **dominant** catalyst; mention secondary themes only in summary text.
- Rumors of M&A stay `m_and_a` but materiality should stay conservative until confirmed.
- Forward outlook alone (no full print) → still `earnings`, not a separate code.
- Agency rating / credit action → `other` (not a dedicated `rating` code).
- Sector/macro color with weak single-issuer hook → usually `none` + low materiality; if the issuer is named and the policy move is the catalyst, prefer `regulation` or `other` as fits.
- Pure price commentary with no catalyst → `none` + low materiality.
- Bond credit events (default, restructuring) → `other`; say which instrument in the summary.

## Out of scope (do not use as codes)

Extra labels such as `guidance`, `rating`, `regulatory`, `macro`, `product`, or
`legal` are **not** valid `event_type` values until the analysis schema/parser
is extended. Map them with the table and rules above.

## source_refs

- seed: scaffold #80
- runtime contract: `EVENT_TYPE_VALUES` / analysis prompt in `src/analysis/`
  (`ipo`, `earnings`, `m_and_a`, `regulation`, `other`, `none`)
