import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';
import { RSS_FETCH_TIMEOUT_MS } from './rss-content';

export type RssFeedItem = {
  title?: string;
  link?: string;
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
  });

  async fetchFeed(url: string): Promise<RssFeed> {
    const feed = await this.parser.parseURL(url);
    return {
      title: feed.title,
      items: feed.items.map((item) => ({
        title: item.title,
        link: item.link,
        content: item.content,
        contentSnippet: item.contentSnippet,
        summary: item.summary,
        isoDate: item.isoDate,
        pubDate: item.pubDate,
      })),
    };
  }
}
