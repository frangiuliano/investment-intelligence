import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  EVENT_TYPE_VALUES,
  MATERIALITY_VALUES,
  SENTIMENT_VALUES,
} from '../../analysis/gemini.constants';
import type {
  AnalysisGoldCase,
  AnalysisGoldExpected,
  AnalysisMockModelResponse,
} from './types';

export async function loadAnalysisGoldFixtures(
  fixturesDir: string,
): Promise<AnalysisGoldCase[]> {
  const entries = await fs.readdir(fixturesDir);
  const jsonFiles = entries.filter((name) => name.endsWith('.json')).sort();
  if (jsonFiles.length === 0) {
    throw new Error(`No gold fixtures found in ${fixturesDir}`);
  }

  const cases: AnalysisGoldCase[] = [];
  for (const file of jsonFiles) {
    const fullPath = path.join(fixturesDir, file);
    const raw = await fs.readFile(fullPath, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON in fixture: ${fullPath}`);
    }
    cases.push(validateGoldCase(parsed, fullPath));
  }

  const ids = new Set<string>();
  for (const goldCase of cases) {
    if (ids.has(goldCase.id)) {
      throw new Error(`Duplicate gold case id: ${goldCase.id}`);
    }
    ids.add(goldCase.id);
  }

  return cases;
}

function validateGoldCase(
  value: unknown,
  sourcePath: string,
): AnalysisGoldCase {
  if (!isRecord(value)) {
    throw new Error(`Fixture must be an object: ${sourcePath}`);
  }

  const id = requireNonEmptyString(value.id, 'id', sourcePath);
  const input = validateInput(value.input, sourcePath);
  const expected = validateExpected(value.expected, sourcePath);
  const mockModelResponse = validateMockResponse(
    value.mockModelResponse,
    sourcePath,
  );

  const meta = value.meta;
  if (meta !== undefined && !isRecord(meta)) {
    throw new Error(`Fixture meta must be an object: ${sourcePath}`);
  }

  return {
    id,
    input,
    expected,
    mockModelResponse,
    meta: meta
      ? {
          notes: typeof meta.notes === 'string' ? meta.notes : undefined,
          promptVersion:
            typeof meta.promptVersion === 'string'
              ? meta.promptVersion
              : undefined,
          knowledgeVersion:
            typeof meta.knowledgeVersion === 'string'
              ? meta.knowledgeVersion
              : undefined,
        }
      : undefined,
  };
}

function validateInput(
  value: unknown,
  sourcePath: string,
): AnalysisGoldCase['input'] {
  if (!isRecord(value)) {
    throw new Error(`Fixture input must be an object: ${sourcePath}`);
  }
  return {
    title: requireNonEmptyString(value.title, 'input.title', sourcePath),
    source: requireNonEmptyString(value.source, 'input.source', sourcePath),
    url: requireNonEmptyString(value.url, 'input.url', sourcePath),
    content:
      value.content === null
        ? null
        : requireString(value.content, 'input.content', sourcePath),
  };
}

function validateExpected(
  value: unknown,
  sourcePath: string,
): AnalysisGoldExpected {
  if (!isRecord(value)) {
    throw new Error(`Fixture expected must be an object: ${sourcePath}`);
  }
  return {
    tickers: requireTickerArray(value.tickers, 'expected.tickers', sourcePath),
    materiality: requireEnum(
      value.materiality,
      MATERIALITY_VALUES,
      'expected.materiality',
      sourcePath,
    ),
    event_type: requireEnum(
      value.event_type,
      EVENT_TYPE_VALUES,
      'expected.event_type',
      sourcePath,
    ),
    sentiment: requireEnum(
      value.sentiment,
      SENTIMENT_VALUES,
      'expected.sentiment',
      sourcePath,
    ),
  };
}

function validateMockResponse(
  value: unknown,
  sourcePath: string,
): AnalysisMockModelResponse {
  if (!isRecord(value)) {
    throw new Error(
      `Fixture mockModelResponse must be an object: ${sourcePath}`,
    );
  }
  return {
    headline: requireNonEmptyString(
      value.headline,
      'mockModelResponse.headline',
      sourcePath,
    ),
    summary: requireNonEmptyString(
      value.summary,
      'mockModelResponse.summary',
      sourcePath,
    ),
    sentiment: requireEnum(
      value.sentiment,
      SENTIMENT_VALUES,
      'mockModelResponse.sentiment',
      sourcePath,
    ),
    tickers: requireTickerArray(
      value.tickers,
      'mockModelResponse.tickers',
      sourcePath,
    ),
    materiality: requireEnum(
      value.materiality,
      MATERIALITY_VALUES,
      'mockModelResponse.materiality',
      sourcePath,
    ),
    event_type: requireEnum(
      value.event_type,
      EVENT_TYPE_VALUES,
      'mockModelResponse.event_type',
      sourcePath,
    ),
  };
}

function requireTickerArray(
  value: unknown,
  field: string,
  sourcePath: string,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array in ${sourcePath}`);
  }
  const tickers: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(
        `${field} entries must be non-empty strings in ${sourcePath}`,
      );
    }
    tickers.push(item.trim().toUpperCase());
  }
  return tickers;
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  sourcePath: string,
): T {
  if (
    typeof value !== 'string' ||
    !(allowed as readonly string[]).includes(value)
  ) {
    throw new Error(
      `${field} must be one of ${allowed.join('|')} in ${sourcePath}`,
    );
  }
  return value as T;
}

function requireNonEmptyString(
  value: unknown,
  field: string,
  sourcePath: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string in ${sourcePath}`);
  }
  return value;
}

function requireString(
  value: unknown,
  field: string,
  sourcePath: string,
): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string in ${sourcePath}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
