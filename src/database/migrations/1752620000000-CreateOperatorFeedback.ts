import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOperatorFeedback1752620000000 implements MigrationInterface {
  name = 'CreateOperatorFeedback1752620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "operator_feedback" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "target_type" character varying(32) NOT NULL,
        "target_id" uuid NOT NULL,
        "label" character varying(16) NOT NULL,
        "prompt_version" character varying(64),
        "knowledge_version" character varying(32),
        "source" character varying(16) NOT NULL DEFAULT 'desk',
        "actor" character varying(64) NOT NULL DEFAULT 'desk-operator',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_operator_feedback" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_operator_feedback_target_type" CHECK (
          "target_type" IN ('analysis', 'brief', 'notification')
        ),
        CONSTRAINT "CHK_operator_feedback_label" CHECK (
          "label" IN ('useful', 'noise')
        ),
        CONSTRAINT "CHK_operator_feedback_source" CHECK (
          "source" IN ('desk')
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_operator_feedback_target"
      ON "operator_feedback" ("target_type", "target_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_operator_feedback_created_at"
      ON "operator_feedback" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "operator_feedback"`);
  }
}
