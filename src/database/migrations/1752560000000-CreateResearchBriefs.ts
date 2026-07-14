import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResearchBriefs1752560000000 implements MigrationInterface {
  name = 'CreateResearchBriefs1752560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "research_briefs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "symbol" character varying(32) NOT NULL,
        "locale" character varying(8) NOT NULL,
        "sections" jsonb NOT NULL,
        "prompt_version" character varying(64) NOT NULL,
        "holding_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_research_briefs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_research_briefs_holding"
          FOREIGN KEY ("holding_id") REFERENCES "holdings"("id")
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_research_briefs_symbol"
      ON "research_briefs" ("symbol")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_research_briefs_created_at"
      ON "research_briefs" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_research_briefs_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_research_briefs_symbol"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "research_briefs"`);
  }
}
