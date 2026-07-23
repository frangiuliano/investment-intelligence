# Analysis eval harness

Offline quality checks for news analysis labels (`tickers`, `materiality`,
`event_type`, `sentiment`) against a versioned gold set.

## Commands

```bash
# Default: mock mode (deterministic, no API key)
npm run eval:analysis

# Live opt-in (uses LLM port / Gemini via GEMINI_API_KEY_FINANCE)
npm run eval:analysis -- --live

# Live subset (cheaper)
npm run eval:analysis -- --live --ids 001-aapl-earnings-beat,006-rumor-low-materiality
```

Optional env:

| Variable | Mode | Notes |
|----------|------|-------|
| `GEMINI_API_KEY_FINANCE` | live | Required |
| `GEMINI_MODEL` | live | Default `gemini-3.1-flash-lite` |
| `APP_LOCALE` | both | Prompt locale (`en` \| `es`) |
| `KNOWLEDGE_ROOT` | both | Knowledge Pack root (default `knowledge`) |
| `KNOWLEDGE_CONTEXT_MAX_CHARS` | both | Pack injection budget (default `12000`, same as prod) |

CI and `npm run test` only exercise **mock** paths (no paid live calls).

## Fixture shape

Files live in `eval/analysis/fixtures/*.json`:

- `input` — article fields fed to the analysis prompt builder
- `expected` — gold hard labels (canonical English codes)
- `mockModelResponse` — deterministic replay for mock mode (must parse via
  `parseGeminiAnalysisText`)

Prefer fewer well-labeled cases (10–30) over noisy volume. Soft text fields
(`headline` / `summary`) are **not** scored in v1.

## How to read the score

The CLI prints JSON:

- `passRate` — fraction of cases where **all** hard fields match
- Per case `fields[]` — expected vs actual for each hard field
- `gatePassed` — whether the run clears the approval gate

Hard-field rules:

| Field | Match |
|-------|--------|
| `tickers` | Same set (order-independent, uppercased) |
| `materiality` | Exact enum |
| `event_type` | Exact enum (`eventType` after parse) |
| `sentiment` | Exact enum |

## When to block a change

| Mode | Gate | Meaning |
|------|------|---------|
| **mock** (default) | `passRate == 1.0` | Harness/fixtures/parser regression. Always required green before merge. |
| **live** | `passRate >= 0.80` | Prompt, model, or Knowledge Pack change. Below 80% → do **not** merge until labels or change are fixed. |

Use live after changing:

- analysis system prompt / schema version
- Knowledge Pack playbooks or rubrics used by news analysis
- `GEMINI_MODEL` / provider adapter behavior

Document intentional gold label updates in the PR (why the old label was
wrong). Do not lower the live gate without a Product Owner decision.

## Layout

```
eval/analysis/
  README.md
  fixtures/                 # versioned gold cases (no secrets)
src/eval/analysis/          # loader, scorer, runner (unit-tested)
scripts/run-analysis-eval.ts
```

## Out of scope

- Dashboard of evals
- Default CI live calls
- Brief-specific gold set (follow-up)
- Provider A/B comparison
