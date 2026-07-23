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
  examples/              # Promoted operator feedback (#84); see examples/README.md
```

## Versioning (`knowledgeVersion`)

- Declared in `manifest.json` as a semver string (initial: `0.1.0`).
- Bump **patch** for copy edits; **minor** for new playbook/rubric sections
  or files; **major** for breaking template/schema changes.
- Ingest `--apply` bumps **patch** and records a `sources[]` entry
  (`docId`, `sourceHash`, `targets`, `ingestedAt`).
- Runtime (`src/knowledge/`, issue #83) injects selected playbooks/rubrics into
  news analysis and brief **system** prompts (metadata/keyword first; character
  budget via `KNOWLEDGE_CONTEXT_MAX_CHARS`, default 12_000). Persists
  `knowledgeVersion` (+ `promptVersion` on analyses) on each run. Missing pack
  → degrade to the previous prompt shape without crashing. Restart the process
  to pick up pack file edits (in-memory cache). See ADR 006.

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
- Full-text `raw/*/source.txt` and `raw/*/chunk-*.txt` from large books are
  gitignored (copyright/size). Commit ranking metadata (`selected-chunks.json`,
  `meta.json`), extracts, and playbook drafts; keep regenerable chunk text local.
  Small caches may be allowlisted (e.g. fixture / tiny sheets).
- PDF text extraction uses `pdftotext` (poppler). Install via
  `brew install poppler` (macOS) or your distro package. Empty text → stop;
  OCR is out of scope.

## Knowledge ingest (#82)

Pipeline is **offline tooling** (scripts + Cursor Agent), not a NestJS
endpoint or cron. There is **no** fully automatic Nest job that watches
`sources/` — the one-shot UX is the Cursor command below.

### One-shot (recommended)

```text
/processBook @knowledge/sources/MiLibro.pdf
```

Optional: `--draft-only` (no promote to `playbooks/`). The Agent applies Fin
rules for `--target` / genre, runs prepare → rank → extract → merge → QA →
promote. You do **not** pick `equity.md` vs `cedear.md` vs `bond.md`.

| Command | What it does |
|---------|----------------|
| `/processBook <path>` | Full Agent orchestrated ingest (preferred) |
| `npm run knowledge:prepare -- <file> [--target equity\|cedear\|bond\|other]` | Extract → chunk → `raw/<docId>/` with content-hash cache |
| `npm run knowledge:rank-chunks -- <rawDocDir> --genre <id>[,…]` | Score chunks with Finance Advisor themes (`_prompts/filter-themes.json`); writes `selected-chunks.json` |
| `npm run knowledge:dry-run -- <file> [--target …] [--apply]` | Prepare + deterministic playbook draft (no LLM / API key) |

**Who decides `--target` (which playbook)?** **`/fin`** (or the Agent applying
Fin rules) — not the operator. Default **`equity`** when unsure. Map CEDEAR
mechanics → `cedear`, fixed income → `bond`. Do **not** create a new playbook
per PDF; merge into an existing card. See skill `knowledge-ingest` and
`.cursor/commands/processBook.md`.

**Who decides “important” chunks?** Chunking is mechanical (whole text).
Ranking keywords/themes are owned by **`/fin`**
(`knowledge/_prompts/filter-themes.md` + `.json`). Agents must not invent
ad-hoc keyword lists when those files exist. Extract + human Accept still
decide what enters playbooks (Accept may skip reading the full PDF; `/processBook`
promotes after QA PASS unless `--draft-only`).

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

## Analysis eval (#85)

Gold fixtures and runner live under `eval/analysis/` (not inside this pack).
Default `npm run eval:analysis` is **mock** (deterministic, no API key). Live
opt-in uses the LLM port / Gemini key — see `eval/analysis/README.md` for
pass-rate gates when changing prompts, models, or playbooks.

## Operator feedback (#84)

Desk operators mark alerts/briefs as `useful` or `noise` via the research desk
(BFF → `POST /feedback`). Rows land in `operator_feedback` with actor, source,
and a snapshot of `promptVersion` / `knowledgeVersion` when available.

**Promotion to this pack is manual.** See `knowledge/examples/README.md` for
SQL + JSON steps. Feedback never rewrites playbooks or eval gold by itself.

## Out of scope here

- NestJS ingest API, cron, or mandatory production Finance API key for ingest
- Vector DB / semantic RAG (runtime injection is metadata/keyword only; ADR 006)
- Auto-update of playbooks from feedback counts
