/* Copyright 2026 BoxLite AI · SPDX-License-Identifier: AGPL-3.0 */
import { ApiProperty } from '@nestjs/swagger'
import { Equals, IsString, Matches, MaxLength } from 'class-validator'

// Update with the published documents; retain prior acceptance rows when versions change.
export const ORGANIZATION_TERMS = {
  termsVersion: '2026-10-10',
  privacyVersion: '2026-10-10',
  termsUrl: 'https://boxlite.ai/legal/terms',
  privacyUrl: 'https://boxlite.ai/legal/privacy',
} as const

export class OrganizationTermsDto {
  @ApiProperty() termsVersion: string
  @ApiProperty() privacyVersion: string
  @ApiProperty() termsUrl: string
  @ApiProperty() privacyUrl: string
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) acceptedAt: string | null
}

export class SaveOrganizationSetupDto {
  @ApiProperty({ maxLength: 60 })
  @IsString()
  @MaxLength(60)
  @Matches(/\S/)
  name: string

  @ApiProperty({ type: Boolean, enum: [true] })
  @Equals(true)
  accepted: boolean

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @MaxLength(40)
  termsVersion: string

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @MaxLength(40)
  privacyVersion: string
}
