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
| `APP_LOCALE` | No (default `en`) | Idioma de salida (`en` \| `es`) |
| `DATABASE_URL` | Sí | Conexión PostgreSQL (app) |
| `TEST_DATABASE_URL` | No (solo tests) | DB de integración; nombre debe terminar en `_test` |
| `GEMINI_API_KEY_FINANCE` | Sí | Análisis de noticias (Proyecto B) |
| `GEMINI_API_KEY_REVIEWER` | No | Solo GitHub Actions / Reviewer (Proyecto A) |
| `GEMINI_MODEL` | No (default `gemini-3.1-flash-lite`) | Modelo Gemini para análisis |
| `GEMINI_REQUEST_DELAY_MS` | No (default `12000`) | Delay entre requests a Gemini |
| `GEMINI_ANALYSIS_BATCH_SIZE` | No (default `5`) | Máx. artículos por corrida de análisis |
| `MARKET_DATA_PROVIDER` | No (default `yahoo`) | Provider de OHLCV histórico; solo `yahoo` en v1 |
| `MARKET_DATA_TIMEOUT_MS` | No (default `10000`) | Timeout del provider (1000–30000 ms) |
| `TELEGRAM_BOT_TOKEN` | Sí | Bot de alertas |
| `TELEGRAM_CHAT_ID` | Sí | Chat destino de alertas |
| `TELEGRAM_WEBHOOK_SECRET` | No (default vacío) | Secret del webhook inbound (`/brief`, `/review`); vacío = webhook off |
| `TELEGRAM_ALLOWED_USER_IDS` | No | Allowlist opcional de user ids para comandos inbound |
| `RSS_FEED_URLS` | Sí | Feeds RSS (separados por coma) |
| `COLLECTION_CRON_SCHEDULE` | No (default `*/15 * * * *`) | Cron del pipeline end-to-end |
| `DIGEST_CRON_SCHEDULE` | No (default `0 12 * * *`) | Cron del digesto Telegram (diario 12:00 UTC) |
| `DIGEST_LOOKBACK_HOURS` | No (default `24`) | Ventana de candidatos al digesto (1–168) |
| `STORY_CLUSTER_WINDOW_HOURS` | No (default `24`) | Ventana para colapsar historias duplicadas en un solo push |
| `WATCHLIST_TICKERS` | No | Filtro opcional de tickers para relevancia |
| `DASHBOARD_API_KEY` | No (default vacío) | Secret BFF → Nest (`x-dashboard-api-key`); vacío = `/reviews`, `/news/*`, `/notifications` y `/briefs` en 401 |
| `REVIEW_CRON_SCHEDULE` | No (default `0 12 1 * *`) | Cron mensual: día 1 UTC revisa el **mes UTC anterior** |
| `TECHNICAL_CHART_ENABLED` | No (default `true`) | Enviar chart técnico en imagen tras un brief con market data |
| `TECHNICAL_CHART_SMA_PERIODS` | No (default `20`) | Ventanas SMA del overlay, separadas por coma (ej. `20,50`) |
| `TECHNICAL_CHART_MAX_BARS` | No (default `90`) | Máx. barras diarias renderizadas (5–365) |

`APP_LOCALE` define el idioma de salida de la app (un locale por deploy).
Valores permitidos: `en`, `es` (default `en`). Si el valor no está permitido,
la app **no arranca**. El análisis Gemini genera y persiste `summary` y
`headline` en ese idioma (mismo request JSON; sin segunda llamada). Las
alertas y digestos Telegram usan labels **y valores de display** en el mismo
locale, reutilizan el `summary` y muestran `headline` si existe (si está
vacío — filas históricas — caen al título RSS). No re-analiza histórico ni
traduce el cuerpo original del feed al notificar.

**Códigos vs display:** en DB / relevance / clustering, `sentiment`,
`materiality` y `event_type` se persisten y filtran solo como códigos en
inglés (`positive`, `medium`, `ipo`, …). En mensajes Telegram, esos códigos
se muestran localizados según `APP_LOCALE` (p. ej. `es`: positivo / media /
resultados); no se piden enums en español a Gemini ni se usan strings
localizados en queries.

**Importante:** creá **dos proyectos** en Google AI Studio / Google Cloud, cada
uno con su API key. No reutilices la misma key entre Finance y Reviewer: el
free tier es por proyecto. `GEMINI_API_KEY_REVIEWER` se configura como secret
de Actions (`Settings → Secrets and variables → Actions`), no hace falta en el
boot de NestJS.

La configuración se inyecta vía `ConfigModule` / `ConfigService`. No uses
`process.env` disperso en el código de dominio. Leé el locale con
`configService.getOrThrow<AppLocale>('locale')`.

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

### Status del pipeline

```bash
curl http://localhost:3000/status
```

Respuesta esperada (valores de ejemplo):

