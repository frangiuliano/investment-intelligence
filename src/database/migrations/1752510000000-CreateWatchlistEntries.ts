import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWatchlistEntries1752510000000 implements MigrationInterface {
  name = 'CreateWatchlistEntries1752510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "watchlist_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "symbol" character varying(32) NOT NULL,
        "notes" text,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_watchlist_entries" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_watchlist_entries_symbol_active"
      ON "watchlist_entries" ("symbol")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_watchlist_entries_symbol_active"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "watchlist_entries"`);
  }
}
