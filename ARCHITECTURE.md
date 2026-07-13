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
| `portfolio/` | Implementado | Holdings del operador (`/holdings`) | #27 |

## Diagrama de dependencias (MVP)

```
pipeline
  ├── news
  ├── analysis
  ├── relevance
  └── notifications

portfolio  ← holdings (REST CRUD; base para watchlist/briefs/journal)

database ← TypeORM DataSource + entidades de dominio
config   ← global
health   ← database (ping vía DataSource)
```

## Persistencia

- **ORM:** TypeORM (`docs/adr/001-orm-typeorm.md`).
- **Entidades** en módulos de dominio; **migraciones** en `src/database/migrations/`.
- `synchronize: false` — el schema solo cambia vía migraciones.
- `holdings` usa soft-delete (`deleted_at`) y unique parcial activo
  `(symbol, asset_type) WHERE deleted_at IS NULL`.

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