```json
{
  "articles": 42,
  "analyzed": 38,
  "notified": 5,
  "lastPipelineRunAt": "2026-07-12T20:15:00.000Z"
}
```

`lastPipelineRunAt` es `null` hasta la primera corrida del pipeline en ese
proceso (cron o `pipeline:once`).

Si PostgreSQL no responde, `GET /health` devuelve `503` y la app **sigue
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

Entidades en módulos de dominio (`news/`, `analysis/`, `notifications/`,
`portfolio/`).
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

Tras un Postgres limpio, `migration:run` crea las tablas de noticias, análisis,
notificaciones, cartera, briefs e hipótesis de research (unique en `url` /
`content_hash`, FKs con `ON DELETE CASCADE` donde corresponde y soft-delete en
holdings/watchlist).

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
| `npm run pipeline:once` | Pipeline MVP completo (one-shot) |
| `npm run verify:lockfile` | `npm ci` en Linux (Docker) para raíz y `web/` — evita drift macOS→CI |

Pre-push obligatorio: `verify:lockfile` → `lint` → `test` → `build`.
`verify:lockfile` es necesario porque un lockfile válido en macOS puede fallar
en GitHub Actions (deps opcionales de plataforma, p. ej. `@emnapi/*`). Valida
tanto el lockfile de la raíz como el de `web/`.

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

El módulo `news/` lee los feeds de `RSS_FEED_URLS`. La recolección corre como
**primera etapa del pipeline** (cron `COLLECTION_CRON_SCHEDULE`, default cada
15 minutos), con el one-shot de colección, o como parte de `pipeline:once`:

1. Fetch propio con `redirect: 'manual'`, revalidación de cada hop,
   timeout con `AbortSignal` (15s) y tope de body (2 MB); parse con
   `rss-parser` (`parseString`, sin seguir redirects del parser).
2. Sanitiza título/contenido (strip HTML, límites de longitud).
3. Deduplica por `url` o `content_hash` (SHA-256) antes de insertar.
4. Persiste en `news_articles` y loguea
   `seen / inserted / duplicates / skipped / errors` por corrida.

Solo se aceptan URLs `http`/`https` públicas (no `file://`, localhost,
metadata cloud ni IPs privadas / IPv6 ULA). Si falta `link`, se usa `guid`
cuando es una URL válida.

### Recolección one-shot

Para demos, debug o validar feeds **sin** esperar al cron y **sin** correr
análisis/Telegram:

```bash
# Preferible con la app detenida (evita overlap con el cron del pipeline)
npm run news:collect-once
```

Reutiliza `NewsCollectorService.collect()` (misma dedupe e inserts que el
cron). Imprime JSON con
`feedsProcessed / itemsSeen / inserted / duplicates / skipped / errors` y
termina el proceso. Si ya hay una recolección en curso en ese proceso, hace
skip + warn (mismo guard que el collector). No agrega endpoint HTTP.

| Cuándo | Usar |
|--------|------|
| Solo traer artículos RSS | `news:collect-once` |
| Flujo completo MVP | `pipeline:once` o cron (`COLLECTION_CRON_SCHEDULE`) |
| Solo análisis / Telegram | `analysis:once`, `telegram:test`, `telegram:notify-once` |

## Pipeline end-to-end (MVP)

El módulo `pipeline/` orquesta el flujo automático en secuencia:

1. **Recolección** — `NewsCollectorService.collect()` (RSS → PostgreSQL).
2. **Análisis** — `NewsAnalysisService.analyzePending()` (Gemini Flash).
3. **Relevancia** — `RelevanceService.evaluatePending()` (conteo sí/no alerta).
4. **Notificación** — `NotificationsService.notifyRelevant()` (Telegram).

El cron usa `COLLECTION_CRON_SCHEDULE` (default `*/15 * * * *`). Cada etapa
loguea métricas estructuradas (`stage`, contadores). Si una corrida del
pipeline ya está en curso, la siguiente se omite (mismo guard que en cada
servicio).

### Validación manual del MVP (smoke test)

Con Postgres, env completo y migraciones aplicadas. **No** corras
`start:dev` (cron activo) y `pipeline:once` a la vez: son dos procesos y
pueden duplicar notificaciones Telegram.

**Opción A — one-shot** (recomendada para smoke): con la app detenida:

```bash
npm run pipeline:once
```

Salida JSON con métricas por etapa y `finishedAt`. Revisá logs de las 4
etapas (`collection` → `analysis` → `relevance` → `notifications`).

**Opción B — cron en la app:**

```bash
npm run start:dev
# Esperá un tick del cron (COLLECTION_CRON_SCHEDULE) o consultá:
curl http://localhost:3000/status
```

En ambos casos:

- Artículo no relevante: queda en `news_analysis` sin fila en `notifications`.
- Artículo relevante: fila en `notifications` + mensaje en Telegram.

