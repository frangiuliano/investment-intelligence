import { AppLocale } from '../config/env.validation';
import {
  MATERIALITY_VALUES,
  MAX_PROMPT_CONTENT_LENGTH,
  MAX_SUMMARY_LENGTH,
  Materiality,
  SENTIMENT_VALUES,
  Sentiment,
} from './gemini.constants';

export type GeminiAnalysisResult = {
  summary: string;
  sentiment: Sentiment;
  tickers: string[];
  materiality: Materiality;
};

const SUMMARY_LANGUAGE_BY_LOCALE: Record<AppLocale, string> = {
  en: 'English',
  es: 'Spanish',
};

export function truncateForPrompt(
  value: string | null | undefined,
  maxLength = MAX_PROMPT_CONTENT_LENGTH,
): string {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.slice(0, maxLength);
}

export function buildAnalysisSystemPrompt(locale: AppLocale): string {
  const language = SUMMARY_LANGUAGE_BY_LOCALE[locale];
  return [
    'You are a financial news analyst.',
    'Analyze the article and respond with JSON only.',
    `Write the summary in ${language}.`,
    'Required keys:',
    `- summary: concise ${language} summary of the article (2-4 sentences)`,
    '- sentiment: one of "positive", "negative", "neutral" for market/investor impact',
    '- tickers: array of stock ticker symbols mentioned (e.g. ["AAPL","MSFT"]); empty array if none',
    '- materiality: one of "low", "medium", "high" for how market-moving the news is (low = routine/noise or unverified rumor; medium = notable for investors; high = major catalyst or significant market impact). Do not invent prices; treat AI judgment as unverified.',
    'Do not include markdown fences or extra keys.',
  ].join(' ');
}

export function buildAnalysisUserPrompt(input: {
  title: string;
  source: string;
  url: string;
  content: string | null;
}): string {
  const content = truncateForPrompt(input.content) || '(no content)';
  return [
    `Title: ${truncateForPrompt(input.title, 500)}`,
    `Source: ${truncateForPrompt(input.source, 255)}`,
    `URL: ${truncateForPrompt(input.url, 2048)}`,
    'Content:',
    content,
  ].join('\n');
}

export function parseGeminiAnalysisText(raw: string): GeminiAnalysisResult {
  const jsonText = extractJsonObject(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Gemini response is not valid JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('Gemini response JSON must be an object');
  }

  const summary = normalizeSummary(parsed.summary);
  const sentiment = normalizeSentiment(parsed.sentiment);
  const tickers = normalizeTickers(parsed.tickers);
  const materiality = normalizeMateriality(parsed.materiality);

  return { summary, sentiment, tickers, materiality };
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

function normalizeSummary(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Gemini response missing summary');
  }
  const summary = value.trim();
  if (summary.length <= MAX_SUMMARY_LENGTH) {
    return summary;
  }
  return summary.slice(0, MAX_SUMMARY_LENGTH);
}

function normalizeSentiment(value: unknown): Sentiment {
  if (typeof value !== 'string') {
    throw new Error('Gemini response missing sentiment');
  }
  const normalized = value.trim().toLowerCase();
  if ((SENTIMENT_VALUES as readonly string[]).includes(normalized)) {
    return normalized as Sentiment;
  }
  throw new Error(`Gemini response has invalid sentiment: ${value}`);
}

function normalizeTickers(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error('Gemini response tickers must be an array');
  }

  const tickers: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }
    const ticker = item.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker)) {
      continue;
    }
    if (seen.has(ticker)) {
      continue;
    }
    seen.add(ticker);
    tickers.push(ticker);
    if (tickers.length >= 20) {
      break;
    }
  }
  return tickers;
}

function normalizeMateriality(value: unknown): Materiality {
  if (typeof value !== 'string') {
    throw new Error('Gemini response missing materiality');
  }
  const normalized = value.trim().toLowerCase();
  if ((MATERIALITY_VALUES as readonly string[]).includes(normalized)) {
    return normalized as Materiality;
  }
  throw new Error(`Gemini response has invalid materiality: ${value}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
