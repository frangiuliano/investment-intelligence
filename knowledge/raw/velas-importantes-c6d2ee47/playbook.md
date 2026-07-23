# Playbook: Equity

- id: `equity`
- assetType: `equity`
- knowledgeVersion: `0.1.1`

Equity research method (fundamentals + technical lens). Method only — do not
invent prices, bars, or fundamentals. Technical pattern names are educational
confidence weights, not trade orders.

## Always check

- Identify primary ticker(s) and whether the story is company-specific or sector-wide.
- Separate fact (filed number, announced date) from opinion/rumor.
- Map to an `event_type` from the event-types rubric (runtime codes only) before scoring materiality.
- Prefer primary sources (filing, IR release) over secondary headlines when both appear.
- Note if the holding is already in the operator portfolio (affects alert priority, not truth).
- When discussing chart structure: classify candlestick reversals by reliability band (highly / moderately / weakly) and require verified OHLCV before asserting a pattern completed.
- Prefer highly reliable patterns (e.g. Evening/Morning Star, Abandoned Baby, Three White Soldiers, Three Inside/Outside Up or Down) over weak ones (Harami, Shooting Star, Belt Hold, Tweezers) for technical rationale.

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
| Headline names a candlestick with no company event | low | Chart jargon ≠ fundamental materiality |
| Weak candlestick cited as sole “signal” | low | Educational only; do not upgrade alerts |
| Highly reliable pattern used only with attached bars in a brief | low–medium | Technical lens / invalidation context — does not replace fundamentals |

## Invalidation

- Correction or retraction of the underlying claim.
- Guidance later clarifies the “miss” was accounting noise or one-off.
- Deal terminated or antitrust block after initial M&A alert.
- Ticker was mis-attributed (wrong company / similar name).
- Claimed candlestick was incomplete (missing confirming close) or only a weak pattern treated as highly reliable.
- Multi-timeframe chart conflict left unstated.

## Do not

- Frame labels as broker orders or regulated investment advice.
- Invent revenue, EPS, multiples, or candlestick completions not present in the article or market-data tools.
- Upgrade materiality solely because the ticker is popular, volatile, or a pattern name appeared.
- Collapse multiple unrelated tickers into one thesis without stating uncertainty.
- Treat chart patterns as `event_type` catalysts or as buy/sell instructions.

## source_refs

- seed: scaffold #80 minimal equity playbook
- fixture: `sources/fixtures/sample-equity-earnings.txt`
- operator: `sources/velas-importantes.txt` (from `sources/velas importantes.pdf`, docId `velas-importantes-c6d2ee47`)
- rubric: `rubrics/materiality.md`, `rubrics/event-types.md`, `rubrics/stance-invalidation.md`
