# Architecture — Investment Intelligence

Mapa de módulos del backend NestJS y su relación con el backlog del MVP.

## Principios

- Un módulo por bounded context.
- Capas: `controller → service → repository` (cuando el dominio lo requiera).
- Config externalizada vía env vars (`ConfigModule`).
- Los módulos de dominio no se acoplan entre sí; `pipeline` orquesta el flujo.

## Mapa módulo → issue

| Módulo | Estado (Issue #8) | Responsabilidad | Issue futuro |
|--------|-------------------|-----------------|--------------|
| `config/` | Implementado (básico) | Carga de env (`PORT`, `DATABASE_URL`) | #5 — validación formal |
| `database/` | Implementado (pool `pg`) | Conexión compartida a PostgreSQL, health ping | #2 — ORM + entidades |
| `health/` | Implementado | `GET /health` (app + DB) | — |
| `news/` | Stub | Recolección RSS y persistencia | #1 |
| `analysis/` | Stub | Análisis con Gemini Flash | #3 |
| `notifications/` | Stub | Alertas Telegram | #4 |
| `pipeline/` | Stub | Cron end-to-end | #7 |

## Diagrama de dependencias (MVP)

```
pipeline
  ├── news
  ├── analysis
  ├── (relevance — dentro de analysis o módulo propio, Issue #6)
  └── notifications

database ← usado por news / analysis / notifications (vía ORM en #2)
config   ← global
health   ← database (ping)
```

## Decisiones diferidas

- **ORM (TypeORM vs Prisma):** Issue #2.
- **Validación estricta de env (Joi/Zod):** Issue #5.
- **Scheduling (`@nestjs/schedule`):** Issue #7.

## Health check

`GET /health` responde:

- `200` si la app y PostgreSQL responden.
- `503` si PostgreSQL no responde.

Cliente usado: `pg` (sin ORM).
