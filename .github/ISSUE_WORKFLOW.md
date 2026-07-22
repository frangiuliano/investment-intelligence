# Issue Workflow — investment-intelligence

Este proyecto sigue el estándar definido en
`ai-software-company/standards/issue-workflow.md`.

## Extensiones de este proyecto

- **Scope activo:** `scope:mvp` agrupa todos los issues del MVP.
- **Scope v1:** bot de research (locale, relevancia, cartera, eventos, digesto,
  briefs, journal, review).
- **Scope v2:** dashboard de lectura.
- **Tipos usados:** `type:foundation` para setup/infra/DB, `type:feature` para
  funcionalidad de producto, `type:chore` para tooling.
- **Labels legacy:** algunos issues usan `mvp`, `foundation` y `feature` sin
  prefijo `scope:` / `type:`. Tratalos como equivalentes a `scope:mvp`,
  `type:foundation` y `type:feature` respectivamente.
- **Orden en body:** si falta el label `order-NN` en GitHub, la sección
  **Orden de ejecución** del body es la fuente de verdad.

## Orden de ejecución del MVP

Usar el label `order-NN`, no el número de issue de GitHub:

| Orden | Issue | Título |
|-------|-------|--------|
| 01 | #8 | Inicializar proyecto NestJS con Docker Compose |
| 02 | #5 | Configurar variables de entorno y validación |
| 03 | #9 | Configurar testing base con Jest y convenciones |
| 04 | #10 | Configurar CI en GitHub Actions |
| 05 | #11 | Automatizar Reviewer Agent en PRs con ai-review.yml |
| 06 | #2 | Conexión y modelo de datos en PostgreSQL |
| 07 | #1 | Crear News Collector desde RSS feeds |
| 08 | #3 | Integración con Gemini Flash para análisis de noticias |
| 09 | #6 | Definir criterios de relevancia para alertas |
| 10 | #4 | Notificación por Telegram de noticias relevantes |
| 11 | #7 | Orquestar pipeline de procesamiento end-to-end |

## Orden de ejecución post-MVP (v1) — locale y tooling

| Orden | Issue | Título |
|-------|-------|--------|
| 12 | #22 | Configurar idioma de salida de la app (`APP_LOCALE`) |
| 13 | #23 | Generar análisis Gemini en el locale configurado |
| 14 | #24 | Localizar mensajes de Telegram según `APP_LOCALE` |
| 15 | #25 | Disparar recolección RSS one-shot |

