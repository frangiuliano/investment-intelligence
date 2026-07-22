# ADR 004 — Technical chart image for Telegram briefs

## Status

Accepted (Architect, 2026-07-17) for Issue #57 (`order-29`, `scope:v1`).

Unblocks #57: its dependencies #55 (market data OHLCV) and #56 (brief stance)
are closed; the only remaining gate was this architecture decision
(server-side chart library, Telegram image constraints, storage).

## Context

The operator wants the technical brief (#56) to optionally include a **chart
image** rendered from real OHLCV bars (marks that illustrate the stance), sent
over Telegram. Constraints that shape the decision:

- Rendering must be **deterministic from `MarketSeries` bars** (from
  `MarketDataService`, #55) — never an LLM "screenshot" or invented pixels.
- Runtime image is **`node:22-alpine`** (musl libc); `verify:lockfile` runs on
  **`node:22` bookworm** (glibc). Any native rendering dependency must ship
  **prebuilt binaries for both glibc and musl**, or Docker gets heavier and the
  lockfile drifts across platforms (same class of failure as `@emnapi/*`).
- #57 is low priority ("deseo"); must not over-engineer nor block the
  journal/review loop.
- Chart failure must **never** drop the textual brief (graceful degradation).

## Decision

### 1. Rendering library — `@napi-rs/canvas` + a thin hand-rolled renderer

Draw candles/line + minimal overlays directly with the Canvas 2D API from
`@napi-rs/canvas`. Do **not** pull a full charting framework.

- `@napi-rs/canvas` ships **prebuilt N-API binaries for linux-x64-gnu,
  linux-x64-musl and darwin** — no cairo/pango system packages in the Alpine
  image, works in dev (macOS) and CI (glibc) and runtime (musl).
- A minimal renderer is enough for the "conjunto mínimo de marcas documentadas"
  the issue asks for; a financial-chart plugin would add surface with no
  product upside for v1.

**Dependency Inversion (SOLID):** define a `ChartRendererPort` interface; the
canvas impl is `CanvasChartRenderer`. Callers depend on the port, so swapping
to the vector fallback below never touches `BriefService` or Telegram code
(Open/Closed).

### 2. Module structure — new `src/charts/` bounded context

```
src/charts/
├── charts.module.ts
├── chart-renderer.port.ts        # ChartRendererPort (interface)
├── canvas-chart.renderer.ts      # CanvasChartRenderer implements the port
├── technical-chart.service.ts    # façade: MarketSeries + marks -> PNG Buffer
├── chart-marks.ts                # pure math: SMA, level selection, scaling
└── *.spec.ts
```

- **Single Responsibility:** `charts` renders; `brief` orchestrates. The brief
  module composes the marks input and asks `charts` for a PNG; it does not know
  about canvas.
- `ChartsModule` exports `TechnicalChartService`; `BriefModule` imports it.
- `market-data/` stays untouched (charts consume the existing `MarketSeries`).

### 3. Pure computation separated from raster

`chart-marks.ts` is framework-free and fully unit-testable:

- Inputs: `OhlcvBar[]` + config (SMA periods, max bars).
- Outputs: scaled series + overlay values (SMA points, highlighted levels).
- `CanvasChartRenderer` is a thin adapter that only paints those pre-computed
  values. This keeps the deterministic logic under test without asserting on
  pixels.

### 4. Minimal, documented marks (v1)

- **Daily candles** from `MarketSeries.bars`, capped to the last **N** bars
  (default `TECHNICAL_CHART_MAX_BARS=90`) for readability.
- **SMA overlay(s)** computed from closes (default `TECHNICAL_CHART_SMA_PERIODS=20`;
  optional second period). Skipped gracefully if bars < period.
- **Highlighted horizontal levels:** period high/low and last close marker.
- Marks are **illustrative**, computed only from OHLCV; they do **not** claim to
  "confirm" the stance (per the issue's out-of-scope). Disclaimer stays in the
  brief text (#56).

### 5. Telegram delivery — extend `TelegramClient.sendPhoto`

- Add `sendPhoto(image: Buffer, caption?: string)` next to `sendMessage`,
  reusing the same timeout/abort + typed `TelegramApiError` handling. Upload the
  PNG bytes via `multipart/form-data` to `.../sendPhoto` (FormData + Blob;
  caption ≤ 1024 chars).
- **Ordering:** deliver the textual brief first (existing #56 flow), then the
  chart as a follow-up `sendPhoto`. If render or `sendPhoto` fails, the brief
  text is still delivered and the failure is logged + surfaced as a short
  "chart unavailable" note. Chart errors are isolated and never fail the brief.
- Image budget: target ~**1280×720 PNG** (well under Telegram's photo limits:
  ≤ 10 MB, width+height ≤ 10000, ratio ≤ 20).

### 6. Storage — ephemeral in v1 (no persistence)

Generate the PNG in memory, send it, discard it. Do **not** persist a path/URL
on `research_briefs` in v1:

- Briefs are reproducible from the same OHLCV window; the image is a view, not
  a source of truth.
- The Alpine runtime FS is ephemeral; a blob store / cleanup lifecycle is
  over-engineering for a single-operator "deseo".
- Revisit only if the dashboard (#35) needs to render the stored chart — then
  add a nullable `chart_image_path`/URL behind the same `TechnicalChartService`.

### 7. Configuration (env, validated in Joi)

| Var | Default | Purpose |
|-----|---------|---------|
| `TECHNICAL_CHART_ENABLED` | `true` | Feature gate; when off, briefs behave as today |
| `TECHNICAL_CHART_SMA_PERIODS` | `20` | Comma list of SMA windows (e.g. `20,50`) |
| `TECHNICAL_CHART_MAX_BARS` | `90` | Max daily bars rendered |

Chart is attempted only when the brief already has market data; no market data
→ no chart (consistent with #56 declaring insufficiency, never inventing bars).

## Consequences

- Adds one runtime dependency (`@napi-rs/canvas`, prebuilt, no network/no FS
  writes). **Document it in the PR** and, after adding it, regenerate the
  lockfile via Docker (`npm install --package-lock-only --ignore-scripts`) and
  run `npm run verify:lockfile` so the linux-musl + linux-gnu optional binaries
  are pinned for both Alpine runtime and glibc CI.
- Tests: unit-test `chart-marks.ts` (SMA/levels/scaling) with OHLCV fixtures;
  assert `CanvasChartRenderer` returns a non-empty PNG (magic bytes) — no
  network, no real Telegram, deterministic.
- `ARCHITECTURE.md` gains a `charts/` entry when the Developer implements #57.
- No change to the `brief`/`market-data` public contracts.

## Alternatives considered

| Option | Why not (v1) |
|--------|----------------|
| `chartjs-node-canvas` + `chartjs-chart-financial` | Full framework + financial plugin; more surface than "minimal marks" needs |
| `canvas` (node-canvas) | Needs cairo/pango `apk` packages on Alpine → heavier image, slower builds |
| `@resvg/resvg-js` (SVG → PNG) | Viable vector fallback (prebuilt musl); acceptable behind `ChartRendererPort` if a vector-first path is preferred, but hand-drawing SVG strings is more code than Canvas 2D for candles |
| QuickChart / hosted image API | External network dep, sends data to a third party, non-deterministic in tests — violates "deterministic from OHLCV" |
| Persisting the image to disk/object store in v1 | Storage lifecycle/cleanup overkill for a single-operator deseo; briefs are reproducible |

## Follow-up for the Product Owner

This ADR removes the `/arch` gate on #57. PO can flip #57 from
`status:blocked` → `status:ready` and reference `docs/adr/004-telegram-technical-chart.md`
in the issue body. Implementation stays with the Developer (Issue #57 scope
unchanged).

## Addendum — Persist PNG for dashboard reuse (Issue #76)

**Status:** Accepted (2026-07-22). Revises §6 for post-desk reuse.

The research desk (#35) needs the same PNG Telegram already received. Ephemeral
in-memory discard is no longer enough.

**Decision:** store the PNG as nullable `bytea` on `research_briefs.chart_png`
(PostgreSQL, single-tenant). One render feeds both `sendPhoto` and the column.
List/detail JSON never embed the blob (`select: false` + `chartAvailable` on
detail). Authenticated read: `GET /briefs/:id/chart` (`x-dashboard-api-key`) →
`image/png` or `404`.

**Out of scope here:** object store/S3, backfill of historical briefs, dashboard
UI (issue #77).

**Degradation unchanged:** render failure → no PNG; textual brief still OK.
`sendPhoto` failure after a successful render may still leave the PNG persisted
for the desk.