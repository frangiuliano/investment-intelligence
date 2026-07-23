import path from 'node:path';
import {
  DEFAULT_KNOWLEDGE_CONTEXT_MAX_CHARS,
  DEFAULT_KNOWLEDGE_ROOT,
} from '../../knowledge/knowledge.constants';
import {
  assembleKnowledgeMarkdown,
  loadKnowledgePackFromDisk,
} from '../../knowledge/knowledge-pack.loader';
import {
  resolvePlaybookAssetType,
  selectRubricIds,
} from '../../knowledge/knowledge-pack.selector';
import type {
  KnowledgeChunk,
  KnowledgePackInjection,
} from '../../knowledge/knowledge.types';

export async function buildEvalKnowledgeInjection(options: {
  textHints: string;
  knowledgeRoot?: string;
  maxContextChars?: number;
}): Promise<KnowledgePackInjection | null> {
  const configured = options.knowledgeRoot ?? DEFAULT_KNOWLEDGE_ROOT;
  const root = path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
  const maxChars =
    options.maxContextChars ?? DEFAULT_KNOWLEDGE_CONTEXT_MAX_CHARS;

  try {
    const pack = await loadKnowledgePackFromDisk(root);
    const assetType = resolvePlaybookAssetType({
      useCase: 'news-analysis',
      textHints: options.textHints,
    });
    const chunks: KnowledgeChunk[] = [];
    const playbook = pack.playbooksByAssetType.get(assetType);
    if (playbook) {
      chunks.push(playbook);
    }
    for (const rubricId of selectRubricIds({
      useCase: 'news-analysis',
      textHints: options.textHints,
    })) {
      const rubric = pack.rubricsById.get(rubricId);
      if (rubric) {
        chunks.push(rubric);
      }
    }
    if (chunks.length === 0) {
      return null;
    }
    const assembled = assembleKnowledgeMarkdown(chunks, maxChars);
    if (!assembled.markdown.trim()) {
      return null;
    }
    return {
      knowledgeVersion: pack.knowledgeVersion,
      matchedIds: assembled.matchedIds,
      markdown: assembled.markdown,
      truncated: assembled.truncated,
    };
  } catch {
    return null;
  }
}
