# ADR 005 — Vendor-agnostic LLM port with Gemini adapter

## Status

Accepted (Developer, 2026-07-23) for Issue #81.

## Context

News analysis and research briefs each had a Nest client that called the
Gemini REST `generateContent` API directly. That couples domain flows to one
vendor and duplicates HTTP/timeout handling. Issues #83 (Knowledge Pack
injection) and #85 (eval harness) need a stable port so prompts and fixtures
can target an abstraction.

## Decision

### Module `src/llm/`

- **`LlmClient` port** (`completeJson({ system, user, schemaVersion?,
  temperature?, maxOutputTokens?, timeoutMs? })`) — Dependency Inversion.
- **`GeminiLlmAdapter`** — only production adapter today; uses
  `GEMINI_API_KEY_FINANCE` + `GEMINI_MODEL`.
- **`LlmModule`** factory selects the adapter from `LLM_PROVIDER` (default
  `gemini`). Unsupported providers fail at validation / boot with a clear
  error.
- Domain clients (`GeminiClient`, `BriefGeminiClient`) keep prompt build +
  JSON parse; they call the port and map `LlmApiError` to existing domain
  errors so retry behavior stays unchanged.

### Config

| Env | Role |
|-----|------|
| `LLM_PROVIDER` | Declared provider (`gemini` only for now) |
| `GEMINI_MODEL` | Model id when provider is Gemini |
| `GEMINI_API_KEY_FINANCE` | Finance project key (never Reviewer key) |

### Out of scope (this ADR / #81)

- Second real provider (OpenAI/Anthropic).
- Knowledge Pack injection (#83).
- Changing analysis/brief output schemas.

## Consequences

- CI and unit tests mock `LLM_CLIENT` (or `fetch` only inside the Gemini
  adapter); no live API calls in default test runs.
- Adding a provider later is an adapter + allowlist change, not a rewrite of
  analysis/brief prompts.
