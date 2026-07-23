export const REQUIRED_PLAYBOOK_SECTIONS = [
  'Always check',
  'Materiality heuristics',
  'Invalidation',
  'Do not',
  'source_refs',
] as const;

export type PlaybookAssetType = 'equity' | 'cedear' | 'bond' | 'other';

export type PlaybookDraftInput = {
  id: string;
  assetType: PlaybookAssetType;
  knowledgeVersion: string;
  title: string;
  intro: string;
  alwaysCheck: string[];
  materialityRows: Array<{
    signal: string;
    materiality: string;
    notes: string;
  }>;
  invalidation: string[];
  doNot: string[];
  sourceRefs: string[];
};

export function renderPlaybookMarkdown(input: PlaybookDraftInput): string {
  const tableRows = input.materialityRows
    .map((row) => `| ${row.signal} | ${row.materiality} | ${row.notes} |`)
    .join('\n');

  return `# Playbook: ${input.title}

- id: \`${input.id}\`
- assetType: \`${input.assetType}\`
- knowledgeVersion: \`${input.knowledgeVersion}\`

${input.intro}

## Always check

${input.alwaysCheck.map((item) => `- ${item}`).join('\n')}

## Materiality heuristics

| Signal | Suggested materiality | Notes |
|--------|----------------------|-------|
${tableRows}

## Invalidation

${input.invalidation.map((item) => `- ${item}`).join('\n')}

## Do not

${input.doNot.map((item) => `- ${item}`).join('\n')}

## source_refs

${input.sourceRefs.map((item) => `- ${item}`).join('\n')}
`;
}

export function assertPlaybookTemplate(markdown: string): string[] {
  const missing: string[] = [];
  for (const section of REQUIRED_PLAYBOOK_SECTIONS) {
    const heading = `## ${section}`;
    if (!markdown.includes(heading)) {
      missing.push(section);
    }
  }
  return missing;
}
