---
name: knowledge-ingest
description: >-
  Orchestrates Knowledge Pack ingest (PDF/text → chunked extracts → merge → QA
  → playbooks/rubrics) for investment-intelligence. Use when the user asks to
  ingest a PDF or fixture into knowledge/playbooks, run knowledge-ingest,
  knowledge:prepare, knowledge:dry-run, or update manifest.json from sources.
disable-model-invocation: true
---

# Knowledge Ingest

Turn operator sources under `knowledge/sources/` into short, injectable
playbooks/rubrics. **Never** paste an entire book into one LLM call.

## Tools (no NestJS runtime)

| Command | Purpose |
|---------|---------|
| `npm run knowledge:prepare -- <path> [--target equity\|cedear\|bond\|other]` | Extract text, chunk, write `knowledge/raw/<docId>/` with hash cache |
| `npm run knowledge:dry-run -- <path> [--target …] [--apply]` | Prepare + deterministic playbook draft (no API key). `--apply` writes `playbooks/` and bumps patch |

Prompts: `knowledge/_prompts/extract.md`, `merge.md`, `qa.md`.

Chunk limits (source of truth): `src/knowledge-ingest/chunk-limits.ts`
(`DEFAULT_CHUNK_CHARS` = 3000, one chunk per extract call).

## Workflow (Agent + LLM)

Copy and track:

```
Ingest progress:
- [ ] 1. Locate source (fixture or local PDF under knowledge/sources/)
- [ ] 2. npm run knowledge:prepare -- <source> --target <asset>
- [ ] 3. For each cacheMiss chunk: extract with _prompts/extract.md (one chunk only)
- [ ] 4. Merge extracts with _prompts/merge.md into raw/<docId>/playbook.md
- [ ] 5. QA with _prompts/qa.md → PASS before apply
- [ ] 6. Human Accept checklist (~10 min)
- [ ] 7. Copy draft to knowledge/playbooks/ (or dry-run --apply) + manifest
```

### Step details

1. **Source**
   - Path **must** resolve under `knowledge/sources/` (scripts reject escapes and
     symlinks that leave the tree). Prefer `fixtures/*.txt` for demos.
   - PDFs stay gitignored; require `pdftotext` (poppler). Empty PDF text → stop (OCR out of scope).
   - Persist only repo-relative paths in `meta.json` / `manifest.json` (never absolute).

2. **Prepare (no LLM)**
   - Run `knowledge:prepare`. Note `docId`, `cacheHits` / `cacheMisses`.
   - Re-run same input: expect `cacheMisses: 0` for unchanged chunk hashes.

3. **Extract (cheap model OK)**
   - Read `knowledge/_prompts/extract.md`.
   - For each chunk file listed as `cacheHit: false` (or all on first pass),
     send **only that chunk’s text** + target. Save extract markdown under
     `knowledge/raw/<docId>/extracts/<chunkId>.md`.
   - **Forbidden:** concatenating all chunks into one prompt.

4. **Merge (stronger model OK, once)**
   - Read `knowledge/_prompts/merge.md` and existing seed playbook for target.
   - Write `knowledge/raw/<docId>/playbook.md` with the five required sections.

5. **QA**
   - Read `knowledge/_prompts/qa.md`. Fix until PASS.

6. **Human Accept (operator)** — see checklist in `knowledge/README.md`.

7. **Promote**
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
