import { randomUUID } from 'node:crypto'
import { DataSource } from 'typeorm'
import { AddOrganizationTerms1793577600000 } from './1793577600000-add-organization-terms-migration'
import { OnboardingService } from '../../organization/services/onboarding.service'
import { ORGANIZATION_TERMS } from '../../organization/dto/organization-terms.dto'

const databaseUrl =
  process.env.ONBOARDING_TEST_DATABASE_URL ??
  (process.env.CI && process.env.DB_HOST === 'localhost' && process.env.DB_DATABASE === 'boxlite'
    ? 'postgres://postgres:postgres@localhost:5432/boxlite'
    : undefined)
const integration = databaseUrl ? describe : describe.skip
integration('onboarding terms persistence (real Postgres)', () => {
  const schema = `terms_${randomUUID().replaceAll('-', '')}`
  const org = randomUUID(),
    otherOrg = randomUUID()
  const migration = new AddOrganizationTerms1793577600000()
  const input = {
    name: 'Acme',
    accepted: true,
    termsVersion: ORGANIZATION_TERMS.termsVersion,
    privacyVersion: ORGANIZATION_TERMS.privacyVersion,
  }
  let db: DataSource, service: OnboardingService
  beforeAll(async () => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl!).hostname))
      throw new Error('Local disposable database required')
    const setup = await new DataSource({ type: 'postgres', url: databaseUrl, entities: [] }).initialize()
    try {
      await setup.query(`CREATE SCHEMA "${schema}"`)
    } finally {
      await setup.destroy()
    }
    db = await new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [],
      extra: { options: `-c search_path=${schema}` },
    }).initialize()
    await db.query('CREATE TABLE organization (id uuid PRIMARY KEY, name text, "updatedAt" timestamptz DEFAULT now())')
    await db.query('INSERT INTO organization (id, name) VALUES ($1, $3), ($2, $3)', [org, otherOrg, 'Original'])
    const runner = db.createQueryRunner()
    try {
      await migration.up(runner)
    } finally {
      await runner.release()
    }
    service = new OnboardingService(db)
  })
  afterAll(async () => {
    if (!db?.isInitialized) return
    try {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`)
    } finally {
      await db.destroy()
    }
  })
  it('persists authenticated user/version/time and deduplicates concurrent retries', async () => {
    expect((await service.getTerms(org, 'alice')).acceptedAt).toBeNull()
    const results = await Promise.all(Array.from({ length: 5 }, () => service.saveSetup(org, 'alice', input)))
    expect(results[0].acceptedAt).toEqual(expect.any(String))
    expect(results.every((result) => result.acceptedAt === results[0].acceptedAt)).toBe(true)
    expect(await new OnboardingService(db).getTerms(org, 'alice')).toEqual(results[0])
    const rows = await db.query('SELECT * FROM organization_terms_acceptance')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ userId: 'alice', organizationId: org, termsVersion: input.termsVersion })
    expect((await service.getTerms(org, 'bob')).acceptedAt).toBeNull()
    expect((await service.getTerms(otherOrg, 'alice')).acceptedAt).toBeNull()
    expect((await db.query('SELECT name FROM organization WHERE id = $1', [org]))[0].name).toBe('Acme')
  })
  it('rejects stale versions or absent consent without renaming the organization', async () => {
    await expect(service.saveSetup(otherOrg, 'alice', { ...input, accepted: false })).rejects.toThrow('accept')
    await expect(service.saveSetup(otherOrg, 'alice', { ...input, termsVersion: 'old' })).rejects.toThrow('changed')
    await expect(service.saveSetup(otherOrg, 'alice', { ...input, privacyVersion: 'old' })).rejects.toThrow('changed')
    expect((await db.query('SELECT name FROM organization WHERE id = $1', [otherOrg]))[0].name).toBe('Original')
    expect((await service.getTerms(otherOrg, 'alice')).acceptedAt).toBeNull()
  })
  it('rolls back the name when acceptance persistence fails', async () => {
    await db.query(
      `ALTER TABLE organization_terms_acceptance ADD CONSTRAINT test_failure CHECK ("userId" <> 'rejected-user')`,
    )
    await expect(service.saveSetup(otherOrg, 'rejected-user', input)).rejects.toThrow('Could not save')
    expect((await db.query('SELECT name FROM organization WHERE id = $1', [otherOrg]))[0].name).toBe('Original')
    expect((await service.getTerms(otherOrg, 'rejected-user')).acceptedAt).toBeNull()
    await db.query('ALTER TABLE organization_terms_acceptance DROP CONSTRAINT test_failure')
  })
  it('keeps historical acceptance and handles missing organizations', async () => {
    await db.query(
      `INSERT INTO organization_terms_acceptance ("organizationId", "userId", "termsVersion", "privacyVersion") VALUES ($1, 'alice', 'old', 'old')`,
      [org],
    )
    await service.saveSetup(org, 'alice', input)
    expect(
      await db.query('SELECT * FROM organization_terms_acceptance WHERE "organizationId" = $1', [org]),
    ).toHaveLength(2)
    await expect(service.saveSetup(randomUUID(), 'alice', input)).rejects.toThrow('not found')
  })
  it('cascades deletion and supports migration rollback and reapplication', async () => {
    await db.query('DELETE FROM organization WHERE id = $1', [org])
    expect(await db.query('SELECT * FROM organization_terms_acceptance')).toHaveLength(0)
    const runner = db.createQueryRunner()
    try {
      await migration.down(runner)
      expect((await db.query("SELECT to_regclass('organization_terms_acceptance') AS name"))[0].name).toBeNull()
      await migration.up(runner)
      expect((await service.getTerms(otherOrg, 'alice')).acceptedAt).toBeNull()
    } finally {
      await runner.release()
    }
  })
})
