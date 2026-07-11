import { MAX_FEED_BYTES } from './rss-content';
import { RssFeedClient } from './rss-feed.client';

function mockResponse(init: {
  status: number;
  ok: boolean;
  location?: string | null;
  bodyBytes?: Uint8Array;
  oversized?: boolean;
}): Response {
  let readOnce = false;
  const body =
    init.bodyBytes || init.oversized
      ? {
          getReader: () => ({
            read: () => {
              if (init.oversized) {
                return Promise.resolve({
                  done: false as const,
                  value: new Uint8Array(MAX_FEED_BYTES + 1),
                });
              }
              if (readOnce) {
                return Promise.resolve({
                  done: true as const,
                  value: undefined,
                });
              }
              readOnce = true;
              return Promise.resolve({
                done: false as const,
                value: init.bodyBytes as Uint8Array,
              });
            },
            cancel: () => Promise.resolve(),
          }),
        }
      : null;

  return {
    status: init.status,
    ok: init.ok,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'location' ? (init.location ?? null) : null,
    },
    body,
  } as unknown as Response;
}

describe('RssFeedClient', () => {
  const originalFetch = global.fetch;
  let client: RssFeedClient;

  beforeEach(() => {
    client = new RssFeedClient();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should reject redirects to private hosts', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({
        status: 302,
        ok: false,
        location: 'http://127.0.0.1/secret',
      }),
    );

    await expect(
      client.fetchFeed('https://feeds.example.com/rss'),
    ).rejects.toThrow(/Disallowed feed URL/);
  });

  it('should download XML with abort signal and parse items', async () => {
    const xml = `<?xml version="1.0"?>
      <rss version="2.0"><channel>
        <title>Safe Feed</title>
        <item>
          <title>Hello</title>
          <link>https://news.example.com/hello</link>
          <description>Body</description>
        </item>
      </channel></rss>`;

    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({
        status: 200,
        ok: true,
        bodyBytes: new TextEncoder().encode(xml),
      }),
    );

    const feed = await client.fetchFeed('https://feeds.example.com/rss');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://feeds.example.com/rss',
      expect.objectContaining({
        redirect: 'manual',
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
    expect(feed.title).toBe('Safe Feed');
    expect(feed.items[0]).toEqual(
      expect.objectContaining({
        title: 'Hello',
        link: 'https://news.example.com/hello',
      }),
    );
  });

  it('should reject bodies larger than the configured limit', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockResponse({ status: 200, ok: true, oversized: true }),
      );

    await expect(
      client.fetchFeed('https://feeds.example.com/rss'),
    ).rejects.toThrow(/Feed body exceeds/);
  });
});
