import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHypothesisReviews1752580000000 implements MigrationInterface {
  name = 'CreateHypothesisReviews1752580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hypothesis_review_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "period_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "period_end" TIMESTAMP WITH TIME ZONE NOT NULL,
        "reviewed_count" integer NOT NULL,
        "skipped_count" integer NOT NULL DEFAULT 0,
        "locale" character varying(8) NOT NULL,
        "summary_message" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hypothesis_review_runs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_hypothesis_review_runs_period" CHECK (
          "period_end" >= "period_start"
        ),
        CONSTRAINT "CHK_hypothesis_review_runs_counts" CHECK (
          "reviewed_count" >= 0 AND "skipped_count" >= 0
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "hypothesis_reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "review_run_id" uuid NOT NULL,
        "hypothesis_id" uuid NOT NULL,
        "outcome" character varying(32) NOT NULL,
        "thesis_quality_note" text NOT NULL,
        "timing_note" text NOT NULL,
        "learning_note" text NOT NULL,
        "explanation" text NOT NULL,
        "price_return_pct" numeric(12,4),
        "price_start" numeric(18,6),
        "price_end" numeric(18,6),
        "price_as_of" TIMESTAMP WITH TIME ZONE,
        "market_source" character varying(64),
        "price_unavailable_reason" character varying(64),
        "locale" character varying(8) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hypothesis_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hypothesis_reviews_run"
          FOREIGN KEY ("review_run_id")
          REFERENCES "hypothesis_review_runs"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_hypothesis_reviews_hypothesis"
          FOREIGN KEY ("hypothesis_id")
          REFERENCES "hypotheses"("id")
          ON DELETE CASCADE,
        CONSTRAINT "UQ_hypothesis_reviews_run_hypothesis"
          UNIQUE ("review_run_id", "hypothesis_id"),
        CONSTRAINT "CHK_hypothesis_reviews_outcome" CHECK (
          "outcome" IN (
            'thesis_confirmed',
            'thesis_rejected',
            'timing_issue',
            'inconclusive'
          )
        ),
        CONSTRAINT "CHK_hypothesis_reviews_price_pair" CHECK (
          ("price_start" IS NULL AND "price_end" IS NULL)
          OR ("price_start" IS NOT NULL AND "price_end" IS NOT NULL)
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_hypothesis_reviews_hypothesis_created_at"
      ON "hypothesis_reviews" ("hypothesis_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_hypothesis_reviews_created_at"
      ON "hypothesis_reviews" ("created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_hypothesis_review_runs_period"
      ON "hypothesis_review_runs" ("period_start", "period_end")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hypothesis_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hypothesis_review_runs"`);
  }
}
