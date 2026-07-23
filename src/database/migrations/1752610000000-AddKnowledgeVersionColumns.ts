import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeVersionColumns1752610000000 implements MigrationInterface {
  name = 'AddKnowledgeVersionColumns1752610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "news_analysis"
      ADD COLUMN "prompt_version" character varying(64),
      ADD COLUMN "knowledge_version" character varying(32)
    `);
    await queryRunner.query(`
      ALTER TABLE "research_briefs"
      ADD COLUMN "knowledge_version" character varying(32)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "research_briefs"
      DROP COLUMN IF EXISTS "knowledge_version"
    `);
    await queryRunner.query(`
      ALTER TABLE "news_analysis"
      DROP COLUMN IF EXISTS "knowledge_version",
      DROP COLUMN IF EXISTS "prompt_version"
    `);
  }
}
