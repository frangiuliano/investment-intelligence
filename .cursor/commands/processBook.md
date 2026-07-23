# /processBook — Knowledge Pack ingest (one PDF → playbook)

Procesá **un** PDF/TXT bajo `knowledge/sources/` hasta mergearlo en el
playbook correcto. El operador **no** elige el `.md` destino.

## Setup

1. Repo de producto: `investment-intelligence` (cwd del workspace).
2. Leé y seguí **exactamente** el skill
   `.agents/skills/knowledge-ingest/SKILL.md` (o `.cursor/skills/knowledge-ingest`).
3. Aplicá reglas Fin de `--target` y géneros en
   `knowledge/_prompts/filter-themes.md` + `.json`.

## Argumentos

El texto después de `/processBook` (o un `@archivo` adjunto) es la fuente:

| Argumento | Acción |
|-----------|--------|
| path / `@knowledge/sources/….pdf` | Ingestá ese archivo |
| (vacío) | Pedí el path o que adjunte el PDF bajo `sources/` |
| `--draft-only` | Parar tras QA en `raw/<docId>/` **sin** promover a `playbooks/` |
| `--push` | Tras promover: commit(s) ordenados + push a `main` (solo si el usuario lo pide explícito en el mensaje) |

Si el PDF aún no está en `knowledge/sources/`, pedí copiarlo ahí (los PDF
siguen gitignored).

## Quién decide el destino

**`/fin` rules embebidas en el skill** (el Agent las aplica; no preguntes al
operador):

| Contenido | `--target` |
|-----------|------------|
| TA / psicología / equity genérico | `equity` (**default**) |
| Mecánica CEDEAR | `cedear` |
| Bonos / tasas / crédito | `bond` |

No creés un playbook nuevo por libro.

## Pipeline (ejecutá vos; no le pidas comandos al humano)

1. Elegí `--target` + género (`technical_analysis`, `trading_psychology`, …).
2. `npm run knowledge:prepare -- "<source>" --target <asset>`
3. `npm run knowledge:rank-chunks -- knowledge/raw/<docId> --genre <id>`
4. Extract **solo** chunks en `selected-chunks.json` (`_prompts/extract.md`).
5. Merge → `raw/<docId>/playbook.md` (`merge.md`) + QA (`qa.md`) hasta PASS.
6. Salvo `--draft-only`: mergeá a `knowledge/playbooks/<target>.md`, bump
   `knowledgeVersion` patch, agregá `sources[]` en `manifest.json`.
7. Resumí en el chat: `docId`, target, genre, chunks selected/total, version.

## Reglas

- Nunca pegues el libro entero en un prompt (máx ~3000 chars por chunk).
- No inventes keywords fuera de `filter-themes.json`.
- No force-add PDFs.
- No ejecutes Nest/cron; esto es tooling offline + Agent.
- No abras PR ni pushes salvo que el usuario lo pida (`--push` / “pusheá”).
