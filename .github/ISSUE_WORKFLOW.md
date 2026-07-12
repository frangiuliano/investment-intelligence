# Issue Workflow — investment-intelligence

Este proyecto sigue el estándar definido en
`ai-software-company/standards/issue-workflow.md`.

## Extensiones de este proyecto

- **Scope activo:** `scope:mvp` agrupa todos los issues del MVP.
- **Tipos usados:** `type:foundation` para setup/infra/DB, `type:feature` para
  funcionalidad de producto.
- **Labels legacy:** algunos issues usan `mvp`, `foundation` y `feature` sin
  prefijo `scope:` / `type:`. Tratalos como equivalentes a `scope:mvp`,
  `type:foundation` y `type:feature` respectivamente.

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

## Orden de ejecución post-MVP (v1)

| Orden | Issue | Título |
|-------|-------|--------|
| 12 | #22 | Configurar idioma de salida de la app (`APP_LOCALE`) |
| 13 | #23 | Generar análisis Gemini en el locale configurado |
| 14 | #24 | Localizar mensajes de Telegram según `APP_LOCALE` |
| 15 | #25 | Disparar recolección RSS one-shot |

Fase: `scope:v1` (cuando el label exista en el repo). No empezar v1 hasta cerrar #7, salvo #25 que solo depende del collector (#1) y es prioridad baja.

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
| CI setup | DevOps | Antes o durante issue #10 |
| AI Review workflow | DevOps | Antes o durante issue #11 |
| Cada feature | Developer | Automático por `order-NN` |
| Cada PR | Reviewer (GHA) | Automático tras CI verde (`ai-review.yml`) |

## Notas

- El Developer Agent debe leer este archivo antes de elegir el próximo issue.
- Un solo issue con `status:in-progress` dentro de `scope:mvp` a la vez.
- Pre-push obligatorio: `lint → test → build` (ver `testing-standards.md`).
- Merge a `main` sigue siendo manual tras el veredicto del AI Review.
