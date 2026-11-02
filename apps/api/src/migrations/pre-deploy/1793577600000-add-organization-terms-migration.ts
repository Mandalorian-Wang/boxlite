/* Copyright 2026 BoxLite AI · SPDX-License-Identifier: AGPL-3.0 */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganizationTerms1793577600000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE organization_terms_acceptance (
      "organizationId" uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
      "userId" varchar NOT NULL,
      "termsVersion" varchar(40) NOT NULL,
      "privacyVersion" varchar(40) NOT NULL,
      "acceptedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("organizationId", "userId", "termsVersion", "privacyVersion"))`)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE organization_terms_acceptance')
  }
}
