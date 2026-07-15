# ADR 002 — Market data provider and brief stance schema

## Status

Accepted (Architect, 2026-07-14) for Issues #55 / #56.

## Context

#32 ships educational briefs without live quotes. #55–#56 add real OHLCV and
an actionable `stance` relative to holdings. We need a provider choice and a
persistence shape that stays honest (no invented prices) and implementable
in NestJS without over-engineering.

## Decision

### Market data (#55)

- **Module:** `src/market-data/` with:
  - `MarketDataPort` (interface) — Dependency Inversion
  - `YahooMarketDataAdapter` (or Stooq if Yahoo breaks) as default v1 impl
  - `MarketDataService` as the only façade exported to other modules
- **Contract (EN fields):**

```ts
type OhlcvBar = {
  time: string; // ISO date (UTC day for daily bars)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type MarketSeries = {
  symbol: string;
  timeframe: '1d';
  bars: OhlcvBar[];
  asOf: string; // ISO datetime of fetch
  source: string; // e.g. 'yahoo-finance-chart'
};
```

- **Caching:** optional table `market_bars_cache` keyed by
  `(symbol, timeframe, bar_date)` **or** in-memory TTL ~15–60 min in v1.
  Prefer DB cache if `#34` will reuse prices later; otherwise TTL memory is OK.
- **Failure mode:** throw typed `MarketDataUnavailableError` — never fabricate
  bars. Briefs must surface insufficiency.
- **Env:** `MARKET_DATA_PROVIDER=yahoo` (+ API key only if provider requires it).
- **Why Yahoo/chart CSV over Alpha Vantage first:** no key for basic daily
  history, enough for TA frames; swap via port if ToS/rate limits hurt.

### Stance schema (#56)

- Keep educational sections; **add** structured stance (not free text only).
- Prefer **column + JSON** hybrid:

| Column | Type | Notes |
|--------|------|--------|
| `stance` | `varchar` nullable | Enum code EN |
| `stance_rationale` | `text` nullable | Short TA/FA justification |
| `market_as_of` | `timestamptz` nullable | From `MarketSeries.asOf` |
| `market_source` | `varchar` nullable | Provenance |
| `sections` | `jsonb` | Existing educational keys unchanged |

- **Enum (EN codes in DB):**
  - No holding: `enter` \| `avoid` \| `watch`
  - With holding: `hold` \| `add` \| `reduce` \| `exit`
- Validate stance set **against holding presence** in `BriefService` (reject
  `exit` without holding, etc.).
- Display labels localized in Telegram formatter (`APP_LOCALE`); codes stay EN
  (same pattern as sentiment/materiality).
- If market data missing → `stance = null` + user-visible “insufficient data”
  message; do not call Gemini for a fake stance.

### Prompt wiring

- Pass a compact **facts block** to Gemini (last N closes, % change, range) —
  numbers come only from `MarketSeries`, labeled as such.
- Gemini proposes stance + rationale inside allowed enum; server re-validates.

## Consequences

- `#57` (chart image) can render from the same `MarketSeries` without a second
  provider.
- `#34` (hypothesis review) can later reuse `market-data` for returns.
- Trading/broker execution remains out of scope.

## Alternatives rejected

| Option | Why not (v1) |
|--------|----------------|
| Alpha Vantage / Polygon only | Key friction; keep as second adapter behind the port |
| Persist full bars inside `research_briefs.sections` | Bloats JSON; harder to reuse for charts/reviews |
| Free-text “compraría…” without enum | Hard to test, journal, and localize consistently |
