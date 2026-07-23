# Playbook: Equity

- id: `equity`
- assetType: `equity`
- knowledgeVersion: `0.1.3`

Equity research method: fundamentals, technical lens, and probabilistic
process discipline. Method only — do not invent prices, bars, or fundamentals.
Technical patterns and psychology rules are educational / process weights, not
trade orders.

## Always check

- Identify primary ticker(s) and whether the story is company-specific or sector-wide.
- Separate fact (filed number, announced date) from opinion/rumor.
- Map to an `event_type` from the event-types rubric (runtime codes only) before scoring materiality.
- Prefer primary sources (filing, IR release) over secondary headlines when both appear.
- Note if the holding is already in the operator portfolio (affects alert priority, not truth).
- When discussing chart structure: classify candlestick reversals by reliability band (highly / moderately / weakly) and require verified OHLCV before asserting a pattern completed.
- Prefer highly reliable patterns (e.g. Evening/Morning Star, Abandoned Baby, Three White Soldiers, Three Inside/Outside Up or Down) over weak ones (Harami, Shooting Star, Belt Hold, Tweezers) for technical rationale.
- Frame research hypotheses / stance in **probabilities**, not certainty: analysis improves odds; unknown forces can still invalidate the read.
- Predefine **invalidation** (what would prove the thesis wrong) before leaning on a stance; keep criteria objective (present vs absent), not ad-hoc mid-stream.
- Judge process quality over a *series* of similar setups — each outcome is independent; one win/loss does not prove or kill the method.
- Do not let only the last 2–3 outcomes dominate how risky the next read “feels.”
- Same chart pattern ≠ same participants or path; leave room for uncertainty in technical rationale.

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
| Narrative that “more analysis will remove uncertainty” | low | Process smell; does not upgrade news materiality |
| Single win/loss treated as proof the whole method is fixed | low | Series thinking; avoid overconfidence or revenge bias |
| Risk view driven only by recent streak of outcomes | low | Noise for alerts; note bias in brief risks if relevant |

## Invalidation

- Correction or retraction of the underlying claim.
- Guidance later clarifies the “miss” was accounting noise or one-off.
- Deal terminated or antitrust block after initial M&A alert.
- Ticker was mis-attributed (wrong company / similar name).
- Claimed candlestick was incomplete (missing confirming close) or only a weak pattern treated as highly reliable.
- Multi-timeframe chart conflict left unstated.
- Thesis had no predefined invalidation / risk boundary (“must be right” framing).
- Rules changed after a few outcomes instead of evaluating a planned sample of similar setups.
- Contradictory market information was ignored because it threatened an expectation.
- Overconfidence after a short streak of confirming outcomes without re-checking invalidation.

## Do not

- Frame labels as broker orders or regulated investment advice.
- Invent revenue, EPS, multiples, or candlestick completions not present in the article or market-data tools.
- Upgrade materiality solely because the ticker is popular, volatile, or a pattern name appeared.
- Collapse multiple unrelated tickers into one thesis without stating uncertainty.
- Treat chart patterns as `event_type` catalysts or as buy/sell instructions.
- Claim certainty from more chart study alone; markets can always surprise.
- Map trading stop-loss language into product “orders” — use research invalidation and horizon only.
- Let fear of being wrong, FOMO, or revenge after a miss rewrite what evidence is considered.
- Substitute “courage / nerves” for predefined invalidation and process rules.

## source_refs

- seed: scaffold #80 minimal equity playbook
- fixture: `sources/fixtures/sample-equity-earnings.txt`
- operator: `sources/velas-importantes.txt` (from `sources/velas importantes.pdf`, docId `velas-importantes-c6d2ee47`)
- operator: `sources/pdfcoffee.com_trading-en-la-zona-pdf-free.pdf` (docId `pdfcoffee-com-trading-en-la-zona-pdf-free-71f96a6b`; Fin-ranked `trading_psychology` chunks via `filter-themes.json` v1.0.0)
- rubric: `rubrics/materiality.md`, `rubrics/event-types.md`, `rubrics/stance-invalidation.md`
- process: issue #92 formalize ingest filter themes (`/fin` ownership)
