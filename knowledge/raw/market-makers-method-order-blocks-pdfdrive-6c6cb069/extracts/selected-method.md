### Extract: market-makers-method (Fin-ranked selected chunks)

Ranking: `npm run knowledge:rank-chunks -- … --genre technical_analysis`
using `knowledge/_prompts/filter-themes.json` v1.1.0.
Selected 16 / 81 chunks. Paraphrased **research method** only — not entries,
pip recipes, or broker orders. Complements prior Order Blocks ingest; prefer
confluence / multi-TF / model structure over repeating basic BeOB/BuOB defs.

- Signals / checks:
  - Basic OB reminder: candle preceding a continued impulse often marks the zone
    (bullish = last bearish before up impulse; bearish = last bullish before down).
  - Prefer **high-probability confluence**: pullback into ~61–79% retracement of
    the impulse **plus** prior swing high/low stop cluster (liquidity) **plus**
    nearby S/R — not an isolated “order block” label.
  - Hold **macro / directional premise** first (fundamentals / HTF structure:
    sequence of highs-lows, free run between S/R on H4–D1–W) before citing LTF
    blocks.
  - **Buy/Sell model sketch** (educational): accumulation → deceptive swing /
    stop-hunt toward liquidity → Smart Money Reversal near prior extreme →
    re-accumulation/distribution. Treat as a narrative checklist, not proof of
    intent.
  - Multi-TF workflow (example): D1 for structure + key OBs; H4 for OBs +
    liquidity pools; lower TF only to see reaction at the predefined zone —
    do not start from M15 alone.
  - In ranges: “fair value” / ~50% of the range as mean-reversion magnet; weak
    or fails in strong one-way trends (value zone then drifts with trend).
  - False-break / “turtle soup” style traps: sweep of obvious highs/lows then
    reverse — liquidity narrative for invalidation context.
  - Prefer setups with **repeatable predictability** (same pattern sequence →
    same forecast); avoid one-off stories that rewrite after the print.
  - Session / “true day” timing is FX-centric context only — note if a source
    claims session-bound reversals; never invent clock rules without tools.
- Materiality hints (signal → low|medium|high):
  - Headline only names order block / ICT / turtle soup / Juda / fair value → low
  - OB jargon as sole upgrade to alert → low
  - Verified multi-TF structure + Fib/liquidity confluence + company catalyst →
    low–medium technical lens only
  - Certainty that 61% or 79% “must” hold → low (source admits both occur)
  - Correlated-pair “smart money divergence” folklore → low for equity news
- Invalidation / failure modes:
  - LTF block without HTF premise / trend context.
  - Calling every prior candle an OB without impulse + confluence.
  - Post-hoc rename after failed 61% vs 79% reaction.
  - Applying range fair-value logic inside a clear trend without stating drift.
  - Invented institutional intent / pending-order folklore as fact.
- Anti-patterns (do not):
  - Do not map OTE / R:R / “entrar al 79%” into product orders.
  - Do not promote SMC labels to `event_type`.
  - Do not invent pip lengths, GMT session guarantees, or unobserved order flow.
  - Do not duplicate entire prior Order Blocks playbook bullets — add confluence
    and model structure only.
- Quotes or paraphrases worth keeping (short):
  - High-odds OB ≈ Fib 61–79% + liquidity at prior swing + S/R.
  - Predictability comes from repeated pattern sequences, not unique stories.
  - Macro premise before micro blocks.