Para depurar una etapa aislada (también sin cron activo en paralelo):
`news:collect-once`, `analysis:once`, `telegram:test`, `telegram:notify-once`.

## News Analysis (Gemini Flash)

El módulo `analysis/` toma artículos de `news_articles` **sin** fila en
`news_analysis` y los procesa en cola secuencial (concurrencia 1):

1. Prompt estructurado a Gemini Flash (`GEMINI_MODEL`, default
   `gemini-3.1-flash-lite`) pidiendo JSON:
   `headline`, `summary`, `sentiment` (`positive` | `negative` | `neutral`),
   `tickers`, `materiality` (`low` | `medium` | `high`),
   `event_type` (`ipo` | `earnings` | `m_and_a` | `regulation` | `other` |
   `none`).
   `headline` y `summary` se piden y se guardan en el idioma de `APP_LOCALE`
   (`en` / `es`); `sentiment`, `tickers`, `materiality` y `event_type` se
   piden y persisten como códigos en inglés. Si Gemini omite `headline`, se
   persiste vacío y Telegram usa el título RSS. Telegram localiza solo el
   **display** de los enums (ver Notifications). Cambiar el locale no
   re-analiza filas históricas.
2. Usa `GEMINI_API_KEY_FINANCE` (nunca la key del Reviewer).
3. Procesa como máximo `GEMINI_ANALYSIS_BATCH_SIZE` artículos por corrida y
   espera `GEMINI_REQUEST_DELAY_MS` (default 12000) entre requests.
4. Ante 429/timeout/5xx reintenta con backoff; si Gemini indica
   `Please retry in Ns` / `Retry-After`, respeta esa espera (tope 60s).
   Fallos de parse/schema no se reintentan. Tras agotar reintentos, el
   artículo se omite en el proceso actual para no bloquear la cola.
5. Persiste en `news_analysis` (`article_id` unique → no re-analiza). Si
   Gemini respondió bien y falla el `save`, se reutiliza el resultado en
   memoria (sin otra llamada a Gemini) en la siguiente corrida.

Invocación local (one-shot, sin esperar al cron del pipeline):

```bash
npm run analysis:once
```

Truncá el contenido enviado al modelo y no loguees la API key ni el body
completo de errores.

## Relevance (alert criteria)

El módulo `relevance/` decide si un análisis merece alerta. Telegram lo
consume vía `NotificationsService`. `RelevanceService.evaluate()`
devuelve `{ isRelevant, reason }` con estas reglas:

1. Ya notificado → no relevante.
2. Sentimiento fuera de `positive` / `negative` / `neutral` → no relevante.
3. Sin tickers → no relevante.
4. Materialidad `low` (o inválida / ausente) → no relevante.
5. Sentimiento `neutral` **sin** catalizador prioritario → no relevante.
6. Materialidad `medium` o `high` + ≥1 ticker + (sentimiento no neutral
   **o** catalizador prioritario) → relevante.
7. Si el universo del operador no está vacío, además hace falta al menos un
   ticker del análisis en esa lista.

**Catalizadores prioritarios** (`event_type`): `ipo`, `earnings`,
`m_and_a`, `regulation`. Pueden generar push **aunque** el sentimiento sea
`neutral`, siempre con materialidad `medium`/`high` y overlap de universo.
`other` y `none` **no** bypassean el filtro de sentimiento neutral (evitan
spam).

**Fuente del universo (prioridad):**

1. Unión de símbolos activos en `watchlist_entries` (REST `/watchlist`) y
   `holdings` (REST `/holdings`) — si la unión tiene ≥1 símbolo.
2. Si ambas tablas están vacías, fallback a `WATCHLIST_TICKERS` (env),
   documentado como transición; preferí editar la watchlist/cartera
   persistida.

`materiality` y `event_type` vienen del análisis Gemini y se persisten en
`news_analysis`. Son señales no verificadas del modelo: sirven para filtrar
ruido y clasificar catalizadores, no para afirmar impacto de mercado ni
recomendar comprá/vendé. Filas previas a estas columnas se migran con
default `low` / `none` (no generan push de catalizador hasta re-análisis).

Ejemplos:

| Caso | ¿Alerta push? |
|------|----------------|
| `negative` + tickers + `high` + `none` | Sí (sujeto a universo) |
| `positive` + tickers + `medium` | Sí (sujeto a universo) |
| `negative` + tickers + `low` | No |
| `positive` + sin tickers + `high` | No |
| `neutral` + tickers + `high` + `none`/`other` | No |
| `neutral` + ticker en watchlist/cartera + `high` + `ipo` | Sí |
| `neutral` + `ipo` + `low` | No |

`evaluateArticle(articleId)` carga `news_analysis` y consulta si ya existe
fila en `notifications` para ese artículo.

## Notifications (Telegram)

