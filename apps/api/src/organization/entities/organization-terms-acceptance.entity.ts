/* Copyright 2026 BoxLite AI · SPDX-License-Identifier: AGPL-3.0 */
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Organization } from './organization.entity'

@Entity('organization_terms_acceptance')
export class OrganizationTermsAcceptance {
  @PrimaryColumn('uuid') organizationId: string
  @PrimaryColumn('varchar') userId: string
  @PrimaryColumn({ type: 'varchar', length: 40 }) termsVersion: string
  @PrimaryColumn({ type: 'varchar', length: 40 }) privacyVersion: string
  @Column({ type: 'timestamptz', default: () => 'now()' }) acceptedAt: Date

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization
}
