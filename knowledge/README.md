# Knowledge Pack

Versioned domain knowledge for news analysis and research briefs. Content
lives in the repo and is meant to be injected into LLM prompts at runtime
(see issues #81–#83). It is **not** fine-tuned into a model and is portable
across LLM vendors.

## Layout

```
knowledge/
  manifest.json          # knowledgeVersion + index of playbooks/rubrics
  playbooks/             # Asset-type method cards (injectable)
  rubrics/               # Shared scoring / taxonomy guidance
  sources/               # Operator PDFs/text (PDFs gitignored)
    fixtures/            # Short copyright-safe demos for ingest (#82)
  raw/                   # Extract/chunk cache from ingest (hash-keyed)
  examples/              # Reserved for promoted operator feedback (#84)
```

## Versioning (`knowledgeVersion`)

- Declared in `manifest.json` as a semver string (initial: `0.1.0`).
- Bump **patch** for copy edits; **minor** for new playbook/rubric sections
  or files; **major** for breaking template/schema changes.
- Runtime persistence of which version was used lands in #83
  (`knowledgeVersion` on analyses/briefs).

## Playbook template (required sections)

Every playbook must include these sections so injection (#83) can be
deterministic:

1. **Always check** — non-negotiable checks before labeling or alerting.
2. **Materiality heuristics** — markdown table of signal → suggested level.
3. **Invalidation** — what would make the read wrong or stale.
4. **Do not** — anti-patterns (no broker orders, no invented numbers, etc.).
5. **source_refs** — provenance of the heuristics (seed / fixture / doc id).

Optional front-matter-style metadata at the top:

- `id`, `assetType`, `knowledgeVersion` (should match or be ≤ manifest).

## Rubrics

Rubrics are shared across asset types (materiality scale, event taxonomy,
stance invalidation). They complement playbooks; do not duplicate long
tables in every playbook.

## Sources and PDFs

- Put copyrighted books/PDFs under `sources/` for local ingest only.
- `sources/**/*.pdf` is gitignored — do **not** force-add them.
- Version short fixtures under `sources/fixtures/` (plain `.txt`).

## Seeds vs real content

Current playbooks/rubrics are **minimal seeds** for wiring and demos.
Enrich via `/fin` review and the knowledge-ingest pipeline (#82). Never paste
an entire book into a single LLM call.

## Out of scope here

- PDF → playbook pipeline (#82)
- LLM port / Gemini wiring (#81)
- Prompt injection at runtime (#83)
- Eval harness (#85) and operator feedback (#84)