El módulo `notifications/` envía alertas al chat configurado con
`TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` (Bot API `sendMessage` vía
`fetch`, sin SDK):

1. Busca análisis sin fila en `notifications`.
2. Evalúa relevancia con `RelevanceService`.
3. Si es relevante, aplica **clustering de historias** (ver abajo): si ya
   hubo push de la misma historia en la ventana, suprime el envío.
4. Si no es duplicado, formatea el mensaje (título, resumen, sentimiento,
   tipo de evento si no es `none`, tickers, URL) según `APP_LOCALE` y lo
   envía a Telegram. El título preferido es `news_analysis.headline`; si
   está vacío se usa el título RSS. El resumen es el de `news_analysis`
   (ya en locale); no hay traducción extra ni llamada Gemini al notificar.
5. Tras envío exitoso, persiste en `notifications` (`channel: telegram`) y
   registra el artículo en `news_story_clusters` / members.
6. No reenvía artículos ya notificados (ni push ni suprimidos por cluster).

### Story clustering (duplicate stories)

Varias fuentes RSS pueden contar el mismo hecho con distinta URL/hash.
Eso no lo cubre el dedupe del collector. Antes del push, el servicio
agrupa “misma historia” con una heurística explicable (sin embeddings):

| Señal | Regla |
|-------|--------|
| Ventana | `publishedAt` (o `analyzedAt`) dentro de `STORY_CLUSTER_WINDOW_HOURS` (default **24h**, máx. 168) |
| Tickers | ≥1 ticker en común (normalizados a mayúsculas) |
| `event_type` | mismo valor, o ambos `none`/`other` |
| Texto | Jaccard de tokens del **título** o del **summary** ≥ 0.35 |

Comportamiento:

- La **primera** alerta relevante del cluster sí puede enviarse por Telegram.
- Artículos posteriores de la misma historia **no** generan un segundo push;
  se persisten en `news_story_cluster_members` y una fila `notifications`
  con `payload.suppressed: true` + `reason: duplicate_story` (para no
  reintentar).
- No reemplaza el dedupe por URL/`content_hash` del collector.

Labels del mensaje (`en` / `es`): Title/Título, Summary/Resumen,
Sentiment/Sentimiento, Event/Evento (omitido si `none`), Tickers, URL.
Valores de display localizados (código EN → label):

| Campo | Códigos (DB) | Display `en` | Display `es` |
|-------|--------------|--------------|--------------|
| sentimiento | `positive` / `negative` / `neutral` | mismos códigos | positivo / negativo / neutral |
| materialidad | `low` / `medium` / `high` | mismos códigos | baja / media / alta |
| evento | `ipo` / `earnings` / `m_and_a` / `regulation` / `other` | mismos códigos | IPO / resultados / fusión/adquisición / regulación / otro |

Si no hay `headline` (análisis previos a este campo), el título mostrado
es el RSS (puede quedar en el idioma de la fuente). La URL del artículo
también.

Invocación local (one-shot, sin esperar al cron del pipeline):

```bash
npm run telegram:test          # mensaje de prueba (respeta APP_LOCALE; no persiste)
npm run telegram:notify-once   # notifica relevantes pendientes
npm run telegram:digest-once   # digesto del período (material medium+, no pusheados)
```

No loguees el bot token.

### Digesto diario/semanal (baja urgencia)

No todo lo material merece push inmediato. El digesto es un canal aparte del
pipeline (`COLLECTION_CRON_SCHEDULE`):

| | Push inmediato | Digesto |
|--|----------------|---------|
| Cuándo | Cada tick del pipeline | Cron `DIGEST_CRON_SCHEDULE` (default diario 12:00 UTC) |
| Qué | Relevantes (materialidad + sentimiento/catalizador + universo) | `materiality` medium/high en la ventana, **sin** push real previo |
| Cluster | Primera historia sí push; duplicados se suprimen | Duplicados suprimidos sí pueden entrar al digesto |
| Persistencia | `notifications` | `digest_runs` + `digest_items` (no bloquea futuros push) |

Reglas:

- Ventana: `DIGEST_LOOKBACK_HOURS` (default **24**). Para semanal usá
  `DIGEST_CRON_SCHEDULE=0 12 * * 1` y `DIGEST_LOOKBACK_HOURS=168`.
- No reenvía artículos ya presentes en `digest_items`.
- Si no hay candidatos → log + skip (sin mensaje vacío).
- Mensaje único truncado al límite de Telegram; si no caben todos, footer
  `(+N more omitted)` / `(+N más omitidos)`.
- Respeta `APP_LOCALE` en los labels del mensaje y en el display de
  sentimiento / materialidad / evento (códigos EN en DB).
- Usa `headline` localizado cuando existe; si no, el título RSS.
- Si hay watchlist/holdings activos, solo incluye tickers de ese universo.

## Holdings (portfolio)

