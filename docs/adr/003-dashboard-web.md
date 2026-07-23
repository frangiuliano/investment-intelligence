# ADR 003 — Dashboard web (stack, auth, BFF, repo layout)

## Status

Accepted (Architect + Product Owner, 2026-07-17) for Issue #35 and
dashboard foundation issues (`scope:v2`).

## Context

The research bot (Telegram + Nest API) is the primary operator surface.
Issue #35 adds a **read/write research desk** UI: holdings, hypotheses,
alerts, briefs, and reviews — not a trading terminal. We need a stack that
fits a single operator, reuses the Nest backend, and stays implementable by
the Developer Agent without a separate Design Agent.

UI kit preference (product owner): **shadcn/ui + Tailwind**.

## Decision

### Stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js** (App Router) + TypeScript |
| Styling / components | **Tailwind CSS** + **shadcn/ui** |
| Backend | Existing NestJS API (no duplicate domain logic) |
| Charts in web | Out of scope for #35 (Telegram charts = #57) |

### Repo layout

- Keep Nest at repository root (`src/`).
- Add Next app under **`web/`** in the same repo.
- Do **not** split into a separate repo or full `apps/api` + `apps/web`
  monorepo in v1 (can revisit later).

```
investment-intelligence/
├── src/                 # NestJS
├── web/                 # Next.js App Router
│   ├── app/
│   ├── components/ui/   # shadcn
│   ├── lib/api/         # server-only Nest client
│   └── middleware.ts
└── docs/adr/003-dashboard-web.md
```

### App patterns

- **Server Components by default**; Client Components only for interactive
  filters/forms.
- **BFF:** the browser talks only to Next. Next server code calls Nest with
  `API_BASE_URL` + `DASHBOARD_API_KEY`. Nest is not called from the browser
  with open CORS for dashboard data.
- One primary nav section per domain: Holdings, Hypotheses, Alerts, Briefs,
  Reviews.
- Explicit loading / empty / error states; never invent market or analysis
  data.
- Skills (automatic): `frontend-design`, `vercel-react-best-practices`;
  optional audit with `web-design-guidelines` at review time.

### Auth (single-tenant v1)

| Concern | Choice |
|---------|--------|
| Operator login | `DASHBOARD_PASSWORD` + signed session cookie |
| Session secret | `DASHBOARD_SESSION_SECRET` |
| Nest protection | Header `x-dashboard-api-key: $DASHBOARD_API_KEY` required on
  dashboard-facing routes (or a dedicated guard for read/write APIs used by
  the BFF) |
| Multi-user / OAuth | Out of scope |

Hosting default: **local and/or same host as the bot** behind a reverse
proxy. If the UI later moves to Vercel, keep the BFF pattern; Nest stays on
the VPS.

### Product surface (v1 dashboard)

| Area | Read | Write (create/update) |
|------|------|------------------------|
| Holdings | Yes | Yes (existing REST) |
| Watchlist | Yes | Yes (existing REST; can live under Holdings or nav) |
| Hypotheses | Yes | Yes (create / close; existing REST) |
| Alerts | Yes | Feedback only (`useful`/`noise` via `#84`; alerts themselves remain pipeline-generated) |
| Briefs | Yes | Yes (request brief + feedback useful/noise) |
| Reviews | Yes | Yes (trigger period review; from #34) |

No buy/sell CTAs. Stance/disclaimer on briefs remain visible when present.

### API prerequisites

Before or as foundation for the UI, Nest must expose list/detail (and
write where noted) for domains that today lack HTTP read models:

- News articles + analyses
- Notifications / alerts
- Research briefs (+ request endpoint if missing)
- Hypothesis reviews (shipped with #34)

Holdings, watchlist, and hypotheses CRUD already exist.

### CI

`web/` gets `lint → test → build` in GitHub Actions (separate job or
matrix). Root Nest CI unchanged.

## Consequences

- Developer implements `web/` against this ADR; does not redefine stack.
- Issue #35 focuses on UI + wiring; foundation API/scaffold issues come
  first in `order-NN`.
- `ARCHITECTURE.md` lists `web/` as the dashboard surface.
- Auth secrets are env-only; never commit passwords or API keys.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Vite SPA calling Nest from the browser | Forces CORS + exposing Nest; weaker secret handling |
| Separate frontend repo | Extra CI/PR friction for a single-operator product |
| Full monorepo move (`apps/api`) now | Large reshuffle with no product upside yet |
| OAuth / multi-tenant | Overkill for one operator |
| Design Agent | Skills + ADR cover v1; revisit if marketing site grows |
