import { KnowledgePackInjection } from './knowledge.types';

/**
 * Append Knowledge Pack markdown to a system prompt. No-op when injection is
 * missing or empty (safe degradation).
 */
export function appendKnowledgePackToSystemPrompt(
  systemPrompt: string,
  injection: KnowledgePackInjection | null,
): string {
  if (!injection || injection.markdown.trim().length === 0) {
    return systemPrompt;
  }

  return [
    systemPrompt,
    '',
    '## Knowledge Pack (research method only; never invent prices or broker orders)',
    `knowledgeVersion: ${injection.knowledgeVersion}`,
    `matched: ${injection.matchedIds.join(', ') || '(none)'}`,
    injection.truncated ? 'note: context truncated to character budget' : null,
    injection.markdown,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}
