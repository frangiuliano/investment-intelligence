import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  parseGeminiAnalysisText,
} from '../../analysis/gemini-response';
import { AppLocale } from '../../config/env.validation';
import { ANALYSIS_PROMPT_VERSION } from '../../knowledge/knowledge.constants';
import { appendKnowledgePackToSystemPrompt } from '../../knowledge/knowledge-prompt';
import type { LlmClient } from '../../llm/llm.port';
import type {
  LlmCompleteJsonRequest,
  LlmCompleteJsonResult,
} from '../../llm/llm.types';
import { buildEvalKnowledgeInjection } from './eval-knowledge';
import { loadAnalysisGoldFixtures } from './load-fixtures';
import { scoreAnalysisPrediction } from './score';
import type {
  AnalysisCaseResult,
  AnalysisEvalOptions,
  AnalysisEvalReport,
  AnalysisGoldCase,
} from './types';

export const DEFAULT_LIVE_PASS_THRESHOLD = 0.8;
export const MOCK_PASS_THRESHOLD = 1;

export function createMockAnalysisLlmClient(
  casesById: Map<string, AnalysisGoldCase>,
): LlmClient {
  return {
    completeJson(
      request: LlmCompleteJsonRequest,
    ): Promise<LlmCompleteJsonResult> {
      const caseId = extractCaseIdMarker(request.user);
      if (!caseId) {
        return Promise.reject(
          new Error('Mock LLM missing case id marker in user prompt'),
        );
      }
      const goldCase = casesById.get(caseId);
      if (!goldCase) {
        return Promise.reject(
          new Error(`Mock LLM has no fixture for case id: ${caseId}`),
        );
      }
      return Promise.resolve({
        text: JSON.stringify(goldCase.mockModelResponse),
        provider: 'mock',
        model: 'fixture-replay',
      });
    },
  };
}

export function createLiveGeminiLlmClient(env: NodeJS.ProcessEnv): LlmClient {
  const apiKey = env.GEMINI_API_KEY_FINANCE?.trim();
  if (!apiKey) {
    throw new Error(
      'Live mode requires GEMINI_API_KEY_FINANCE (see eval/analysis/README.md)',
    );
  }
  const model = env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';

  return {
    async completeJson(
      request: LlmCompleteJsonRequest,
    ): Promise<LlmCompleteJsonResult> {
      const timeoutMs = request.timeoutMs ?? 30_000;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: request.system }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: request.user }],
              },
            ],
            generationConfig: {
              temperature: request.temperature ?? 0.2,
              maxOutputTokens: request.maxOutputTokens ?? 1024,
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(
            `Gemini API ${response.status}: ${body.slice(0, 500)}`,
          );
        }

        const payload = (await response.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const text = payload.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? '')
          .join('')
          .trim();
        if (!text) {
          throw new Error('Gemini live response missing text');
        }
        return { text, provider: 'gemini', model };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export async function runAnalysisEval(
  options: AnalysisEvalOptions,
  llmClient?: LlmClient,
): Promise<AnalysisEvalReport> {
  const allCases = await loadAnalysisGoldFixtures(options.fixturesDir);
  const cases = filterCases(allCases, options.ids);
  if (cases.length === 0) {
    throw new Error('No gold cases selected for eval');
  }

  const casesById = new Map(cases.map((goldCase) => [goldCase.id, goldCase]));
  const client =
    llmClient ??
    (options.mode === 'mock'
      ? createMockAnalysisLlmClient(casesById)
      : createLiveGeminiLlmClient(process.env));

  const locale: AppLocale = options.locale ?? 'en';
  const results: AnalysisCaseResult[] = [];

  for (const goldCase of cases) {
    results.push(
      await evaluateOneCase({
        goldCase,
        client,
        locale,
        knowledgeRoot: options.knowledgeRoot,
        maxContextChars: options.maxContextChars,
      }),
    );
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const passRate = results.length === 0 ? 0 : passed / results.length;
  const gateThreshold =
    options.mode === 'mock'
      ? MOCK_PASS_THRESHOLD
      : (options.livePassThreshold ?? DEFAULT_LIVE_PASS_THRESHOLD);

  return {
    mode: options.mode,
    total: results.length,
    passed,
    failed,
    passRate,
    gateThreshold,
    gatePassed: passRate + Number.EPSILON >= gateThreshold,
    cases: results,
  };
}

async function evaluateOneCase(params: {
  goldCase: AnalysisGoldCase;
  client: LlmClient;
  locale: AppLocale;
  knowledgeRoot?: string;
  maxContextChars?: number;
}): Promise<AnalysisCaseResult> {
  const { goldCase, client, locale } = params;
  try {
    const textHints = [goldCase.input.title, goldCase.input.content ?? ''].join(
      '\n',
    );
    const knowledge = await buildEvalKnowledgeInjection({
      textHints,
      knowledgeRoot: params.knowledgeRoot,
      maxContextChars: params.maxContextChars,
    });
    const system = appendKnowledgePackToSystemPrompt(
      buildAnalysisSystemPrompt(locale),
      knowledge,
    );
    const user = [
      buildAnalysisUserPrompt(goldCase.input),
      '',
      caseIdMarker(goldCase.id),
    ].join('\n');

    const completion = await client.completeJson({
      system,
      user,
      schemaVersion: ANALYSIS_PROMPT_VERSION,
      temperature: 0.2,
      maxOutputTokens: 1024,
      timeoutMs: 30_000,
    });

    const parsed = parseGeminiAnalysisText(completion.text);
    const scored = scoreAnalysisPrediction(
      goldCase.id,
      goldCase.expected,
      parsed,
    );
    return {
      ...scored,
      promptVersion: ANALYSIS_PROMPT_VERSION,
      knowledgeVersion: knowledge?.knowledgeVersion ?? null,
    };
  } catch (error) {
    return {
      id: goldCase.id,
      passed: false,
      fieldScores: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function filterCases(
  cases: AnalysisGoldCase[],
  ids: string[] | undefined,
): AnalysisGoldCase[] {
  if (!ids || ids.length === 0) {
    return cases;
  }
  const wanted = new Set(ids);
  const selected = cases.filter((goldCase) => wanted.has(goldCase.id));
  const missing = ids.filter((id) => !selected.some((c) => c.id === id));
  if (missing.length > 0) {
    throw new Error(`Unknown gold case id(s): ${missing.join(', ')}`);
  }
  return selected;
}

function caseIdMarker(id: string): string {
  return `[eval-case-id:${id}]`;
}

function extractCaseIdMarker(userPrompt: string): string | null {
  const match = userPrompt.match(/\[eval-case-id:([^\]]+)\]/);
  return match?.[1] ?? null;
}
