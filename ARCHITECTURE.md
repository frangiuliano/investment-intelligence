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
| `news/` | Entidad lista | Recolección RSS y persistencia | #1 |
| `analysis/` | Entidad lista | Análisis con Gemini Flash | #3 |
| `notifications/` | Entidad lista | Alertas Telegram | #4 |
| `pipeline/` | Stub | Cron end-to-end | #7 |

## Diagrama de dependencias (MVP)

```
pipeline
  ├── news
  ├── analysis
  ├── (relevance — dentro de analysis o módulo propio, Issue #6)
  └── notifications

database ← TypeORM DataSource + entidades de dominio
config   ← global
health   ← database (ping vía DataSource)
```

## Persistencia

- **ORM:** TypeORM (`docs/adr/001-orm-typeorm.md`).
- **Entidades** en módulos de dominio; **migraciones** en `src/database/migrations/`.
- `synchronize: false` — el schema solo cambia vía migraciones.

## Health check

`GET /health` responde:

- `200` si la app y PostgreSQL responden.
- `503` si PostgreSQL no responde.
