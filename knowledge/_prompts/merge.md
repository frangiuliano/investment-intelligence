# Merge chunk extracts into one playbook

You merge per-chunk extracts into a single Knowledge Pack playbook that
matches the repo template. Prefer fewer, sharper bullets over long essays.

## Hard limits

- Use **only** the provided extracts + existing playbook/rubric context.
- Do not paste raw book text; paraphrase into method cards.
- Do not invent market numbers.
- Keep the five required sections exactly (heading names matter).

## Required playbook sections

1. `## Always check`
2. `## Materiality heuristics` (markdown table: Signal | Suggested materiality | Notes)
3. `## Invalidation`
4. `## Do not`
5. `## source_refs`

Also include metadata lines:

- `id`, `assetType`, `knowledgeVersion` (provided by the operator)

## Output

Return the full playbook markdown only (no fence unless asked).
