import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResearchBriefChartPng1752600000000 implements MigrationInterface {
  name = 'AddResearchBriefChartPng1752600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "research_briefs"
      ADD COLUMN "chart_png" bytea
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "research_briefs"
      DROP COLUMN IF EXISTS "chart_png"
    `);
  }
}
