# Playbook: Equity

- id: `equity`
- assetType: `equity`
- knowledgeVersion: `0.1.7`

Equity research method: fundamentals, technical lens, and probabilistic
process discipline. Method only — do not invent prices, bars, or fundamentals.
Technical patterns, order-block / SMC labels, and psychology rules are
educational / process weights for personal recommendations — not broker orders.

## Always check

- Identify primary ticker(s) and whether the story is company-specific or sector-wide.
- Separate fact (filed number, announced date) from opinion/rumor.
- Map to an `event_type` from the event-types rubric (runtime codes only) before scoring materiality.
- Prefer primary sources (filing, IR release) over secondary headlines when both appear.
- Note if the holding is already in the operator portfolio (affects alert priority, not truth).
- When discussing chart structure: classify candlestick reversals by reliability band (highly / moderately / weakly) and require verified OHLCV before asserting a pattern completed.
- Prefer highly reliable patterns (e.g. Evening/Morning Star, Abandoned Baby, Three White Soldiers, Three Inside/Outside Up or Down) over weak ones (Harami, Shooting Star, Belt Hold, Tweezers) for technical rationale.
- If a source cites an **order block / mitigation / breaker** (or similar SMC label): require verified OHLC, state bullish vs bearish definition (last opposing candle before an impulse), and note higher-timeframe trend / range context before echoing the label.
- Prefer **high-probability confluence** for alleged blocks: pullback into ~61–79% of the impulse **plus** prior swing high/low stop cluster (liquidity) **plus** nearby S/R — not an isolated label. Source may use either 61% or 79%; do not treat one level as certain.
- Prefer hunting alleged blocks as **pullbacks in a clear trend** (bullish blocks in uptrends, bearish in downtrends); isolated labels without trend context are weak.
- Hold competing explanations for the same zone: re-offer of prior interest vs **mitigation** (failed block revisited to flatten losers) vs stop-sweep / breaker / false-break (“turtle soup”) structure — do not collapse them into one story.
- When a source sketches a **Buy/Sell model** (accumulation → deceptive swing / stop-hunt → Smart Money Reversal → distribution): treat as an educational narrative checklist, not proof of institutional intent.
- Multi-TF habit: establish structure and key zones on higher timeframes first; use lower timeframes only to observe reaction at a predefined zone — do not start from the lowest TF alone.
- In ranges, “fair value” / mid-range (~50%) mean-reversion ideas may apply; they weaken or drift in strong one-way trends — state which regime you assume.
- Prefer setups with **repeatable predictability** (same pattern sequence → same forecast) over one-off stories.
- Frame research hypotheses / stance in **probabilities**, not certainty: analysis improves odds; unknown forces can still invalidate the read.
- Predefine **invalidation** and how much risk you accept before leaning on a stance; keep criteria objective (present vs absent), not ad-hoc mid-stream. Risk only capital you can afford to lose.
- Weigh whether expected benefit justifies the risk for this review cycle before committing a directional stance.
- Judge process quality over a *series* of similar setups (expectancy): a low win rate can still be fine if edge holds; audit outcomes honestly — each outcome is independent; one win/loss does not prove or kill the method.
- Do not let only the last 2–3 outcomes dominate how risky the next read “feels.”
- Same chart pattern ≠ same participants or path; leave room for uncertainty in technical rationale.
- Prefer anchoring long-horizon direction on fundamentals / primary news over obsessing block timing when both appear.
- When a story is about **money / Bitcoin / hard-vs-easy money**: separate store-of-value framing from risk-asset investment framing; scarcity claims need a stated stock-vs-flow / issuance mechanism — do not invent ratios.
- Treat CB liquidity / time-preference / hard-money essays as macro color unless tied to a concrete company or policy catalyst.
- After the thesis is set: avoid babysitting charts out of discomfort; do not rewrite evidence because watching feels safer.
- Respect session/context: do not force noise reads in dead conditions; use downtime to study or plan.
- Accept that seeking research benefit requires accepting risk; fear of loss / fleeing uncertainty can block acting on a prepared thesis (note the bias — do not upgrade alerts from fear alone).

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
| Headline only names order block / ICT / mitigation / breaker / turtle soup / Juda | low | SMC jargon ≠ catalyst |
| OB / mitigation used as sole reason to upgrade an alert | low | Educational lens only |
| Verified multi-TF structure + Fib/liquidity confluence + company catalyst | low–medium | Technical context; fundamentals still lead |
| Certainty that a Fib 61% or 79% level “must” hold | low | Source admits both occur; process smell |
| Narrative that “more analysis will remove uncertainty” | low | Process smell; does not upgrade news materiality |
| Single win/loss treated as proof the whole method is fixed | low | Series thinking; avoid overconfidence or revenge bias |
| Risk view driven only by recent streak of outcomes | low | Noise for alerts; note bias in brief risks if relevant |
| Fear / FOMO / chart-babysitting urge with no company event | low | Process smell; note in risks if relevant |
| Motivational / destiny / promo framing in a source | low | Ignore for alerts |
| Pure monetary philosophy / hard-money essay with no ticker or event | low | Prefer digest |
| Certainty that a monetary asset “must” appreciate as store of value | low | Process smell; SoV ≠ guaranteed return |