El módulo `portfolio/` persiste la cartera del operador (no es sync con
broker ni recomendaciones de comprá/vendé). Una fila activa por
`symbol` + `asset_type`; el borrado es soft-delete (`deleted_at`).

| Campo | Notas |
|-------|--------|
| `symbol` | Ticker normalizado a mayúsculas |
| `assetType` | `equity`, `cedear`, `bond`, `treasury`, `other` |
| `quantity` | Decimal > 0 |
| `currency` | ISO 3 letras (default `USD`) |
| `avgEntryPrice` | Opcional |
| `notes` | Tesis corta opcional |

API REST (sin auth en v1; pensada para red interna / Docker):

```bash
# Listar
curl -s http://localhost:3000/holdings | jq

# Crear
curl -s -X POST http://localhost:3000/holdings \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"AAPL","assetType":"equity","quantity":10,"currency":"USD","notes":"core"}' | jq

# Actualizar
curl -s -X PATCH http://localhost:3000/holdings/<id> \
  -H 'Content-Type: application/json' \
  -d '{"quantity":12.5}' | jq

# Soft-delete
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/holdings/<id>
```

Tras cambiar el schema: `npm run migration:run`.

Cartera (`holdings`) ≠ watchlist (`watchlist_entries` / `/watchlist`):

| | Cartera (`/holdings`) | Watchlist (`/watchlist`) |
|--|----------------------|--------------------------|
| Qué es | Posiciones del operador (cantidad, moneda, tipo) | Tickers que el operador **sigue** |
| Uso | Briefs/journal/contexto de cartera | Filtro de alertas de relevancia |
| Sin posición | No aplica | Sí: podés seguir un ticker sin tenerlo |

### Watchlist (REST)

Tabla `watchlist_entries`: `symbol` (unique activo), `notes` opcional,
timestamps + soft-delete (`deleted_at`). Misma convención que holdings:
`DELETE` no borra la fila; queda fuera del listado y libera el símbolo.

```bash
# Listar
curl -s http://localhost:3000/watchlist | jq

# Agregar
curl -s -X POST http://localhost:3000/watchlist \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"AAPL","notes":"earnings watch"}' | jq

# Actualizar notas
curl -s -X PATCH http://localhost:3000/watchlist/<id> \
  -H 'Content-Type: application/json' \
  -d '{"notes":"catalyst upcoming"}' | jq

# Soft-delete (quitar de la watchlist)
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/watchlist/<id>
```

Con watchlist persistida no vacía, `RelevanceService` **ignora**
`WATCHLIST_TICKERS` y solo alerta si el análisis intersecta esos símbolos.
Si la tabla está vacía, sigue valiendo el env como fallback de transición.

## Journal de hipótesis de research

El módulo `research/` registra tesis explícitas para revisarlas después. Una
hipótesis es memoria de research: **no** representa una orden de broker ni una
recomendación de compra/venta.

Campos principales:

- `bias`: `bullish`, `bearish` o `watch`.
- `horizonDays`: horizonte positivo expresado en días.
- `status`: `open` al crear; pasa a `closed` mediante el endpoint de cierre.
- `source`: `manual` (default), `brief` o `alert`.
- `sourceRefId`: UUID opcional y opaco del brief/alerta de origen. No es una FK
  porque puede referenciar distintos tipos de registro.

```bash
# Crear una hipótesis manual
curl -s -X POST http://localhost:3000/hypotheses \
  -H 'Content-Type: application/json' \
  -d '{
    "symbol":"AAPL",
    "bias":"bullish",
    "thesis":"Services growth supports margins.",
    "invalidation":"Services growth falls below 5%.",
    "horizonDays":90
  }' | jq

# Listar abiertas (open es el filtro default)
curl -s 'http://localhost:3000/hypotheses?status=open' | jq

# Cerrar con nota opcional
curl -s -X PATCH http://localhost:3000/hypotheses/<id>/close \
  -H 'Content-Type: application/json' \
  -d '{"closeNote":"Evidence changed."}' | jq

# Listar cerradas
curl -s 'http://localhost:3000/hypotheses?status=closed' | jq
```

El cierre es irreversible desde esta API. Un segundo intento devuelve `409`;
un identificador inexistente devuelve `404`.

## Review de hipótesis

Cierra el loop de aprendizaje del journal: a fin de mes (cron), por Telegram
(`/review`) o por HTTP/script. Evalúa hipótesis **cerradas en el período** o
**abiertas con horizonte vencido**. No revisa abiertas cuyo horizonte aún no
terminó (salvo cierre manual).

### Outcomes (códigos EN en DB)

| Outcome | Significado |
|---------|-------------|
| `thesis_confirmed` | El precio se movió de forma compatible con el `bias` (proxy) |
| `thesis_rejected` | El precio se movió en contra del `bias` (proxy) |
| `timing_issue` | La dirección alineó **después** del horizonte declarado |
| `inconclusive` | Sin datos de precio, barras insuficientes, o movimiento lateral |

