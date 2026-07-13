import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHoldings1752500000000 implements MigrationInterface {
  name = 'CreateHoldings1752500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "holdings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "symbol" character varying(32) NOT NULL,
        "asset_type" character varying(32) NOT NULL,
        "quantity" numeric(28,10) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "avg_entry_price" numeric(28,10),
        "notes" text,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_holdings" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_holdings_asset_type" CHECK (
          "asset_type" IN ('equity', 'cedear', 'bond', 'treasury', 'other')
        ),
        CONSTRAINT "CHK_holdings_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_holdings_currency_len" CHECK (char_length("currency") = 3)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_holdings_symbol_asset_type_active"
      ON "holdings" ("symbol", "asset_type")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_holdings_symbol_asset_type_active"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "holdings"`);
  }
}
