# Investment Intelligence

[![CI](https://github.com/frangiuliano/investment-intelligence/actions/workflows/ci.yml/badge.svg)](https://github.com/frangiuliano/investment-intelligence/actions/workflows/ci.yml)

Sistema de investigación de inversiones que monitorea fuentes financieras
(RSS), analiza el contenido con IA (Gemini Flash) y genera alertas
accionables por Telegram.

## Visión

Reducir el tiempo de investigación manual y detectar señales que de otra
forma pasarían desapercibidas. No predice el mercado ni reemplaza el juicio
del inversor.

## Alcance fase 1 (MVP)

- Recolectar noticias financieras desde fuentes RSS.
- Persistir en PostgreSQL.
- Analizar cada noticia con IA (Gemini Flash): resumen, sentimiento,
  tickers/empresas mencionadas.
- Notificar por Telegram cuando se detecta algo relevante.

## Fuera de alcance (por ahora)

- Trading automático / ejecución de órdenes.
- Análisis técnico de gráficos.
- Backtesting (fase futura).
- Múltiples fuentes simultáneas (arrancamos con 1-2 RSS feeds).

## Stack

- Backend: NestJS (TypeScript)
- DB: PostgreSQL
- IA: Gemini Flash (plan gratuito)
- Notificaciones: Telegram Bot API
- Contenedores: Docker Compose

## Requisitos

- Node.js 22+ (LTS)
- Docker + Docker Compose
- npm

## Variables de entorno

Copiá `.env.example` a `.env` y completá los valores. La app **no arranca** si
falta una variable obligatoria de runtime (mensaje explícito vía Joi).

| Variable | Obligatoria en NestJS | Uso |
|----------|----------------------|-----|
| `PORT` | No (default `3000`) | Puerto HTTP |
| `DATABASE_URL` | Sí | Conexión PostgreSQL (app) |
| `TEST_DATABASE_URL` | No (solo tests) | DB de integración; nombre debe terminar en `_test` |
| `GEMINI_API_KEY_FINANCE` | Sí | Análisis de noticias (Proyecto B) |
| `GEMINI_API_KEY_REVIEWER` | No | Solo GitHub Actions / Reviewer (Proyecto A) |
| `GEMINI_MODEL` | No (default `gemini-3.5-flash`) | Modelo Gemini para análisis |
| `GEMINI_REQUEST_DELAY_MS` | No (default `1000`) | Delay entre requests a Gemini |
| `TELEGRAM_BOT_TOKEN` | Sí | Bot de alertas |
| `TELEGRAM_CHAT_ID` | Sí | Chat destino de alertas |
| `RSS_FEED_URLS` | Sí | Feeds RSS (separados por coma) |
| `COLLECTION_CRON_SCHEDULE` | No (default `*/15 * * * *`) | Cron del collector |

**Importante:** creá **dos proyectos** en Google AI Studio / Google Cloud, cada
uno con su API key. No reutilices la misma key entre Finance y Reviewer: el
free tier es por proyecto. `GEMINI_API_KEY_REVIEWER` se configura como secret
de Actions (`Settings → Secrets and variables → Actions`), no hace falta en el
boot de NestJS.

La configuración se inyecta vía `ConfigModule` / `ConfigService`. No uses
`process.env` disperso en el código de dominio.

## Arranque local con Docker

```bash
cp .env.example .env
# Completá GEMINI_API_KEY_FINANCE, TELEGRAM_*, RSS_FEED_URLS, etc.
docker compose up --build
```

La app queda en `http://localhost:3000`. PostgreSQL en `localhost:5432`.

### Health check

```bash
curl http://localhost:3000/health
```

Respuesta esperada cuando todo está up:

```json
{ "status": "ok", "checks": { "app": "up", "database": "up" } }
```

Si PostgreSQL no responde, el endpoint devuelve `503` y la app **sigue
corriendo** (TypeORM no bloquea el boot).

## Desarrollo local (sin Docker para la app)

1. Levantá solo Postgres: `docker compose up postgres -d`
2. Copiá env y ajustá el host a `localhost`:

```bash
cp .env.example .env
# Ajustá DATABASE_URL al host localhost y completá el resto de secrets
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/investment_intelligence
```

3. Instalá dependencias, aplicá migraciones y corré en modo watch:

```bash
npm install
npm run migration:run
npm run start:dev
```

## Base de datos y migraciones

ORM: **TypeORM** (ver [docs/adr/001-orm-typeorm.md](./docs/adr/001-orm-typeorm.md)).

Entidades en módulos de dominio (`news/`, `analysis/`, `notifications/`).
Migraciones versionadas en `src/database/migrations/`.

Con Postgres arriba y `DATABASE_URL` apuntando a `localhost` (fuera de Docker):

```bash
# Aplicar migraciones pendientes
npm run migration:run

# Ver estado
npm run migration:show

# Revertir la última
npm run migration:revert
```

Tras un Postgres limpio, `migration:run` crea `news_articles`,
`news_analysis` y `notifications` (unique en `url` / `content_hash`, FKs
con `ON DELETE CASCADE`).

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run start` | Arranca la app |
| `npm run start:dev` | Arranca en modo watch |
| `npm run build` | Compila TypeScript |
| `npm run lint` | ESLint |
| `npm run test` | Jest (unit + integración de schema) |
| `npm run test:watch` | Jest en modo watch |
| `npm run test:cov` | Jest con reporte de coverage |
| `npm run migration:run` | Aplica migraciones TypeORM pendientes |
| `npm run migration:show` | Lista migraciones y su estado |
| `npm run migration:revert` | Revierte la última migración |
| `npm run verify:lockfile` | `npm ci` en Linux (Docker) — evita drift macOS→CI |

Pre-push obligatorio: `verify:lockfile` → `lint` → `test` → `build`.
`verify:lockfile` es necesario porque un lockfile válido en macOS puede fallar
en GitHub Actions (deps opcionales de plataforma, p. ej. `@emnapi/*`).

## CI (GitHub Actions)

El workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) corre en:

- cada **pull request** hacia `main`
- cada **push** a ramas `issue-*`

Pipeline (mismos comandos que el pre-push local):

```bash
npm ci
npm run lint
npm run test
npm run build
```

Usa Node.js 22 LTS con cache de dependencias npm y un servicio PostgreSQL 16
para los tests de integración de schema. Un PR con lint, tests o build
fallidos queda con CI en rojo y no debería mergearse.

## Flujo de PR (CI → review → merge manual)

1. Abrís un PR hacia `main` (o actualizás la rama).
2. Corre el **CI** (`ci.yml`: lint → test → build).
3. **Review (camino por defecto):** invocá `/rev` en Cursor (Reviewer Agent
   manual). Publica el veredicto como comentario en el PR.
4. **Review automático (opt-in):** si la variable de Actions
   `AI_REVIEW_ENABLED=true`, el workflow
   [`.github/workflows/ai-review.yml`](./.github/workflows/ai-review.yml)
   espera CI verde y comenta vía Gemini. Si está apagada o ausente, el job
   se skipea. Si el CI está rojo, tampoco llama a Gemini.
5. El **merge sigue siendo manual**: leé el veredicto y mergeá vos.

### Variable y secret (solo si activás AI Review)

En `Settings → Secrets and variables → Actions`:

| Tipo | Nombre | Valor / uso |
|------|--------|-------------|
| Variable | `AI_REVIEW_ENABLED` | `true` para encender; ausente o distinto de `true` = apagado (default) |
| Secret | `GEMINI_API_KEY_REVIEWER` | Solo `ai-review.yml` (Proyecto A). Requerido cuando el review automático está on |

No uses `GEMINI_API_KEY_FINANCE` en Actions. Son proyectos/API keys distintos
(ver tabla de variables arriba).

`GEMINI_API_KEY_FINANCE`, `TELEGRAM_*`, etc. viven en `.env` local (o en el
host de deploy futuro). **No** hacen falta como secrets de Actions mientras el
CI solo corra lint/test/build.

### Prompt del Reviewer

La definición del agente vive en
[`.github/reviewer/prompt.md`](./.github/reviewer/prompt.md) (copia del
framework `ai-software-company/agents/reviewer/prompt.md`). El script
[`.github/scripts/ai-review.mjs`](./.github/scripts/ai-review.mjs) la usa
como system prompt cuando el review automático está habilitado. Los
comentarios incluyen un marcador oculto por commit SHA para no duplicar
reviews del mismo head.

## News Collector (RSS)

El módulo `news/` lee los feeds de `RSS_FEED_URLS` en el cron
`COLLECTION_CRON_SCHEDULE` (default cada 15 minutos):

1. Fetch propio con `redirect: 'manual'`, revalidación de cada hop,
   timeout con `AbortSignal` (15s) y tope de body (2 MB); parse con
   `rss-parser` (`parseString`, sin seguir redirects del parser).
2. Sanitiza título/contenido (strip HTML, límites de longitud).
3. Deduplica por `url` o `content_hash` (SHA-256) antes de insertar.
4. Persiste en `news_articles` y loguea
   `seen / inserted / duplicates / skipped / errors` por corrida.

Solo se aceptan URLs `http`/`https` públicas (no `file://`, localhost,
metadata cloud ni IPs privadas / IPv6 ULA). Si falta `link`, se usa `guid`
cuando es una URL válida. El pipeline end-to-end que encadena collector →
análisis → relevancia → Telegram queda en el Issue #7.

## News Analysis (Gemini Flash)

El módulo `analysis/` toma artículos de `news_articles` **sin** fila en
`news_analysis` y los procesa en cola secuencial (concurrencia 1):

1. Prompt estructurado a Gemini Flash (`GEMINI_MODEL`, default
   `gemini-3.5-flash`) pidiendo JSON:
   `summary`, `sentiment` (`positive` | `negative` | `neutral`), `tickers`.
2. Usa `GEMINI_API_KEY_FINANCE` (nunca la key del Reviewer).
3. Espera `GEMINI_REQUEST_DELAY_MS` (default 1000) entre requests para no
   saturar el free tier.
4. Ante 429/timeout/5xx reintenta con backoff acotado; si falla, loguea y
   sigue con el siguiente artículo (la corrida no tumba el proceso).
5. Persiste en `news_analysis` (`article_id` unique → no re-analiza).

Invocación local (one-shot, sin cron de pipeline):

```bash
npm run analysis:once
```

El cron end-to-end lo cableará el Issue #7. Truncá el contenido enviado al
modelo y no loguees la API key ni el body completo de errores.


## Testing

Stack y convenciones alineados con
`ai-software-company/standards/testing-standards.md`:

- **Unit tests:** Jest + `@nestjs/testing`.
- **Ubicación:** `*.spec.ts` junto al archivo de producción bajo `src/`
  (convención NestJS). Ejemplo: `src/health/health.controller.spec.ts`.
- **E2E:** carpeta `test/` + supertest cuando un issue de feature lo pida;
  no es parte del setup base.
- **Externos:** mockear Gemini, Telegram, RSS, etc. — sin llamadas reales
  en tests.
- **Nombres:** descriptivos en inglés
  (`should return 503 for GET /health when database is down`).

### Cómo correrlos

```bash
npm run test        # suite unitaria
npm run test:watch  # desarrollo
npm run test:cov    # coverage en ./coverage (sin umbral mínimo en el MVP)
```

El smoke del health check vive como unit test del controller
(`GET /health` con `DatabaseHealth` mockeado).

Los tests de schema (`src/database/schema.integration.spec.ts`) usan
**solo** `TEST_DATABASE_URL` (nunca `DATABASE_URL`). Default local:

`postgresql://postgres:postgres@localhost:5432/investment_intelligence_test`

El nombre de la base **debe** terminar en `_test`. Los tests hacen
`DROP SCHEMA` sobre esa DB; la de desarrollo no se toca.

Crear la DB de test (una vez; en volúmenes nuevos Compose ya la crea vía
`docker/postgres/init-test-db.sh`):

```bash
docker compose up postgres -d
docker compose exec postgres psql -U postgres -c \
  "CREATE DATABASE investment_intelligence_test;"
```

En CI el servicio Postgres usa `investment_intelligence_test` +
`TEST_DATABASE_URL`.

`npm run verify:lockfile` **requiere Docker** (sin fallback a macOS).

## Arquitectura

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para el mapa de módulos y su
relación con los issues del MVP.

## Estado

En desarrollo — MVP en construcción vía flujo de Issues (ver `/issues`).
