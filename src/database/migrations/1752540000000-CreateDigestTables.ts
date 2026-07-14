import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDigestTables1752540000000 implements MigrationInterface {
  name = 'CreateDigestTables1752540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "digest_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "channel" character varying(64) NOT NULL,
        "item_count" integer NOT NULL,
        "lookback_hours" integer NOT NULL,
        "period_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "period_end" TIMESTAMP WITH TIME ZONE NOT NULL,
        "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_digest_runs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "digest_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "digest_run_id" uuid NOT NULL,
        "article_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_digest_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_digest_items_article_id" UNIQUE ("article_id"),
        CONSTRAINT "FK_digest_items_digest_run"
          FOREIGN KEY ("digest_run_id") REFERENCES "digest_runs"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_digest_items_article"
          FOREIGN KEY ("article_id") REFERENCES "news_articles"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_digest_items_digest_run_id"
      ON "digest_items" ("digest_run_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_digest_items_digest_run_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "digest_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "digest_runs"`);
  }
}
