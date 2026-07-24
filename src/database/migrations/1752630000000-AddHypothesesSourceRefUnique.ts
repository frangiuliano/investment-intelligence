import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHypothesesSourceRefUnique1752630000000
  implements MigrationInterface
{
  name = 'AddHypothesesSourceRefUnique1752630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_hypotheses_source_source_ref_id"
      ON "hypotheses" ("source", "source_ref_id")
      WHERE "source_ref_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_hypotheses_source_source_ref_id"`,
    );
  }
}
