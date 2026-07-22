# Playbook: CEDEAR

- id: `cedear`
- assetType: `cedear`
- knowledgeVersion: `0.1.0`

Seed heuristics for Argentine CEDEARs (certificates representing foreign
underlying shares). Always reason about **underlying** vs local certificate
friction.

## Always check

- Map CEDEAR ticker → underlying equity ticker/ISIN when the article allows.
- Say whether the catalyst is on the underlying (US/EU filing) or local (FX, CNV, liquidity).
- Flag FX / settlement / ratio quirks when they dominate the story.
- Apply equity-style event typing to the **underlying** company when relevant.
- Do not assume local volume equals underlying conviction.

## Materiality heuristics

| Signal | Suggested materiality | Notes |
|--------|----------------------|-------|
| Underlying earnings / M&A / guidance | high | Same bar as equity on the underlying |
| Local listing / ratio / program change | medium–high | CEDEAR-specific operational risk |
| Sharp ARS/USD move with no company news | low–medium | Macro/FX; usually digest unless holding-sized |
| Local broker promo / “CEDEAR del día” | low | Noise unless tied to a real catalyst |
| Underlying halt / corporate action | high | Check depositary mechanics if mentioned |
| Pure local price gap vs ADR without news | low | May be liquidity; avoid over-interpreting |

## Invalidation

- Underlying event was mis-tagged to the wrong CEDEAR/underlying pair.
- Local operational notice was administrative only (no economic impact).
- FX spike reversed and the “thesis” was only currency, not company.

## Do not

- Treat CEDEAR price action as identical to underlying without noting FX/ratio.
- Invent depositary ratios or tax treatments.
- Issue stance language that ignores local liquidity constraints.
- Confuse BYMA ticker folklore with SEC/EDGAR facts.

## source_refs

- seed: scaffold #80 minimal cedear playbook
- related: `playbooks/equity.md` (underlying catalysts)
- rubric: `rubrics/materiality.md`, `rubrics/event-types.md`
