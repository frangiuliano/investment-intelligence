# Playbook: Equity

- id: `equity`
- assetType: `equity`
- knowledgeVersion: `0.1.0`

Seed heuristics for listed equities (common stock / ADRs treated as equity
when not CEDEARs). Method only — do not invent prices or fundamentals.

## Always check

- Identify primary ticker(s) and whether the story is company-specific or sector-wide.
- Separate fact (filed number, announced date) from opinion/rumor.
- Map to an `event_type` from the event-types rubric (runtime codes only) before scoring materiality.
- Prefer primary sources (filing, IR release) over secondary headlines when both appear.
- Note if the holding is already in the operator portfolio (affects alert priority, not truth).

## Materiality heuristics

| Signal | Suggested materiality | Notes |
|--------|----------------------|-------|
| Earnings beat/miss with guidance change | high | Confirm period and whether guidance moved |
| M&A definitive agreement (buyer/target) | high | Distinguish rumor vs signed deal |
| Guidance cut / raise (standalone) | high | Tie to fiscal period |
| Analyst initiate / PT change only | low–medium | Soft signal unless cluster of revisions |
| Product launch without financials | low–medium | Need adoption or revenue hook |
| Generic sector macro with no company hook | low | Prefer digest over push alert |
| Pure price-action / “stock up X%” with no catalyst | low | Do not treat as fundamental news |

## Invalidation

- Correction or retraction of the underlying claim.
- Guidance later clarifies the “miss” was accounting noise or one-off.
- Deal terminated or antitrust block after initial M&A alert.
- Ticker was mis-attributed (wrong company / similar name).

## Do not

- Frame labels as broker orders or regulated investment advice.
- Invent revenue, EPS, or multiples not present in the article or tools.
- Upgrade materiality solely because the ticker is popular or volatile.
- Collapse multiple unrelated tickers into one thesis without stating uncertainty.

## source_refs

- seed: scaffold #80 minimal equity playbook
- fixture: `sources/fixtures/sample-equity-earnings.txt`
- rubric: `rubrics/materiality.md`, `rubrics/event-types.md`
