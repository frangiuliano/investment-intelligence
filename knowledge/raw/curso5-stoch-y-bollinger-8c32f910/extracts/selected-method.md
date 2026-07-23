### Extract: curso5-stoch-y-bollinger (Fin-ranked selected chunks)

Ranking: `technical_analysis` via `filter-themes.json` v1.1.0.
Selected 4 / 5 chunks. FXCM lesson — paraphrase **research lens** only;
discard buy/sell recipes and quiz homework.

- Signals / checks:
  - **Stochastic** is an oscillator for deviation from “normal” price — works
    better in **range / mean-reverting** regimes (S/R bounds) than in strong
    one-way trends.
  - Uses: overbought/oversold (commonly watch both %K and %D vs ~80/20),
    %K/%D cross as momentum cue, and **divergence** (price makes new extremes
    but stoch does not) as a caution that the trend may be weakening.
  - Fast vs slow stoch: slow smooths %D further → fewer/later signals, often
    described as more precise; operators choose speed vs noise tradeoff.
  - Crosses **inside** the mid-channel (not at extremes) are weaker cues than
    crosses near overbought/oversold — do not treat mid crosses as high-odds
    alone.
  - **Bollinger Bands**: typically MA ± 2 standard deviations. Best in ranges;
    logic that price far from the mean tends to gravitate back when regime is
    range-bound (bands nearly horizontal).
  - **Squeeze**: bands narrow → volatility contraction; often precedes a larger
    move — treat as a watch for breakout *risk*, not a directional certainty.
  - Band expansion with price riding an outer band can mark trend continuation
    narratives after a squeeze — still require structure/OHLC confirmation.
  - Prefer confluence: candlestick reliability at band extremes (e.g. evening/
    morning star at upper/lower band) over indicator-only stories.
- Materiality hints (signal → low|medium|high):
  - Headline only names stochastic / Bollinger / overbought → low
  - Indicator jargon as sole upgrade to an alert → low
  - Verified squeeze + structure + company catalyst → low–medium technical lens
  - Certainty that 80/20 or outer band “must” reverse → low
- Invalidation / failure modes:
  - Using range oscillators as primary logic in a clear strong trend.
  - Ignoring divergence weakness while chasing new price highs/lows.
  - Treating a squeeze as a timed directional forecast without break direction.
  - Indicator-only thesis with no OHLC / regime statement.
- Anti-patterns (do not):
  - Do not map “sell above 80 / buy below 20 / sell upper band” into product
    orders.
  - Do not invent “correct” %K/%D periods as universal truth.
  - Do not promote oscillator names to `event_type`.
- Quotes or paraphrases worth keeping (short):
  - Oscillators shine in ranges; weak as sole tools in strong trends.
  - Divergence = caution on trend strength, not an automatic reverse order.
  - Narrow bands = volatility coiled; direction still unknown until confirmed.
