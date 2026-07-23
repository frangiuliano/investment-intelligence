# Knowledge Pack

Versioned domain knowledge for news analysis and research briefs. Content
lives in the repo and is meant to be injected into LLM prompts at runtime
(see issues #81–#83). It is **not** fine-tuned into a model and is portable
across LLM vendors.

## Layout

```
knowledge/
  manifest.json          # knowledgeVersion + index of playbooks/rubrics/sources
  _prompts/              # Versioned extract / merge / QA prompts (#82)
  playbooks/             # Asset-type method cards (injectable)
  rubrics/               # Shared scoring / taxonomy guidance
  sources/               # Operator PDFs/text (PDFs gitignored)
    fixtures/            # Short copyright-safe demos for ingest
  raw/                   # Extract/chunk cache from ingest (hash-keyed by docId)
  examples/              # Reserved for promoted operator feedback (#84)
```

## Versioning (`knowledgeVersion`)

- Declared in `manifest.json` as a semver string (initial: `0.1.0`).
- Bump **patch** for copy edits; **minor** for new playbook/rubric sections
  or files; **major** for breaking template/schema changes.
- Ingest `--apply` bumps **patch** and records a `sources[]` entry
  (`docId`, `sourceHash`, `targets`, `ingestedAt`).
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
- PDF text extraction uses `pdftotext` (poppler). Install via
  `brew install poppler` (macOS) or your distro package. Empty text → stop;
  OCR is out of scope.

## Knowledge ingest (#82)

Pipeline is **offline tooling** (scripts + Cursor skill), not a NestJS
endpoint or cron.

| Command | What it does |
|---------|----------------|
| `npm run knowledge:prepare -- <file> [--target equity\|cedear\|bond\|other]` | Extract → chunk → `raw/<docId>/` with content-hash cache |
| `npm run knowledge:dry-run -- <file> [--target …] [--apply]` | Prepare + deterministic playbook draft (no LLM / API key) |

`<file>` must resolve under `knowledge/sources/` (symlink escapes rejected).
`meta.json` / `manifest.sources` store **repo-relative** paths only. `--apply`
bumps `knowledgeVersion` patch only when `sourceHash` changes; re-ingest of the
same `docId` for another target **merges** into `targets[]`.

Agent orchestration: skill `knowledge-ingest`
(`.cursor/skills/knowledge-ingest` → `.agents/skills/knowledge-ingest`).
Prompts live in `_prompts/`. **Never** paste an entire book into one LLM call;
max ~3000 characters per extract (`src/knowledge-ingest/chunk-limits.ts`).

### Dry-run with the seed fixture

```bash
npm run knowledge:dry-run -- knowledge/sources/fixtures/sample-equity-earnings.txt --target equity
npm run knowledge:prepare -- knowledge/sources/fixtures/sample-equity-earnings.txt --target equity
```

First command writes `knowledge/raw/<docId>/playbook.md` (full template) and
updates `manifest.json` `sources[]`. Second run should report cache hits for
unchanged chunk hashes. Use `--apply` only after human Accept (overwrites
`playbooks/<target>.md` and bumps patch).

### Human Accept checklist (~10 min)

- [ ] Draft has all five required sections and a materiality table.
- [ ] No broker-order wording; research method only.
- [ ] No invented prices / fundamentals; source_refs point at docId.
- [ ] Chunking respected (no full-book paste in any extract artifact).
- [ ] Compared against existing seed; merge conflicts resolved intentionally.
- [ ] `manifest.json` `sources[]` + `knowledgeVersion` look correct.
- [ ] Operator is OK committing playbook text (not copyrighted PDF).

## Seeds vs real content

Current playbooks/rubrics start as **minimal seeds**. Enrich via `/fin`
review and this ingest pipeline. Prefer dry-run for demos; use the Agent
skill + LLM extract/merge/QA for real books (local PDFs only).

## Out of scope here

- Runtime LLM port / Gemini wiring (#81)
- Prompt injection at runtime (#83)
- Eval harness (#85) and operator feedback (#84)
- NestJS ingest API, cron, or mandatory production Finance API key for ingest
