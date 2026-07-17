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
| `telegram-bot/` | Implementado | Inbound Telegram (`/brief`, webhook/poll) | #32 |
| `research/` | Implementado | Journal de hipótesis; reviews como extensión futura | #33, #34 |
| `market-data/` | Implementado | Port + adapter Yahoo para OHLCV histórico | #55 |
| `web/` | Planificado | Dashboard Next.js (lectura + escrituras acotadas); BFF → Nest | #35 + foundation `scope:v2` |

## Diagrama de dependencias (MVP)

```
pipeline
  ├── news
  ├── analysis
  ├── relevance
  └── notifications

portfolio  ← holdings + watchlist (REST CRUD; base para briefs/journal)
brief      ← Gemini on-demand + research_briefs (consume holdings + Telegram outbound)
telegram-bot ← inbound webhook/commands → brief
research   ← hypotheses (REST create/list/close; reviews futuras separadas)
market-data ← MarketDataService → MarketDataPort → Yahoo adapter

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
- `research_briefs` guarda sections JSON fijas (`overview`, `fundamental`,
  `technical`, `risks`, `invalidation`, `disclaimer`) + `prompt_version`.
  Sin cotización en vivo en v1.
- `hypotheses` guarda tesis, invalidación, horizonte, sesgo acotado y origen.
  `source_ref_id` es un UUID opaco sin FK porque puede referir a un brief o una
  alerta. El cierre registra `closed_at` y una nota opcional.

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
