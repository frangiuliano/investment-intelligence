import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewsAnalysisMateriality1752430000000 implements MigrationInterface {
  name = 'AddNewsAnalysisMateriality1752430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "news_analysis"
      ADD COLUMN "materiality" character varying(32) NOT NULL DEFAULT 'low'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "news_analysis"
      DROP COLUMN "materiality"
    `);
  }
}
