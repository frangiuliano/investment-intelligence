### Extract: order-blocks-bryan-lopez (Fin-ranked selected chunks)

Ranking: `npm run knowledge:rank-chunks -- … --genre technical_analysis`
using `knowledge/_prompts/filter-themes.json` v1.0.0 (Finance Advisor).
Selected 6 / 9 chunks (`selected-chunks.json`). Paraphrased **research method** only —
not entry recipes or broker orders. Discarded motivational / sales closing text.

- Signals / checks:
  - Treat an “order block” claim as a **named price zone / last opposing candle
    before an impulsive move** in the alleged trend direction — require verified
    OHLCV / structure before echoing it in a brief.
  - Prefer **trend context**: look for bullish blocks in uptrends and bearish
    blocks in downtrends (pullback-in-trend framing), not isolated labels.
  - Note **higher-timeframe directional premise / range** when a source cites
    ICT-style blocks; lower-TF labels without HTF context are weaker.
  - Zones near prior swing highs/lows often coincide with stop clusters
    (“liquidity pools”); prior highs/lows getting swept is common narrative —
    treat as hypothesis, not proof of intent.
  - Distinguish competing explanations for the same zone: re-offer of prior
    institutional interest vs **mitigation / breakeven unwind** of trapped
    positions vs failed block that later acts as resistance/support.
  - “Mitigation block”: prior order-block zone that failed and later revisited
    for loss reduction — label as *failed zone revisited*, not a fresh catalyst.
  - “Breaker”: structure that sweeps a prior high/low (stop run) — context for
    trap/liquidity narrative, not a fundamental event.
  - Source itself warns blocks **do not always work**; demand falsifiable rules
    (same signals → same forecast) and avoid post-hoc renaming after the move.
  - Prefer anchoring long-horizon direction on **fundamentals / primary news**
    over obsessing OB timing when both appear in desk work.
- Materiality hints (signal → low|medium|high):
  - Headline only names “order block / ICT / mitigation / breaker” with no
    company event → low
  - Chart-jargon OB used as sole reason to upgrade an alert → low
  - OB zone cited with verified bars + HTF trend + attached company catalyst →
    low–medium (technical lens / invalidation context only)
  - Narrative that a block makes a rebound “casi asegurado” → low (certainty smell)
  - Motivational / “fórmula mágica / profits” framing → low; ignore for alerts
- Invalidation / failure modes:
  - Claimed block incomplete (wrong candle, no impulsive follow-through, no
    verified OHLC).
  - Forecast changed after the fact to keep the “block” story alive (post-hoc).
  - Alternative mitigation/breakeven story fits better and was ignored.
  - Double-top / failed pattern after the cited zone without stating the miss.
  - Multi-timeframe conflict left unstated (HTF vs LTF labels disagree).
  - Treating stop-sweep narratives as proof of who “benefited” without evidence.
- Anti-patterns (do not):
  - Do not map order-block “entries / R:R / buy the open of the block” into
    product orders or regulated advice.
  - Do not invent institutional intent, pip counts, or unobserved order flow.
  - Do not treat OB / mitigation / breaker as `event_type` catalysts.
  - Do not upgrade materiality solely because SMC jargon appeared.
  - Do not keep certainty language (“prácticamente asegurado”) from the source.
- Quotes or paraphrases worth keeping (short):
  - Bearish OB ≈ last bullish candle before a down impulse; bullish OB ≈ last
    bearish candle before an up impulse (educational definition).
  - Seek blocks in clear trend context (pullbacks), not random ranges.
  - Same signals must yield the same forecast — changing the story after the
    print invalidates the theory.
  - Backtest / research the condition; do not treat any TA formula as magic.
