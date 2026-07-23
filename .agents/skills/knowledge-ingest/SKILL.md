---
name: knowledge-ingest
description: >-
  Orchestrates Knowledge Pack ingest (PDF/text → chunked extracts → merge → QA
  → playbooks/rubrics) for investment-intelligence. Use when the user asks to
  ingest a PDF or fixture into knowledge/playbooks, run knowledge-ingest,
  knowledge:prepare, knowledge:dry-run, knowledge:rank-chunks, or update
  manifest.json from sources.
disable-model-invocation: true
---

# Knowledge Ingest

Turn operator sources under `knowledge/sources/` into short, injectable
playbooks/rubrics. **Never** paste an entire book into one LLM call.

## Tools (no NestJS runtime)

| Command | Purpose |
|---------|---------|
| `npm run knowledge:prepare -- <path> [--target equity\|cedear\|bond\|other]` | Extract text, chunk, write `knowledge/raw/<docId>/` with hash cache |
| `npm run knowledge:rank-chunks -- <rawDocDir> --genre <id>[,<id>…]` | Score chunks using Finance Advisor themes (`filter-themes.json`); writes `selected-chunks.json` |
| `npm run knowledge:dry-run -- <path> [--target …] [--apply]` | Prepare + deterministic playbook draft (no API key). `--apply` writes `playbooks/` and bumps patch |

Prompts: `knowledge/_prompts/extract.md`, `merge.md`, `qa.md`, **`filter-themes.md` / `filter-themes.json`**.

Chunk limits (source of truth): `src/knowledge-ingest/chunk-limits.ts`
(`DEFAULT_CHUNK_CHARS` = 3000, one chunk per extract call).

**Chunk ranking ownership:** domain keywords/themes are owned by `/fin`
(`filter-themes.*`). Do **not** invent ad-hoc keyword lists in chat when those
files exist. Change themes via `/fin` + PR updating both md and json.

## Playbook target (`--target`) — Finance Advisor decides

The operator does **not** pick which `.md` receives the extract. **`/fin`
(or the Agent applying Fin rules)** chooses `--target` and promotes into that
playbook. Do **not** create a new playbook per PDF/book.

| Source content is mainly… | `--target` |
|---------------------------|------------|
| Equity TA / psychology / general equity fundamentals | `equity` (**default** if unsure) |
| CEDEAR mechanics (ratio, ARS FX, CNV, certificate vs underlying) | `cedear` |
| Bonds / rates / credit / duration | `bond` |
| New asset type not in product runtime | Ask `/fin` + `/po` — do not invent a file |

One book → one (or rarely two) existing playbook(s) via merge. Runtime injects
by holding `assetType`, so the target must match product types in `manifest.json`.

## Workflow (Agent + LLM)

Copy and track:

```
Ingest progress:
- [ ] 1. Locate source (fixture or local PDF under knowledge/sources/)
- [ ] 2. Decide --target via Fin table above (default equity); do not ask the operator
- [ ] 3. npm run knowledge:prepare -- <source> --target <asset>
- [ ] 4. Pick genre(s) from filter-themes.md; run knowledge:rank-chunks
- [ ] 5. For each selected chunk (top N): extract with _prompts/extract.md (one chunk only)
- [ ] 6. Merge extracts with _prompts/merge.md into raw/<docId>/playbook.md
- [ ] 7. QA with _prompts/qa.md → PASS before apply
- [ ] 8. Human Accept checklist (~10 min) — operator may skip reading the PDF
- [ ] 9. Copy draft to knowledge/playbooks/ (or dry-run --apply) + manifest
```

### Step details

1. **Source**
   - Path **must** resolve under `knowledge/sources/` (scripts reject escapes and
     symlinks that leave the tree). Prefer `fixtures/*.txt` for demos.
   - PDFs stay gitignored; require `pdftotext` (poppler). Empty PDF text → stop (OCR out of scope).
   - Persist only repo-relative paths in `meta.json` / `manifest.json` (never absolute).

2. **Prepare (no LLM)**
   - Run `knowledge:prepare` with Fin-chosen `--target`. Note `docId`, `cacheHits` / `cacheMisses`.
   - Re-run same input: expect `cacheMisses: 0` for unchanged chunk hashes.
   - Chunking is mechanical (full text → equal slices). It does **not** decide importance.

3. **Rank chunks (Finance Advisor themes)**
   - Read `knowledge/_prompts/filter-themes.md` and choose genre(s), e.g.
     `trading_psychology`, `technical_analysis`, `fundamental_analysis`,
     `fixed_income` (always layers `core`).
   - Run:
     `npm run knowledge:rank-chunks -- knowledge/raw/<docId> --genre <id>`
   - Extract **only** files listed in `selected-chunks.json` → `selected`
     (respect `maxExtractChunks` / `minScore`). Do not extract all chunks of a book.

4. **Extract (cheap model OK)**
   - Read `knowledge/_prompts/extract.md`.
   - For each **selected** chunk, send **only that chunk’s text** + target.
     Save under `knowledge/raw/<docId>/extracts/<chunkId>.md`.
   - **Forbidden:** concatenating all chunks into one prompt.

5. **Merge (stronger model OK, once)**
   - Read `knowledge/_prompts/merge.md` and existing seed playbook for target.
   - Write `knowledge/raw/<docId>/playbook.md` with the five required sections.

6. **QA**
   - Read `knowledge/_prompts/qa.md`. Fix until PASS.

7. **Human Accept (operator)** — see checklist in `knowledge/README.md`.

8. **Promote**
   - After Accept: copy draft to `knowledge/playbooks/<target>.md` (or
     `npm run knowledge:dry-run -- <source> --target <t> --apply` for the
     deterministic path only).
   - Ensure `manifest.json` has `sources[]` entry (`docId`, `sourceHash`,
     `targets`, `ingestedAt`) and bumped `knowledgeVersion` when content lands
     in playbooks/.

## Dry-run (fixture, no LLM)

```bash
npm run knowledge:dry-run -- knowledge/sources/fixtures/sample-equity-earnings.txt --target equity
# Re-run prepare to confirm cache:
npm run knowledge:prepare -- knowledge/sources/fixtures/sample-equity-earnings.txt --target equity
```

Expect a draft at `knowledge/raw/<docId>/playbook.md` with all template
sections. Do not commit copyrighted PDFs.

## Out of scope

- Nest endpoints / cron / production `GEMINI_API_KEY_FINANCE` requirement
- Runtime injection into analysis/briefs (#83)
- Vector DB / embeddings / fine-tuning
- Inventing keyword lists outside `filter-themes.json`
