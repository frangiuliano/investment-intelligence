import { AppLocale } from '../config/env.validation';
import {
  BRIEF_MAX_SECTION_LENGTH,
  BRIEF_PROMPT_VERSION,
} from './brief.constants';
import {
  BRIEF_SECTION_KEYS,
  BriefHoldingContext,
  BriefSections,
} from './brief.types';

const LANGUAGE_BY_LOCALE: Record<AppLocale, string> = {
  en: 'English',
  es: 'Spanish',
};

export { BRIEF_PROMPT_VERSION };

export function buildBriefSystemPrompt(locale: AppLocale): string {
  const language = LANGUAGE_BY_LOCALE[locale];
  return [
    'You are an educational investment research assistant.',
    'You help the operator learn what to look at for an asset (technical and fundamental lenses).',
    'You NEVER give buy/sell/hold instructions or order-like commands.',
    'You do NOT invent live market prices, quotes, exact financials, or recent filing numbers as if verified.',
    'If live pricing or fresh filings are unavailable, say so and teach frameworks/questions instead.',
    `Write every section in ${language}.`,
    'Respond with JSON only. Required string keys:',
    '- overview: what the asset is and the educational framing',
    '- fundamental: what fundamentals to inspect (no fake numbers)',
    '- technical: what chart/levels/context concepts to review (no fake prices)',
    '- risks: material risks and uncertainties',
    '- invalidation: what would weaken or invalidate a bullish or bearish thesis',
    '- disclaimer: explicit non-advice disclaimer (educational only; not investment advice)',
    'Do not include markdown fences or extra keys.',
    'Do not use phrases equivalent to "buy now", "sell now", or "you should buy/sell".',
  ].join(' ');
}

export function buildBriefUserPrompt(input: {
  symbol: string;
  holding: BriefHoldingContext | null;
}): string {
  const lines = [
    `Ticker: ${input.symbol}`,
    'No live market data feed is available for this request.',
    'Do not fabricate quotes or precise recent metrics.',
  ];

  if (input.holding) {
    lines.push(
      `Operator holding context (informational only, not a sell signal): assetTypes=${input.holding.assetTypes.join(',') || '(none)'}; notes=${input.holding.notes ?? '(none)'}`,
    );
  } else {
    lines.push('Operator holding context: none recorded for this ticker.');
  }

  return lines.join('\n');
}

export function parseBriefSectionsText(raw: string): BriefSections {
  const jsonText = extractJsonObject(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Brief Gemini response is not valid JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('Brief Gemini response JSON must be an object');
  }

  const sections = {} as BriefSections;
  for (const key of BRIEF_SECTION_KEYS) {
    sections[key] = normalizeSection(parsed[key], key);
  }
  return sections;
}

function normalizeSection(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Brief Gemini response missing section: ${key}`);
  }
  const trimmed = value.trim();
  if (trimmed.length <= BRIEF_MAX_SECTION_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, BRIEF_MAX_SECTION_LENGTH);
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
