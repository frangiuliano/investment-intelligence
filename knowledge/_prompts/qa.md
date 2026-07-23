# QA a playbook draft before Accept

Review the draft playbook against this checklist. Reply with PASS or FAIL and
a short bullet list of fixes if FAIL.

## Checklist

- [ ] All five sections present: Always check, Materiality heuristics,
      Invalidation, Do not, source_refs
- [ ] Materiality table has Signal / Suggested materiality / Notes columns
- [ ] No broker-order language; research/hypothesis framing only
- [ ] No invented prices, EPS, multiples, or tickers not grounded in sources
- [ ] source_refs lists docId / source path / rubrics used
- [ ] Content is method (what to check), not a news summary of one company
- [ ] Bullets are short enough to inject into an LLM prompt later

## Output format

```text
Verdict: PASS|FAIL
Issues:
- ...
Suggested edits:
- ...
```
