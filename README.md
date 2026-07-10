# Investment Intelligence

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
| `DATABASE_URL` | Sí | Conexión PostgreSQL |
| `GEMINI_API_KEY_FINANCE` | Sí | Análisis de noticias (Proyecto B) |
| `GEMINI_API_KEY_REVIEWER` | No | Solo GitHub Actions / Reviewer (Proyecto A) |
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

Si PostgreSQL no responde, el endpoint devuelve `503`.

## Desarrollo local (sin Docker para la app)

1. Levantá solo Postgres: `docker compose up postgres -d`
2. Copiá env y ajustá el host a `localhost`:

```bash
cp .env.example .env
# Ajustá DATABASE_URL al host localhost y completá el resto de secrets
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/investment_intelligence
```

3. Instalá dependencias y corré en modo watch:

```bash
npm install
npm run start:dev
```

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run start` | Arranca la app |
| `npm run start:dev` | Arranca en modo watch |
| `npm run build` | Compila TypeScript |
| `npm run lint` | ESLint |
| `npm run test` | Jest (unit) |
| `npm run test:watch` | Jest en modo watch |
| `npm run test:cov` | Jest con reporte de coverage |

Pre-push obligatorio: `lint` → `test` → `build` (mismos comandos que usará el CI).

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

## Arquitectura

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para el mapa de módulos y su
relación con los issues del MVP.

## Estado

En desarrollo — MVP en construcción vía flujo de Issues (ver `/issues`).