Umbral de movimiento material: **±5%** close-to-close. El precio es un proxy
honesto, **no** verifica catalizadores textuales ni es un backtest científico.
Sin market data → `inconclusive` y `price_return_pct = null` (nunca inventa %).

Campos separados: `thesis_quality_note`, `timing_note`, `learning_note`,
`explanation` + disclaimer.

### Disparar un review

```bash
# One-shot (mes UTC actual, o YYYY-MM)
npm run migration:run
npm run review:once
npm run review:once -- 2026-01

# Telegram (chat privado): /review  o  /review 2026-01

# HTTP (requiere DASHBOARD_API_KEY)
export DASHBOARD_API_KEY=pick_a_long_random_string
curl -s -X POST http://localhost:3000/reviews/run \
  -H "Content-Type: application/json" \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" \
  -d '{"notify":true}' | jq

# List / detail
curl -s 'http://localhost:3000/reviews?page=1&limit=20' \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq
curl -s "http://localhost:3000/reviews/<id>" \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq
```

`POST /reviews/run` acepta `periodStart` / `periodEnd` (ISO) juntos, o el mes
calendario UTC actual si se omiten. `notify: false` persiste sin Telegram.

Cron default: `REVIEW_CRON_SCHEDULE=0 12 1 * *` (día 1, 12:00 UTC).
Ese tick revisa el **mes UTC anterior** (cierre de mes). On-demand sin args
(`/review`, `review:once`, `POST /reviews/run` vacío) usa el mes UTC **actual**.

## API de lectura de noticias (dashboard)

Endpoints **solo lectura** para el BFF del dashboard (ADR 003). Requieren el
header `x-dashboard-api-key` (`DASHBOARD_API_KEY`); con la variable vacía
responden `401`. No re-corren el pipeline ni editan artículos.

| Endpoint | Descripción |
|----------|-------------|
| `GET /news/articles` | Artículos paginados, con `analysis` embebido si existe |
| `GET /news/articles/:id` | Detalle de un artículo + análisis asociado (`404` si no existe) |
| `GET /news/analyses` | Análisis paginados (orden `analyzed_at` DESC) |

Query params comunes (list): `page` (default `1`), `limit` (default `20`,
máx `100`), `ticker` (matchea contra `analysis.tickers`, case-insensitive),
`from` / `to` (ISO; sobre `created_at` de artículos — fecha de **ingesta**,
no `published_at` — y `analyzed_at` de análisis). Un `to` fecha-sola
(`YYYY-MM-DD`) es **inclusivo**: cubre ese día UTC completo. Shape de
respuesta paginada: `{ items, page, limit, total }`.

```bash
export DASHBOARD_API_KEY=pick_a_long_random_string

# Listar artículos (con filtros opcionales)
curl -s 'http://localhost:3000/news/articles?page=1&limit=20&ticker=AAPL' \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq

# Detalle de artículo (incluye analysis si existe)
curl -s "http://localhost:3000/news/articles/<id>" \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq

# Listar análisis
curl -s 'http://localhost:3000/news/analyses?from=2026-07-01&to=2026-07-31' \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq
```

Los campos de respuesta salen tal cual de `news_articles` / `news_analysis`
(sin datos de mercado inventados): `analysis` incluye `headline`, `summary`,
`sentiment`, `tickers`, `materiality`, `eventType`, `model`, `analyzedAt`.

## API de lectura de notificaciones (dashboard)

Endpoints **solo lectura** sobre la tabla `notifications` (alertas enviadas y
supresiones de duplicados) para el BFF del dashboard (ADR 003). Requieren el
header `x-dashboard-api-key` (`DASHBOARD_API_KEY`); con la variable vacía
responden `401`. No hay creación ni borrado de alertas por API: las alertas
las genera solo el pipeline.

| Endpoint | Descripción |
|----------|-------------|
| `GET /notifications` | Notificaciones paginadas (orden `sent_at` DESC), con `article` y su `analysis` embebidos |
| `GET /notifications/:id` | Detalle de una notificación + artículo/análisis asociados (`404` si no existe) |

Query params (list): `page` (default `1`), `limit` (default `20`, máx `100`),
`ticker` (matchea contra `analysis.tickers` del artículo, case-insensitive),
`from` / `to` (ISO, sobre `sent_at`). Un `to` fecha-sola (`YYYY-MM-DD`) es
**inclusivo**: cubre ese día UTC completo. Shape de respuesta paginada:
`{ items, page, limit, total }`.

