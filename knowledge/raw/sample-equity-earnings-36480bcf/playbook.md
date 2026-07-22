# Playbook: Equity

- id: `equity`
- assetType: `equity`
- knowledgeVersion: `0.1.0`

Heuristics distilled from ingest dry-run of `sources/fixtures/sample-equity-earnings.txt` (docId: `sample-equity-earnings-36480bcf`). Method only — do not invent prices or fundamentals.

## Always check

- Identify primary ticker(s); fixture/demo signal mentions `EXTECH` when present.
- Separate filed/announced numbers from opinion or rumor.
- Map to an `event_type` from the event-types rubric before scoring materiality.
- Confirm earnings period and whether EPS/revenue vs consensus is stated.
- Note whether guidance was raised, cut, or reiterated, and for which fiscal period.

## Materiality heuristics

| Signal | Suggested materiality | Notes |
|--------|----------------------|-------|
| Earnings beat/miss with numbers vs consensus | high | Guidance change alongside results usually warrants high |
| Full-year guidance raise/cut | high | Tie to fiscal period; prefer IR/filing over headline alone |
| Generic sector macro with no company hook | low | Prefer digest over push alert |

## Invalidation

- Correction or retraction of the underlying claim.
- Later filing shows the “beat/miss” was accounting noise or one-off.
- Ticker was mis-attributed (wrong company / similar name).

## Do not

- Frame labels as broker orders or regulated investment advice.
- Invent revenue, EPS, or multiples not present in the source.
- Paste an entire book or PDF into a single LLM call — use chunked extract only.
- Upgrade materiality solely because the ticker is popular or volatile.

## source_refs

- docId: sample-equity-earnings-36480bcf
- source: sources/fixtures/sample-equity-earnings.txt
- pipeline: knowledge-ingest dry-run (deterministic, no LLM)
- rubric: rubrics/materiality.md, rubrics/event-types.md
