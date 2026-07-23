export type KnowledgeUseCase = 'news-analysis' | 'research-brief';

export type KnowledgeSelectQuery = {
  useCase: KnowledgeUseCase;
  /** Holding / operator asset types when known (briefs). */
  assetTypes?: string[];
  /** Free text for keyword hints (article title + content). */
  textHints?: string;
  /** Include stance-invalidation rubric (briefs with market facts). */
  includeStanceRubric?: boolean;
};

export type KnowledgeChunk = {
  id: string;
  kind: 'playbook' | 'rubric';
  markdown: string;
};

export type KnowledgePackInjection = {
  knowledgeVersion: string;
  matchedIds: string[];
  markdown: string;
  truncated: boolean;
};

export type KnowledgePackResult = {
  injection: KnowledgePackInjection | null;
  knowledgeVersion: string | null;
};