Cada notificación expone `id`, `channel` (`telegram`), `sentAt` y el `payload`
jsonb tal cual se persistió: para alertas enviadas incluye `title`, `summary`,
`sentiment`, `tickers`, `url`, `eventType` (y `clusterId` si aplica); para
duplicados suprimidos incluye `suppressed: true`, `reason` y
`matchedArticleId`. El vínculo al detalle es `article` (con `analysis`
embebido si existe).

```bash
export DASHBOARD_API_KEY=pick_a_long_random_string

# Listar notificaciones (con filtros opcionales)
curl -s 'http://localhost:3000/notifications?page=1&limit=20&ticker=AAPL' \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq

# Detalle de una notificación (incluye article + analysis)
curl -s "http://localhost:3000/notifications/<id>" \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq

# Filtrar por rango de fechas de envío
curl -s 'http://localhost:3000/notifications?from=2026-07-01&to=2026-07-31' \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq
```

## API de research briefs (dashboard)

Endpoints de **lectura + request** sobre `research_briefs` para el BFF del
dashboard (ADR 003). Requieren el header `x-dashboard-api-key`
(`DASHBOARD_API_KEY`); con la variable vacía responden `401`.

`POST /briefs` reutiliza el mismo pipeline que Telegram `/brief` y
`npm run brief:once` (`BriefService`): Gemini + market data + persistencia +
envío al chat configurado. Es **síncrono**: la respuesta HTTP espera a que el
brief se persista (puede tardar decenas de segundos por Gemini/Yahoo).

| Endpoint | Descripción |
|----------|-------------|
| `GET /briefs` | Briefs paginados (orden `created_at` DESC) |
| `GET /briefs/:id` | Detalle de un brief (`chartAvailable`; `404` si no existe) |
| `GET /briefs/:id/chart` | PNG del chart técnico (`image/png`; `404` si no hay chart) |
| `POST /briefs` | Solicita un brief para `{ "ticker": "AAPL" }` → `201` + fila persistida |

Query params (list): `page` (default `1`), `limit` (default `20`, máx `100`),
`ticker` (match exacto de `symbol`, case-insensitive). Shape paginada:
`{ items, page, limit, total }`.

Cada brief expone `id`, `symbol`, `locale`, `sections` (overview / fundamental /
technical / risks / invalidation / disclaimer), `promptVersion`, `stance`,
`stanceRationale`, `marketAsOf`, `marketSource`, `holdingId`, `createdAt`.
El detalle incluye además `chartAvailable` (boolean); el blob PNG **no** viaja
en el JSON de listado ni de detalle. Sin market data o fallo de Gemini →
`stance`/`market*` en `null` o error HTTP explícito (`400` / `409` si ya hay
un brief en curso); **nunca** inventa números de mercado.

```bash
export DASHBOARD_API_KEY=pick_a_long_random_string

# Solicitar brief (síncrono; deja registro consultable)
curl -s -X POST http://localhost:3000/briefs \
  -H "Content-Type: application/json" \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" \
  -d '{"ticker":"AAPL"}' | jq

# Listar / filtrar
curl -s 'http://localhost:3000/briefs?page=1&limit=20&ticker=AAPL' \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq

# Detalle
curl -s "http://localhost:3000/briefs/<id>" \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" | jq

# Chart PNG (si chartAvailable=true)
curl -s "http://localhost:3000/briefs/<id>/chart" \
  -H "x-dashboard-api-key: $DASHBOARD_API_KEY" \
  -o chart.png
```

Si Telegram falla **después** de persistir, `POST` igual responde `201` con el
brief guardado (consultable por `GET`); el error de delivery solo afecta el
canal Telegram.

## Brief on-demand (`/brief`)

