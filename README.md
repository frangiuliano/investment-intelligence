# Investment Intelligence

## Visión

Investment Intelligence es un sistema de investigación de inversiones que
monitorea fuentes financieras (noticias, RSS), analiza su contenido con IA,
y genera alertas y recomendaciones accionables (comprar/vender/mantener tal
activo, tal ETF sale al mercado, etc.).

El objetivo NO es predecir el mercado ni reemplazar el juicio del inversor.
El objetivo es reducir el tiempo de investigación manual y detectar señales
que de otra forma pasarían desapercibidas.

Al cierre de cada mes, el sistema genera un informe de desempeño: cuántas
recomendaciones hizo, cómo le fue a cada una, y qué ajustar.

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

- Backend: NestJS
- DB: PostgreSQL
- IA: Gemini Flash (plan gratuito)
- Notificaciones: Telegram Bot API
- Contenedores: Docker

## Estado

En desarrollo — MVP en construcción vía flujo de Issues (ver /issues).