No empezar v1 de producto (desde #26) hasta cerrar #7. #25 solo depende del
collector (#1) y es prioridad baja.

Follow-up de locale (display + headline) vive en #49–#50 (`order-22` /
`order-23`), **antes** de briefs (#32) y del dashboard (#35).

## Orden de ejecución post-MVP (v1) — research bot

Criterio de producto (Finance Advisor): menos alertas de mayor calidad;
hipótesis de research; sin trading automático. Posturas etiquetadas
(`enter`/`avoid`/`hold`/…) solo con datos de mercado reales + disclaimer
(#55–#56); nunca como orden de broker.

| Orden | Issue | Título |
|-------|-------|--------|
| 16 | #26 | Endurecer relevancia con materialidad (menos ruido) |
| 17 | #27 | Persistir cartera del operador (holdings) |
| 18 | #28 | Watchlist persistida integrada a relevancia |
| 19 | #30 | Taxonomía de eventos y alertas de catalizadores |
| 20 | #29 | Clusterizar historias duplicadas en una sola alerta |
| 21 | #31 | Digesto diario/semanal por Telegram |
| 22 | #49 | Localizar valores de display (sentimiento, materialidad, evento) en Telegram |
| 23 | #50 | Generar headline localizado en el mismo análisis Gemini y usarlo en Telegram |
| 24 | #32 | Brief on-demand educativo (TA/FA) por Telegram |
| 25 | #33 | Journal de hipótesis de research |
| 26 | #34 | Review de hipótesis (mensual o a pedido) + API reviews |
| 27 | #56 | Brief con postura accionable relativa a holdings |
| 28 | #55 | Integrar fuente mínima de datos de mercado (OHLCV) — cerrado (corrió en paralelo) |
| 29 | #57 | Enviar chart de análisis técnico en imagen por Telegram |

Orden vigente post-bot (v1 abiertos): **#34 → #56 → #57**.

`#55` (cerrado) corrió en paralelo al journal tras mergear #32. `#56` requiere
`#55` (cumplido). `#57` es deseo (prioridad baja) y depende de `#56`.

## Orden de ejecución (v2) — dashboard

ADR: `docs/adr/003-dashboard-web.md` (Next.js + shadcn + Tailwind, BFF, auth).

| Orden | Issue | Título |
|-------|-------|--------|
| 30 | #62 | Exponer API de lectura de news articles y analyses |
| 31 | #63 | Exponer API de lectura de notificaciones/alertas |
| 32 | #65 | Exponer API de lectura y request de research briefs |
| 33 | #64 | Scaffold `web/` Next.js + shadcn + auth BFF |
| 34 | #35 | Dashboard research desk (5 áreas, read + write acotado) |
| 35 | #76 | Persistir imagen del chart técnico al generar un research brief |
| 36 | #77 | Mostrar chart técnico en el detalle de Informes del dashboard |

Orden vigente v2 (desk cerrado / PR #75): **#76 → #77**.

Las APIs (#62/#63/#65) y el scaffold (#64) ya están; el desk (#35) cierra
con PR #75. Post-desk: persistir PNG del chart (#76) y luego mostrarlo en
el detalle de Informes (#77). `#77` está bloqueado por `#76`. `#57` (Telegram
chart) ya entregó el render; no hace falta reabrir charts interactivos.

Si falta el label `order-NN` en GitHub, la sección **Orden de ejecución**
del body del issue es la fuente de verdad.

Skills de UI (uso automático, sin slash): `.agents/skills/frontend-design`,
`vercel-react-best-practices`, `web-design-guidelines`.

## Fuera de backlog (explícito)

- Trading automático / ejecución de órdenes.
- Señales buy/sell presentadas como **orden de broker** o consejo regulado
  sin disclaimer / sin datos de mercado (las posturas etiquetadas de #56
  son hipótesis de research para operador single-tenant).
- Backtesting “científico” con promesa de edge (fase futura aparte, si aplica).

## Gemini: dos proyectos / API keys

| Variable / secret | Proyecto | Uso |
|-------------------|----------|-----|
| `GEMINI_API_KEY_REVIEWER` | A (CI) | Workflow `ai-review.yml` (Issue #11), solo si `AI_REVIEW_ENABLED=true` |
| `GEMINI_API_KEY_FINANCE` | B (producto) | Análisis de noticias (Issue #3) — `.env` local / deploy, no Actions |

Variable de Actions `AI_REVIEW_ENABLED`: opt-in del review automático. Por
defecto apagada; el camino habitual es `/rev` en Cursor.

No compartir la misma key entre ambos: el free tier es por proyecto.

## Agentes recomendados por fase

| Fase | Agente | Cuándo invocar |
|------|--------|----------------|
| Pre-scaffold | Architect | Antes del issue #8 |
| Ideas de alertas / features de research | Finance Advisor (`/fin`) | Consultas de dominio; no crea Issues |
| Locale display / headline | — | #49–#50 siguen el ADR implícito Arch (códigos EN + display; headline en el mismo JSON) |
| Holdings / brief / journal / precios / charts / dashboard | Architect (`/arch`) | Antes de #27, #32, #33, #34, #57, #35; ADR 003 para dashboard |
| Rúbrica de review de hipótesis | Finance Advisor (`/fin`) | Antes o durante #34 |
| Vocabulario de stance | Finance Advisor (`/fin`) | Antes o durante #56 |
| Scaffold / pantallas `web/` | Skills automáticas | `frontend-design`, `vercel-react-best-practices` |
| CI setup | DevOps | Antes o durante issue #10 |
| AI Review workflow | DevOps | Antes o durante issue #11 |
| Cada feature | Developer | Automático por `order-NN` |
| Cada PR | Reviewer (GHA) | Automático tras CI verde (`ai-review.yml`) |

## Notas

- El Developer Agent debe leer este archivo antes de elegir el próximo issue.
- Un solo issue con `status:in-progress` dentro del mismo `scope:*` a la vez.
- Pre-push obligatorio: `lint → test → build` (ver `testing-standards.md`).
- Merge a `main` sigue siendo manual tras el veredicto del AI Review.
