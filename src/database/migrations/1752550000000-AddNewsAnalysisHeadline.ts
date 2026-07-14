import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewsAnalysisHeadline1752550000000 implements MigrationInterface {
  name = 'AddNewsAnalysisHeadline1752550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "news_analysis"
      ADD COLUMN "headline" text NOT NULL DEFAULT ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "news_analysis"
      DROP COLUMN "headline"
    `);
  }
}
