# Rubric: Event types

- id: `event-types`
- knowledgeVersion: `0.1.0`

Canonical `event_type` codes for analysis (English codes; display may be
localized elsewhere). Prefer one primary type per article.

## Taxonomy

| Code | Use when |
|------|----------|
| `earnings` | Results, EPS/revenue prints, earnings call takeaways |
| `guidance` | Forward outlook raised/cut/initiated without full print focus |
| `m_and_a` | Merger, acquisition, definitive agreement, tender |
| `ipo` | IPO, listing, debut pricing |
| `rating` | Agency or major credit action on issuer/instrument |
| `regulatory` | Regulator action, fine, approval, ban |
| `macro` | Rates, inflation, FX, policy with weak single-issuer hook |
| `product` | Launch, recall, pipeline milestone |
| `legal` | Lawsuit, settlement, court ruling (non-regulatory court) |
| `other` | Clear catalyst that does not fit above |
| `none` | No meaningful corporate/market event |

## Selection rules

- Choose the **dominant** catalyst; mention secondary types only in summary text.
- Rumors of M&A stay `m_and_a` but materiality should stay conservative until confirmed.
- Pure price commentary with no catalyst → `none` + low materiality.
- Bond credit events may use `rating` or `other` (restructuring) — say which instrument.

## source_refs

- seed: scaffold #80 (aligned with existing analysis `eventType` usage)
