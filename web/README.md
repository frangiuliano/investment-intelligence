# Investment Intelligence — Web

Private, single-operator research desk built with Next.js App Router,
Tailwind CSS, and shadcn/ui. The browser talks only to this app; server code
calls the Nest API as a BFF.

## Requirements

- Node.js 22
- The Nest API running locally
- A configured `DASHBOARD_API_KEY` shared with Nest

## Environment

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Server-only Nest base URL, for example `http://localhost:3000` |
| `DASHBOARD_API_KEY` | Shared secret sent to Nest as `x-dashboard-api-key` |
| `DASHBOARD_PASSWORD` | Password used by the single operator at `/login` |
| `DASHBOARD_SESSION_SECRET` | Secret used to sign the HTTP-only session cookie |

Use long, random values for all secrets. They are server-only and must never
use a `NEXT_PUBLIC_` prefix.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev -- --port 3001
```

The Nest API uses port `3000` by default, so the example runs the web app on
port `3001`. Open [http://localhost:3001](http://localhost:3001). Requests
without a valid session redirect to `/login`. After login, the shell exposes
Holdings, Hypotheses, Alerts, Briefs, and Reviews.

The Nest API must be running with its database migrated
(`npm run migration:run` at the repo root) and `DASHBOARD_API_KEY` set to the
same value as this app.

## Research areas

| Area | Read | Write |
| --- | --- | --- |
| Holdings | Positions table | Create, edit, remove |
| Watchlist | Entries table (inside Holdings) | Create, remove |
| Hypotheses | Open and closed journal | Open, close (with note) |
| Alerts | Sent notifications, ticker filter, pagination | None (pipeline-only) |
| Briefs | Paginated list + detail with sections and stance | Request brief per ticker |
| Reviews | Paginated list + detail with notes | Trigger review for the current month |

All data flows through server code (Server Components and server actions)
that calls Nest with `x-dashboard-api-key`; the browser never talks to Nest
directly. Alerts have no write path by design, and briefs always render their
disclaimer next to any stance.

## BFF health check

With a valid browser session, verify the Next BFF can reach Nest:

```bash
curl http://localhost:3001/api/health \
  -H "Cookie: research_desk_session=<session-cookie>"
```

The BFF forwards the request to `GET /health` with `x-dashboard-api-key` and
mirrors the Nest status and body (for example `503` with a JSON payload when
the database is down). It returns `401` without a valid session and `502`
only when Nest is unreachable.

## BFF asset suggestions

The Briefs form autocomplete calls a session-protected BFF route that proxies
Nest `GET /assets/suggest` (API key stays server-side):

```bash
curl "http://localhost:3001/api/assets/suggest?q=AAP" \
  -H "Cookie: research_desk_session=<session-cookie>"
```

Without a valid session the route returns `401`. Empty `q` returns `400`.
The browser never receives `DASHBOARD_API_KEY`.

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

GitHub Actions runs the same commands in the dedicated `web` job.
