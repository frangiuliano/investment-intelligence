import type {
  EventType,
  Materiality,
  Sentiment,
} from '../../analysis/gemini.constants';

export type AnalysisEvalArticleInput = {
  title: string;
  source: string;
  url: string;
  content: string | null;
};

export type AnalysisGoldExpected = {
  tickers: string[];
  materiality: Materiality;
  event_type: EventType;
  sentiment: Sentiment;
};

/** Canonical model JSON keys (snake_case) used by parseGeminiAnalysisText. */
export type AnalysisMockModelResponse = {
  headline: string;
  summary: string;
  sentiment: Sentiment;
  tickers: string[];
  materiality: Materiality;
  event_type: EventType;
};

export type AnalysisGoldCase = {
  id: string;
  input: AnalysisEvalArticleInput;
  expected: AnalysisGoldExpected;
  /** Deterministic LLM replay for mock mode (no API key). */
  mockModelResponse: AnalysisMockModelResponse;
  meta?: {
    notes?: string;
    promptVersion?: string;
    knowledgeVersion?: string;
  };
};

export type AnalysisFieldScore = {
  field: 'tickers' | 'materiality' | 'event_type' | 'sentiment';
  passed: boolean;
  expected: string;
  actual: string;
};

export type AnalysisCaseResult = {
  id: string;
  passed: boolean;
  fieldScores: AnalysisFieldScore[];
  error?: string;
  promptVersion?: string;
  knowledgeVersion?: string | null;
};

export type AnalysisEvalReport = {
  mode: 'mock' | 'live';
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  gateThreshold: number;
  gatePassed: boolean;
  cases: AnalysisCaseResult[];
};

export type AnalysisEvalOptions = {
  fixturesDir: string;
  mode: 'mock' | 'live';
  /** When set, only run these case ids. */
  ids?: string[];
  locale?: 'en' | 'es';
  knowledgeRoot?: string;
  maxContextChars?: number;
  /** Live-mode gate: fraction of cases that must pass (default 0.8). */
  livePassThreshold?: number;
};
