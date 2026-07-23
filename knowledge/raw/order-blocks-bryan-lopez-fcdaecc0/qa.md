Verdict: PASS

Issues:
- (none blocking) Source is entry-heavy; draft already remaps to research lens.
- filter-themes `technical_analysis` lacks SMC keywords (order block, liquidez,
  mitigation, breaker) — chunks 002/005/006 scored below minScore despite
  related content. Acceptable for this pass; consider `/fin` theme bump later.

Suggested edits:
- On promote: merge bullets into `playbooks/equity.md`; bump knowledgeVersion
  patch; add manifest `sources[]` entry. Do not commit the PDF.
