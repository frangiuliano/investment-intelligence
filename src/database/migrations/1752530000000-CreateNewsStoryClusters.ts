import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewsStoryClusters1752530000000 implements MigrationInterface {
  name = 'CreateNewsStoryClusters1752530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "news_story_clusters" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_news_story_clusters" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "news_story_cluster_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "cluster_id" uuid NOT NULL,
        "article_id" uuid NOT NULL,
        "alerted" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_news_story_cluster_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_news_story_cluster_members_article_id" UNIQUE ("article_id"),
        CONSTRAINT "FK_news_story_cluster_members_cluster"
          FOREIGN KEY ("cluster_id") REFERENCES "news_story_clusters"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_news_story_cluster_members_article"
          FOREIGN KEY ("article_id") REFERENCES "news_articles"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_news_story_cluster_members_cluster_id"
      ON "news_story_cluster_members" ("cluster_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_news_story_cluster_members_cluster_id"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "news_story_cluster_members"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "news_story_clusters"`);
  }
}
