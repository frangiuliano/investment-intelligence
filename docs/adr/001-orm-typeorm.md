# ADR 001: Use TypeORM for PostgreSQL persistence

## Status

Accepted (Issue #2)

## Context

The MVP needs a relational schema (`news_articles`, `news_analysis`,
`notifications`) with unique constraints, foreign keys, and versioned
migrations. The scaffold already used the `pg` driver for health checks.
NestJS supports both TypeORM and Prisma; this decision picks one ORM for
the product.

## Decision

Use **TypeORM** with `@nestjs/typeorm`.

## Consequences

- Entities live in domain modules (`news/`, `analysis/`, `notifications/`).
- `database/` owns the shared TypeORM connection, health ping, CLI
  `DataSource`, and migrations.
- Schema changes go through versioned migrations (`synchronize: false`).
- Repositories are injected via `TypeOrmModule.forFeature([...])`.
- The raw `pg` `Pool` provider from Issue #8 is replaced by TypeORM's
  `DataSource` (health still runs `SELECT 1`).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Prisma | Excellent DX, but adds a separate client generation step and a second schema language. TypeORM maps more directly onto NestJS DI and decorator-based modules already in use. |
| Keep raw `pg` | Would force hand-written SQL and ad-hoc migration tooling for every feature issue. |
