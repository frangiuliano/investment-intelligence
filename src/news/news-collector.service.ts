import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { RssFeedClient, RssFeedItem } from './rss-feed.client';
import {
  computeContentHash,
  firstNonEmpty,
  isAllowedHttpUrl,
  parsePublishedAt,
  resolveItemUrl,
  resolveSourceName,
  sanitizeContent,
  sanitizeTitle,
  truncate,
} from './rss-content';

export type CollectionRunResult = {
  feedsProcessed: number;
  itemsSeen: number;
  inserted: number;
  duplicates: number;
  skipped: number;
  errors: number;
};

@Injectable()
export class NewsCollectorService {
  private readonly logger = new Logger(NewsCollectorService.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly rssFeedClient: RssFeedClient,
    @InjectRepository(NewsArticle)
    private readonly newsArticles: Repository<NewsArticle>,
  ) {}

  async collect(): Promise<CollectionRunResult> {
    if (this.running) {
      this.logger.warn(
        'Collection already in progress; skipping overlapping run',
      );
      return {
        feedsProcessed: 0,
        itemsSeen: 0,
        inserted: 0,
        duplicates: 0,
        skipped: 0,
        errors: 0,
      };
    }

    this.running = true;
    const result: CollectionRunResult = {
      feedsProcessed: 0,
      itemsSeen: 0,
      inserted: 0,
      duplicates: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      const feedUrls = this.configService.getOrThrow<string[]>('rss.feedUrls');

      for (const feedUrl of feedUrls) {
        await this.collectFeed(feedUrl, result);
      }

      this.logger.log(
        `Collection finished: feeds=${result.feedsProcessed} seen=${result.itemsSeen} inserted=${result.inserted} duplicates=${result.duplicates} skipped=${result.skipped} errors=${result.errors}`,
      );
      return result;
    } finally {
      this.running = false;
    }
  }

  private async collectFeed(
    feedUrl: string,
    result: CollectionRunResult,
  ): Promise<void> {
    if (!isAllowedHttpUrl(feedUrl)) {
      this.logger.warn(`Skipping disallowed feed URL: ${feedUrl}`);
      result.errors += 1;
      return;
    }

    let feed;
    try {
      feed = await this.rssFeedClient.fetchFeed(feedUrl);
    } catch (error) {
      result.errors += 1;
      this.logger.error(
        `Failed to fetch feed ${feedUrl}: ${errorMessage(error)}`,
      );
      return;
    }

    result.feedsProcessed += 1;
    const source = resolveSourceName(feed.title, feedUrl);

    for (const item of feed.items) {
      result.itemsSeen += 1;
      const outcome = await this.persistItem(item, source);
      result[outcome] += 1;
    }
  }

  private async persistItem(
    item: RssFeedItem,
    source: string,
  ): Promise<'inserted' | 'duplicates' | 'skipped' | 'errors'> {
    const title = sanitizeTitle(item.title);
    const url = resolveItemUrl([item.link, item.guid]);
    if (!title || !url) {
      return 'skipped';
    }

    const content = sanitizeContent(
      firstNonEmpty(item.content, item.contentSnippet, item.summary),
    );
    const contentHash = computeContentHash({ title, url, content });
    const publishedAt = parsePublishedAt(item.isoDate, item.pubDate);
    const truncatedUrl = truncate(url, 2048);

    try {
      const existing = await this.newsArticles.findOne({
        where: [{ url: truncatedUrl }, { contentHash }],
      });
      if (existing) {
        return 'duplicates';
      }

      await this.newsArticles.save(
        this.newsArticles.create({
          title,
          url: truncatedUrl,
          content,
          source,
          contentHash,
          publishedAt,
        }),
      );
      return 'inserted';
    } catch (error) {
      if (isUniqueViolation(error)) {
        return 'duplicates';
      }
      this.logger.error(
        `Failed to persist article ${url}: ${errorMessage(error)}`,
      );
      return 'errors';
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.driverError === 'object' &&
    error.driverError !== null &&
    'code' in error.driverError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
