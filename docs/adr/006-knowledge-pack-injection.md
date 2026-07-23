# ADR 006 — Knowledge Pack injection (metadata/keyword)

## Status

Accepted (Developer, 2026-07-23) for Issue #83.

## Context

Issue #80 shipped a versioned `knowledge/` pack (playbooks + rubrics).
Issue #81 introduced `LlmClient` so prompts can stay vendor-agnostic.
Runtime analysis and briefs still used generic system prompts with no pack
context, and did not persist which knowledge version was used.

## Decision

### Module `src/knowledge/` (runtime only)

Separate from offline `src/knowledge-ingest/` (SOLID: Single Responsibility).

- **`KnowledgePackService`** loads `manifest.json` + markdown once (process
  cache), selects chunks, applies a character budget, and returns
  `{ knowledgeVersion, markdown, matchedIds }` or a degraded empty result.
- **Selection = metadata / keyword first** (no embeddings):
  - **Playbook:** explicit `assetTypes` (briefs/holdings) → keyword hints in
    article text → default `equity`.
  - **Rubrics:** analysis always gets `materiality` + `event-types`; briefs
    get `stance-invalidation` when stance is expected.
- **Budget:** `KNOWLEDGE_CONTEXT_MAX_CHARS` (default 12_000). Truncate with an
  explicit marker rather than crashing.
- **Degradation:** missing root/manifest/file → log + continue with prior
  prompt shape; `knowledgeVersion` persisted as `null` unless injection was
  actually appended. Load is retried on later calls until the pack caches.
- **Path safety:** playbook/rubric paths are resolved with `fs.realpath` and
  must stay under the pack root (same symlink hardening as ingest).

### Prompt wiring

Domain clients (`GeminiClient`, `BriefGeminiClient`) call the knowledge
service, append pack markdown to the **system** prompt via a shared helper,
and keep JSON schemas unchanged. They still call `LlmClient.completeJson`.

### Persistence

- `news_analysis.prompt_version`, `news_analysis.knowledge_version`
- `research_briefs.knowledge_version` (briefs already had `prompt_version`)
- Bump prompt constants when injection lands (`news-analysis-v2`, `brief-v3`)

### Config

| Env | Role |
|-----|------|
| `KNOWLEDGE_ROOT` | Absolute or cwd-relative pack root (default `knowledge`) |
| `KNOWLEDGE_CONTEXT_MAX_CHARS` | Max injected markdown characters |

## Out of scope

- Vector DB / semantic RAG.
- Changing `RelevanceService` rules.
- Fine-tuning or auto-updating playbooks from feedback (#84).

## Consequences

- Restart the process to pick up pack file edits (intentional cache).
- Desk/API can surface `knowledgeVersion` for audit; eval harness (#85) can
  pin fixtures against a version.
