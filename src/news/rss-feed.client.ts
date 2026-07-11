import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';
import {
  isAllowedHttpUrl,
  MAX_FEED_BYTES,
  MAX_FEED_REDIRECTS,
  RSS_FETCH_TIMEOUT_MS,
} from './rss-content';

export type RssFeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  isoDate?: string;
  pubDate?: string;
};

export type RssFeed = {
  title?: string;
  items: RssFeedItem[];
};

@Injectable()
export class RssFeedClient {
  private readonly parser = new Parser({
    timeout: RSS_FETCH_TIMEOUT_MS,
    maxRedirects: 0,
  });

  async fetchFeed(url: string): Promise<RssFeed> {
    const xml = await this.downloadFeedXml(url);
    const feed = await this.parser.parseString(xml);
    return {
      title: feed.title,
      items: feed.items.map((item) => ({
        title: item.title,
        link: item.link,
        guid: item.guid,
        content: item.content,
        contentSnippet: item.contentSnippet,
        summary: item.summary,
        isoDate: item.isoDate,
        pubDate: item.pubDate,
      })),
    };
  }

  private async downloadFeedXml(startUrl: string): Promise<string> {
    let currentUrl = startUrl;

    for (let hop = 0; hop <= MAX_FEED_REDIRECTS; hop += 1) {
      if (!isAllowedHttpUrl(currentUrl)) {
        throw new Error(`Disallowed feed URL: ${currentUrl}`);
      }

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        RSS_FETCH_TIMEOUT_MS,
      );

      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
            'User-Agent': 'investment-intelligence-news-collector/0.1',
          },
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            throw new Error(
              `Redirect ${response.status} without Location from ${currentUrl}`,
            );
          }
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} fetching ${currentUrl}`);
        }

        return await readBodyWithLimit(response, MAX_FEED_BYTES);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(
      `Too many redirects (max ${MAX_FEED_REDIRECTS}) fetching feed`,
    );
  }
}

async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Feed body exceeds ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
    'utf8',
  );
}
