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

## BFF health check

With a valid browser session, verify the Next BFF can reach Nest:

```bash
curl http://localhost:3001/api/health \
  -H "Cookie: research_desk_session=<session-cookie>"
```

The BFF forwards the request to `GET /health` with `x-dashboard-api-key`.
It returns `401` without a valid session and `502` when Nest is unavailable.

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

GitHub Actions runs the same commands in the dedicated `web` job.
