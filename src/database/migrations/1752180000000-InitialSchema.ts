import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1752180000000 implements MigrationInterface {
  name = 'InitialSchema1752180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "news_articles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying(500) NOT NULL,
        "url" character varying(2048) NOT NULL,
        "content" text,
        "source" character varying(255) NOT NULL,
        "content_hash" character varying(64) NOT NULL,
        "published_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_news_articles_url" UNIQUE ("url"),
        CONSTRAINT "UQ_news_articles_content_hash" UNIQUE ("content_hash"),
        CONSTRAINT "PK_news_articles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "news_analysis" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "article_id" uuid NOT NULL,
        "summary" text NOT NULL,
        "sentiment" character varying(32) NOT NULL,
        "tickers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "model" character varying(128) NOT NULL,
        "analyzed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_news_analysis_article_id" UNIQUE ("article_id"),
        CONSTRAINT "PK_news_analysis" PRIMARY KEY ("id"),
        CONSTRAINT "FK_news_analysis_article"
          FOREIGN KEY ("article_id")
          REFERENCES "news_articles"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "article_id" uuid NOT NULL,
        "channel" character varying(64) NOT NULL,
        "payload" jsonb,
        "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_article"
          FOREIGN KEY ("article_id")
          REFERENCES "news_articles"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "news_analysis"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "news_articles"`);
  }
}
