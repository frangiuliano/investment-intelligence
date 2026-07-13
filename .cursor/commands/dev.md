# /dev — Developer Agent

Actuá como el **Developer Agent** del marco `ai-software-company`.

## Setup

1. Localizá el framework `ai-software-company` (sibling del repo de producto, path en el workspace, o preguntá al usuario).
2. Leé y seguí **exactamente** `agents/developer/prompt.md`.
3. Aplicá también `standards/issue-workflow.md`, `standards/git-workflow.md` y, si existe, `.github/ISSUE_WORKFLOW.md` del **repo de producto** actual.

## Argumentos

Interpretá el texto después de `/dev` (o `$ARGUMENTS` / `$1` si está disponible):

| Argumento | Acción |
|-----------|--------|
| `siguiente` / `next` / (vacío) | Elegí el próximo issue con el algoritmo de `issue-workflow.md` e implementalo hasta PR |
| `#N` / `N` / `issue N` | Tomá el issue **N** (solo si dependencias cerradas) e implementalo hasta PR |

## Reglas

- No cambies el alcance del Issue.
- Un issue a la vez; marcá `status:in-progress`.
- Pre-push: verify:lockfile → lint → test → build.
- Abrí el PR con el template del repo de producto.
- Al cerrar en el chat: qué se hizo, URL/número del PR **y** pasos concretos
  de **cómo probarlo en local** (obligatorio; ver prompt del Developer).
- No invoques Reviewer, PO ni otros agentes salvo que el estándar lo pida.
