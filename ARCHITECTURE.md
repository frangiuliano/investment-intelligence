# Architecture — Investment Intelligence

Mapa de módulos del backend NestJS y su relación con el backlog del MVP.

## Principios

- Un módulo por bounded context.
- Capas: `controller → service → repository` (cuando el dominio lo requiera).
- Config externalizada vía env vars (`ConfigModule`).
- Los módulos de dominio no se acoplan entre sí; `pipeline` orquesta el flujo.

## Mapa módulo → issue

| Módulo | Estado | Responsabilidad | Issue |
|--------|--------|-----------------|-------|
| `config/` | Implementado | Carga y validación de env (Joi) | #5 |
| `database/` | Implementado | TypeORM connection, health, migraciones | #2 |
| `health/` | Implementado | `GET /health` (app + DB) | #8 |
| `news/` | Implementado | Recolección RSS (cron), dedupe y persistencia | #1 |
| `analysis/` | Implementado | Análisis con Gemini Flash (cola + delay) | #3 |
| `relevance/` | Implementado | Criterios de relevancia para alertas | #6 |
| `notifications/` | Implementado | Alertas Telegram | #4 |
| `pipeline/` | Implementado | Cron end-to-end + `GET /status` | #7 |
| `portfolio/` | Implementado | Holdings + watchlist (`/holdings`, `/watchlist`) | #27, #28 |
| `brief/` | Implementado | Briefs educativos on-demand (Gemini, persistencia) | #32 |
| `telegram-bot/` | Implementado | Inbound Telegram (`/brief`, `/review`, webhook/poll) | #32, #34 |
| `research/` | Implementado | Journal de hipótesis + reviews de período | #33, #34 |
| `market-data/` | Implementado | Port + adapter Yahoo para OHLCV histórico | #55 |
| `charts/` | Implementado | Render determinista de chart técnico PNG desde OHLCV (ADR 004) | #57 |
| `web/` | Planificado | Dashboard Next.js (lectura + escrituras acotadas); BFF → Nest | #35 + foundation `scope:v2` |

## Diagrama de dependencias (MVP)

```
pipeline
  ├── news
  ├── analysis
  ├── relevance
  └── notifications

portfolio  ← holdings + watchlist (REST CRUD; base para briefs/journal)
brief      ← Gemini on-demand + research_briefs (holdings + market-data + Telegram outbound)
telegram-bot ← inbound webhook/commands → brief
research   ← hypotheses + reviews (REST + /review Telegram; market-data para returns)
market-data ← MarketDataService → MarketDataPort → Yahoo adapter
charts     ← TechnicalChartService → ChartRendererPort → canvas PNG (brief lo consume)
telegram-bot ← inbound webhook/commands → brief + review

web (Next.js) ← BFF server-only → Nest REST (dashboard APIs + API key)
  pantallas: holdings | hypotheses | alerts | briefs | reviews

database ← TypeORM DataSource + entidades de dominio
config   ← global
health   ← database (ping vía DataSource)
```

## Dashboard web (v2)

Ver `docs/adr/003-dashboard-web.md`.

- **Stack:** Next.js App Router, Tailwind, shadcn/ui.
- **Auth:** password + cookie de sesión; Nest protegido con
  `DASHBOARD_API_KEY` desde el BFF.
- **Repo:** carpeta `web/` en el mismo repositorio (Nest permanece en `src/`).
- **Skills (automáticas al implementar UI):** `frontend-design`,
  `vercel-react-best-practices`; auditoría opcional con
  `web-design-guidelines`.

## Persistencia

- **ORM:** TypeORM (`docs/adr/001-orm-typeorm.md`).
- **Entidades** en módulos de dominio; **migraciones** en `src/database/migrations/`.
- `synchronize: false` — el schema solo cambia vía migraciones.
- `holdings` y `watchlist_entries` usan soft-delete (`deleted_at`) y unique
  parcial activo (`WHERE deleted_at IS NULL`).
- Relevancia: watchlist persistida (si no vacía) prevalece sobre
  `WATCHLIST_TICKERS` (env fallback).
- `research_briefs` guarda sections JSON educativas (`overview`, `fundamental`,
  `technical`, `risks`, `invalidation`, `disclaimer`) + `prompt_version`, y
  columnas de postura (`stance`, `stance_rationale`, `market_as_of`,
  `market_source`). Sin market data → `stance` null (nunca inventa precios).
- `hypotheses` guarda tesis, invalidación, horizonte, sesgo acotado y origen.
  `source_ref_id` es un UUID opaco sin FK porque puede referir a un brief o una
  alerta. El cierre registra `closed_at` y una nota opcional.
- `hypothesis_review_runs` / `hypothesis_reviews` guardan reviews de período
  con outcomes `thesis_confirmed` \| `thesis_rejected` \| `timing_issue` \|
  `inconclusive`, notas (thesis/timing/learning) y retorno de precio nullable
  (nunca inventado). API `GET/POST /reviews*` protegida con `DASHBOARD_API_KEY`.

## Health check

`GET /health` responde:

- `200` si la app y PostgreSQL responden.
- `503` si PostgreSQL no responde.

## Pipeline status

`GET /status` responde conteos de `news_articles`, `news_analysis` y
`notifications`, más `lastPipelineRunAt` (ISO 8601 o `null` si el proceso
aún no ejecutó el pipeline).

TypeORM usa `manualInitialization`: si Postgres no está disponible al boot,
la app **sigue levantando** y el health reporta `database: down` hasta que
haya conectividad.