## Invalidation

- Correction or retraction of the underlying claim.
- Guidance later clarifies the “miss” was accounting noise or one-off.
- Deal terminated or antitrust block after initial M&A alert.
- Ticker was mis-attributed (wrong company / similar name).
- Claimed candlestick was incomplete (missing confirming close) or only a weak pattern treated as highly reliable.
- Multi-timeframe chart conflict left unstated.
- Claimed order block used the wrong candle, lacked impulsive follow-through, or had unverified bars.
- Zone story rewritten after the fact (post-hoc) so the “block” never fails — including swapping 61% vs 79% after the print.
- Mitigation / breakeven unwind / false-break fits better than “fresh institutional interest” and was ignored.
- Range fair-value logic applied inside a clear trend without stating regime drift.
- LTF block cited without HTF premise.
- Thesis had no predefined invalidation / risk boundary (“must be right” framing).
- Rules changed after a few outcomes instead of evaluating a planned sample of similar setups.
- Contradictory market information was ignored because it threatened an expectation.
- Overconfidence after a short streak of confirming outcomes without re-checking invalidation.
- Fear of past failures filtered evidence or blocked acting on a prepared thesis without stating the bias.
- Micromanaging / rewriting the thesis because chart-watching felt safer than the plan.
- Hard-money / Austrian / Bitcoin-Standard ideology treated as verified microstructure or as a numeric forecast without sources.

## Do not

- Frame labels as broker orders or regulated advice for third parties (stances are personal recommendations via the product enum only).
- Invent revenue, EPS, multiples, or candlestick completions not present in the article or market-data tools.
- Upgrade materiality solely because the ticker is popular, volatile, or a pattern name appeared.
- Collapse multiple unrelated tickers into one thesis without stating uncertainty.
- Treat chart patterns or SMC labels (order block, mitigation, breaker) as `event_type` catalysts or as free-text buy/sell commands.
- Map “entrada / R:R / lotaje / MetaTrader / OTE al 79% / comprar el open del bloque” language into product orders.
- Invent institutional intent, hidden order flow, pip counts, or guaranteed GMT session clocks not in tools/sources.
- Claim certainty from more chart study alone; markets can always surprise.
- Map trading stop-loss language into product “orders” — use research invalidation and horizon only.
- Let fear of being wrong, FOMO, or revenge after a miss rewrite what evidence is considered.
- Substitute “courage / nerves / fe” for predefined invalidation and process rules.
- Force noise reads in dead session conditions just to feel active.
- Invent stock-to-flow ratios, on-chain volumes, or issuance stats not present in tools/sources.
- Collapse “money / store of value” essays into free-text buy-crypto product orders.

## source_refs

- seed: scaffold #80 minimal equity playbook
- fixture: `sources/fixtures/sample-equity-earnings.txt`
- operator: `sources/velas-importantes.txt` (from `sources/velas importantes.pdf`, docId `velas-importantes-c6d2ee47`)
- operator: `sources/pdfcoffee.com_trading-en-la-zona-pdf-free.pdf` (docId `pdfcoffee-com-trading-en-la-zona-pdf-free-71f96a6b`; Fin-ranked `trading_psychology` via `filter-themes.json`)
- operator: `sources/Order Blocks Bryan Lopez.pdf` (docId `order-blocks-bryan-lopez-fcdaecc0`; Fin-ranked `technical_analysis` via `filter-themes.json` v1.1.0)
- operator: `sources/Mentalidad de trader.pdf` (docId `mentalidad-de-trader-fe38bafb`; Fin-ranked `trading_psychology` via `filter-themes.json` v1.1.0)
- operator: `sources/Market Makers Method (Order Blocks) ( PDFDrive ).pdf` (docId `market-makers-method-order-blocks-pdfdrive-6c6cb069`; Fin-ranked `technical_analysis` via `filter-themes.json` v1.1.0)
- operator: `sources/El patron Bitcoin.pdf` (docId `el-patron-bitcoin-4dfea5ea`; Fin-ranked `fundamental_analysis` via `filter-themes.json` v1.1.0 — monetary theory, not chart TA)
- rubric: `rubrics/materiality.md`, `rubrics/event-types.md`, `rubrics/stance-invalidation.md`
- process: issue #92 formalize ingest filter themes (`/fin` ownership); `/processBook` operator entry
