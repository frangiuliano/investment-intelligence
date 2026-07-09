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
| 05 | #2 | Conexión y modelo de datos en PostgreSQL |
| 06 | #1 | Crear News Collector desde RSS feeds |
| 07 | #3 | Integración con Gemini Flash para análisis de noticias |
| 08 | #6 | Definir criterios de relevancia para alertas |
| 09 | #4 | Notificación por Telegram de noticias relevantes |
| 10 | #7 | Orquestar pipeline de procesamiento end-to-end |

## Agentes recomendados por fase

| Fase | Agente | Cuándo invocar |
|------|--------|----------------|
| Pre-scaffold | Architect | Antes del issue #8 |
| CI setup | DevOps | Antes o durante issue #10 |
| Cada feature | Developer | Automático por `order-NN` |
| Cada PR | Reviewer | Cuando CI esté verde |

## Notas

- El Developer Agent debe leer este archivo antes de elegir el próximo issue.
- Un solo issue con `status:in-progress` dentro de `scope:mvp` a la vez.
- Pre-push obligatorio: `lint → test → build` (ver `testing-standards.md`).
