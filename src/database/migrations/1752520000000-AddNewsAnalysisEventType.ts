import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewsAnalysisEventType1752520000000 implements MigrationInterface {
  name = 'AddNewsAnalysisEventType1752520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "news_analysis"
      ADD COLUMN "event_type" character varying(32) NOT NULL DEFAULT 'none'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "news_analysis"
      DROP COLUMN "event_type"
    `);
  }
}