Brief educativo TA/FA a pedido (modo research). Con market data disponible
incluye una **postura etiquetada** (`stance`) relativa a holdings; sin market
data **no** inventa precios ni postura. Usa `GEMINI_API_KEY_FINANCE` +
`APP_LOCALE` + `MarketDataService` (#55).

| Pieza | Rol |
|-------|-----|
| `brief/` | Prompt Gemini, persistencia en `research_briefs` (sections + stance), formato Telegram |
| `market-data/` | OHLCV verificado → facts block del prompt; fallo → stance `null` |
| `telegram-bot/` | Inbound: `POST /telegram/webhook` + router `/brief` `/help` |
| Holdings | Sin posición: `enter` \| `avoid` \| `watch`. Con posición: `hold` \| `add` \| `reduce` \| `exit` |

Secciones educativas JSON: `overview`, `fundamental`, `technical`, `risks`,
`invalidation`, `disclaimer`. Columnas dedicadas: `stance`,
`stance_rationale`, `market_as_of`, `market_source` (ADR 002). Códigos EN en
DB; labels localizados en Telegram. La postura es **hipótesis de research**
con disclaimer visible — no orden de broker ni asesoramiento regulado.

### Pedir un brief

**Producción (webhook HTTPS):**

1. Seteá `TELEGRAM_WEBHOOK_SECRET` (string largo aleatorio).
2. Registrá el webhook con el mismo secret:

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_PUBLIC_HOST/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

3. En Telegram, al chat **privado** de `TELEGRAM_CHAT_ID`: `/brief AAPL`

Seguridad inbound:

- Preferí chat 1:1 (`TELEGRAM_CHAT_ID` > 0). Chats de grupo (`id` negativo)
  se ignoran.
- Opcional: `TELEGRAM_ALLOWED_USER_IDS` para restringir quién puede mandar
  comandos dentro del chat permitido.
- El webhook responde `200` de inmediato y procesa en background; dedupe por
  `update_id` en memoria (proceso único).
- Updates de otros chats / usuarios se ignoran. Sin secret → `401`.

**Local sin HTTPS (long polling):**

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"
npm run telegram:poll
# luego en Telegram: /brief AAPL
```

**One-shot (sin inbound):**

```bash
npm run migration:run
npm run brief:once -- AAPL
```

**HTTP (dashboard BFF):** ver [API de research briefs](#api-de-research-briefs-dashboard)
(`POST /briefs` con `DASHBOARD_API_KEY`).

Validar stance vs holdings:

1. Sin holding: `npm run brief:once -- AAPL` → stance `enter`/`avoid`/`watch`
   (si Yahoo responde).
2. `POST /holdings` con el mismo ticker y repetir → stance
   `hold`/`add`/`reduce`/`exit`.
3. Forzar fallo de provider (ticker inválido o red) → mensaje de insuficiencia,
   `stance` null, sin números inventados.

Límites: 1 brief a la vez; no es asesoramiento de inversión ni ejecución de
órdenes.

### Chart técnico en imagen (follow-up del brief)

Cuando el brief tiene market data adjunto y `TECHNICAL_CHART_ENABLED=true`
(default), después del texto llega una **imagen PNG** (~1280×720) por
`sendPhoto`, renderizada de forma **determinista** desde las mismas barras
OHLCV del provider (ADR 004). El mismo buffer se persiste en
`research_briefs.chart_png` para reutilizarlo en el desk (`GET /briefs/:id/chart`).

Marcas incluidas (ilustrativas, computadas solo desde OHLCV — no "confirman"
la postura):

- **Velas diarias** de la misma ventana del brief, cap por
  `TECHNICAL_CHART_MAX_BARS` (default 90).
- **SMA sobre cierres** por cada período de `TECHNICAL_CHART_SMA_PERIODS`
  (default `20`); si la ventana tiene menos barras que el período, la línea
  se omite sin fallar.
- **Niveles horizontales**: máximo/mínimo de la ventana visible y último
  cierre.

Degradación: sin market data no hay chart (consistente con stance `null`).
Si el render falla, no hay PNG; el brief textual ya fue entregado y llega un
aviso corto de "chart no disponible". Si `sendPhoto` falla tras un render OK,
el PNG puede quedar persistido igual para el desk. El error del chart nunca
tira el brief. Render server-side con `@napi-rs/canvas` (binarios prebuilt
glibc/musl; sin cairo/pango en Alpine).

Validar en local:

```bash
npm run migration:run
npm run brief:once -- AAPL
# En Telegram: primero el texto del brief, luego la foto del chart.
# TECHNICAL_CHART_ENABLED=false npm run brief:once -- AAPL → solo texto.
# curl -H "x-dashboard-api-key: $DASHBOARD_API_KEY" \
#   http://localhost:3000/briefs/<id>/chart -o chart.png
```

## Market data OHLCV

`market-data/` expone barras históricas diarias mediante `MarketDataService`.
El adapter v1 usa el endpoint chart público de Yahoo Finance y retorna símbolo,
timeframe, barras OHLCV, fecha de consulta y `source`. No hay fallback con
precios hardcodeados: ticker inexistente, timeout, HTTP error o respuesta sin
barras completas producen `MarketDataUnavailableError`.

Smoke local:

```bash
# Requiere las variables normales de boot y PostgreSQL disponible.
npm run market-data:once -- AAPL
```

El JSON esperado incluye `source: "yahoo-finance-chart"`, `timeframe: "1d"`,
`bars` mayor a cero y `firstBar` / `lastBar` con `open`, `high`, `low`, `close`
y `volume`. Para validar el error explícito:

```bash
npm run market-data:once -- THISDOESNOTEXIST
```

Límites: ventana fija de seis meses, barras diarias, sin cotización en tiempo
real, cache ni SLA. Yahoo no requiere API key en v1, pero puede aplicar rate
limits o cambiar el endpoint; el port permite reemplazar el adapter sin
cambiar los consumidores.

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

MVP funcional — pipeline end-to-end automatizado vía Issues #1–#7. Próxima
fase v1 (locale, research bot): ver `/issues` o `.github/ISSUE_WORKFLOW.md`.
