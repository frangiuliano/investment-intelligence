# Operator feedback examples

Promoted cases from desk feedback (`useful` / `noise`). This folder is the
human review queue before anything touches playbooks or gold fixtures.

Feedback itself lives in PostgreSQL (`operator_feedback`). Promotion here is
**manual** — never automatic.

## When to promote

Promote a `useful` row when:

1. The analysis/brief taught something the Knowledge Pack should keep.
2. Labels (materiality, event_type, sentiment, tickers) look correct.
3. You are willing to maintain the example through prompt/pack changes.

Promote a `noise` row when it is a recurring false positive worth documenting
as a negative example (optional; prefer fixing relevance/playbooks first).

## How to promote (manual)

1. Find the row in DB (or from the desk action you just took):

```sql
SELECT id, target_type, target_id, label, prompt_version, knowledge_version,
       actor, created_at
FROM operator_feedback
ORDER BY created_at DESC
LIMIT 20;
```

2. Resolve the target:
   - `analysis` → `news_analysis` (+ article title/url)
   - `brief` → `research_briefs`
   - `notification` → `notifications` → article → analysis (if any)

3. Copy a new JSON file under this directory:

```bash
cp knowledge/examples/_template.json \
  knowledge/examples/$(date +%Y%m%d)-short-slug.json
```

4. Fill fields from DB (see `_template.json`). Keep `sourceFeedbackId`.

5. Human Accept before using the example:
   - [ ] Not a broker order / not investment advice wording.
   - [ ] No invented prices or fundamentals.
   - [ ] Versions (`promptVersion`, `knowledgeVersion`) recorded.
   - [ ] OK to commit (no copyrighted full-text paste).

6. Optional next steps (separate issues / PRs):
   - Add a gold fixture under `eval/analysis/fixtures/` (#85).
   - Patch a playbook via knowledge-ingest Accept checklist
     (`knowledge/README.md`) — **never** overwrite playbooks from feedback alone.

## Out of scope

- Auto-merge into playbooks or eval gold.
- Changing relevance thresholds from feedback counts.
- Fine-tuning or ranking models.
