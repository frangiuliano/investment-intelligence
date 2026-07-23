import type {
  PlaybookAssetType,
  PlaybookDraftInput,
} from './playbook-template';
import { renderPlaybookMarkdown } from './playbook-template';

/**
 * Deterministic dry-run synthesizer (no LLM). Produces a valid playbook
 * template from source text heuristics so the fixture path is runnable
 * without API keys. Agent + LLM extract/merge/QA is the production path.
 */
export function synthesizePlaybookFromText(params: {
  text: string;
  target: PlaybookAssetType;
  knowledgeVersion: string;
  docId: string;
  sourceRelativePath: string;
}): { markdown: string; draft: PlaybookDraftInput } {
  const lower = params.text.toLowerCase();
  const hasEarnings =
    lower.includes('earnings') ||
    lower.includes('eps') ||
    lower.includes('revenue');
  const hasGuidance =
    lower.includes('guidance') || lower.includes('raised full-year');
  const tickerMatch =
    params.text.match(/\bticker:\s*([A-Z]{1,6})\b/i) ??
    params.text.match(/\(([A-Z]{1,6})\)/);
  const ticker = (tickerMatch?.[1] ?? 'UNKNOWN').toUpperCase();

  const draft: PlaybookDraftInput = {
    id: params.target === 'other' ? params.docId : params.target,
    assetType: params.target,
    knowledgeVersion: params.knowledgeVersion,
    title:
      params.target === 'equity'
        ? 'Equity'
        : params.target.charAt(0).toUpperCase() + params.target.slice(1),
    intro: `Heuristics distilled from ingest dry-run of \`${params.sourceRelativePath}\` (docId: \`${params.docId}\`). Method only — do not invent prices or fundamentals.`,
    alwaysCheck: [
      `Identify primary ticker(s); fixture/demo signal mentions \`${ticker}\` when present.`,
      'Separate filed/announced numbers from opinion or rumor.',
      'Map to an `event_type` from the event-types rubric before scoring materiality.',
      hasEarnings
        ? 'Confirm earnings period and whether EPS/revenue vs consensus is stated.'
        : 'Confirm whether the story is company-specific or sector-wide.',
      hasGuidance
        ? 'Note whether guidance was raised, cut, or reiterated, and for which fiscal period.'
        : 'Check for guidance or outlook language before labeling a catalyst.',
    ],
    materialityRows: [
      {
        signal: hasEarnings
          ? 'Earnings beat/miss with numbers vs consensus'
          : 'Company-specific catalyst with hard numbers',
        materiality: hasGuidance ? 'high' : 'medium',
        notes: hasGuidance
          ? 'Guidance change alongside results usually warrants high'
          : 'Raise only when primary source confirms the figure',
      },
      {
        signal: hasGuidance
          ? 'Full-year guidance raise/cut'
          : 'Standalone outlook change',
        materiality: 'high',
        notes: 'Tie to fiscal period; prefer IR/filing over headline alone',
      },
      {
        signal: 'Generic sector macro with no company hook',
        materiality: 'low',
        notes: 'Prefer digest over push alert',
      },
    ],
    invalidation: [
      'Correction or retraction of the underlying claim.',
      'Later filing shows the “beat/miss” was accounting noise or one-off.',
      'Ticker was mis-attributed (wrong company / similar name).',
    ],
    doNot: [
      'Frame labels as broker orders or regulated investment advice.',
      'Invent revenue, EPS, or multiples not present in the source.',
      'Paste an entire book or PDF into a single LLM call — use chunked extract only.',
      'Upgrade materiality solely because the ticker is popular or volatile.',
    ],
    sourceRefs: [
      `docId: ${params.docId}`,
      `source: ${params.sourceRelativePath}`,
      'pipeline: knowledge-ingest dry-run (deterministic, no LLM)',
      'rubric: rubrics/materiality.md, rubrics/event-types.md',
    ],
  };

  return {
    draft,
    markdown: renderPlaybookMarkdown(draft),
  };
}
