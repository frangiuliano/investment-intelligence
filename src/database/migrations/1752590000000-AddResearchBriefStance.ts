import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResearchBriefStance1752590000000 implements MigrationInterface {
  name = 'AddResearchBriefStance1752590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "research_briefs"
      ADD COLUMN "stance" character varying(16),
      ADD COLUMN "stance_rationale" text,
      ADD COLUMN "market_as_of" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN "market_source" character varying(64)
    `);

    await queryRunner.query(`
      ALTER TABLE "research_briefs"
      ADD CONSTRAINT "CHK_research_briefs_stance" CHECK (
        "stance" IS NULL
        OR "stance" IN (
          'enter',
          'avoid',
          'watch',
          'hold',
          'add',
          'reduce',
          'exit'
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "research_briefs"
      DROP CONSTRAINT IF EXISTS "CHK_research_briefs_stance"
    `);
    await queryRunner.query(`
      ALTER TABLE "research_briefs"
      DROP COLUMN IF EXISTS "market_source",
      DROP COLUMN IF EXISTS "market_as_of",
      DROP COLUMN IF EXISTS "stance_rationale",
      DROP COLUMN IF EXISTS "stance"
    `);
  }
}
