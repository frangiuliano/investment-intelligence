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

## Arranque local con Docker

```bash
cp .env.example .env
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

Pre-push recomendado: `lint` → `test` → `build`.

## Arquitectura

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para el mapa de módulos y su
relación con los issues del MVP.

## Estado

En desarrollo — MVP en construcción vía flujo de Issues (ver `/issues`).
