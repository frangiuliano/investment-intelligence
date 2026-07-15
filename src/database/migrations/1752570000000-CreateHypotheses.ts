import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHypotheses1752570000000 implements MigrationInterface {
  name = 'CreateHypotheses1752570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hypotheses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "symbol" character varying(32) NOT NULL,
        "bias" character varying(16) NOT NULL,
        "thesis" text NOT NULL,
        "invalidation" text NOT NULL,
        "horizon_days" integer NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'open',
        "source" character varying(16) NOT NULL DEFAULT 'manual',
        "source_ref_id" uuid,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "close_note" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hypotheses" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_hypotheses_bias" CHECK (
          "bias" IN ('bullish', 'bearish', 'watch')
        ),
        CONSTRAINT "CHK_hypotheses_horizon_days_positive" CHECK (
          "horizon_days" > 0
        ),
        CONSTRAINT "CHK_hypotheses_status" CHECK (
          "status" IN ('open', 'closed')
        ),
        CONSTRAINT "CHK_hypotheses_source" CHECK (
          "source" IN ('manual', 'brief', 'alert')
        ),
        CONSTRAINT "CHK_hypotheses_closed_state" CHECK (
          ("status" = 'open' AND "closed_at" IS NULL)
          OR ("status" = 'closed' AND "closed_at" IS NOT NULL)
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_hypotheses_status_created_at"
      ON "hypotheses" ("status", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hypotheses"`);
  }
}
