# Playbook: Bond

- id: `bond`
- assetType: `bond`
- knowledgeVersion: `0.1.0`

Seed heuristics for fixed income (sovereign, corporate, treasury-like). Focus
on credit, cash-flow timing, and policy — not equity narrative.

## Always check

- Identify issuer, instrument (ticker/ISIN if present), currency, and maturity/coupon cues.
- Classify: rate/policy move vs credit event vs technical (reopening, auction).
- Prefer official issuer/central-bank language over market color.
- Separate mark-to-market noise from cash-flow impairment.
- Note if the holding is duration-sensitive vs credit-sensitive when the article allows.

## Materiality heuristics

| Signal | Suggested materiality | Notes |
|--------|----------------------|-------|
| Default, missed coupon, restructuring | high | Confirm which instrument |
| Rating downgrade/upgrade (agency) | medium–high | Multi-notch or watchlist matters more; `event_type` = `other` |
| Central-bank policy surprise affecting the curve | medium–high | Tie to the held tenor if possible |
| Auction / reopening / tap without stress | low–medium | Operational unless failed auction |
| Spread gossip without primary source | low | Soft; prefer digest |
| Equity-only rumor applied to a bond ticker | low | Wrong asset lens |

## Invalidation

- Payment was made / grace period cured after a “miss” headline.
- Rating action was on a different subsidiary or series.
- Policy move was fully priced and later walked back with no credit change.

## Do not

- Translate bond stress into equity-style “buy/sell the stock” language.
- Invent yields, spreads, or recovery rates.
- Ignore currency of denomination when scoring impact.
- Treat calendar auctions as crises by default.

## source_refs

- seed: scaffold #80 minimal bond playbook
- rubric: `rubrics/materiality.md`, `rubrics/event-types.md`, `rubrics/stance-invalidation.md`
