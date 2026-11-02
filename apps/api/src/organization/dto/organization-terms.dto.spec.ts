import { ValidationPipe } from '@nestjs/common'
import { SaveOrganizationSetupDto } from './organization-terms.dto'

describe('onboarding terms validation', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })
  const valid = { name: 'Acme', accepted: true, termsVersion: '2026-10-10', privacyVersion: '2026-10-10' }
  const parse = (value: object) => pipe.transform(value, { type: 'body', metatype: SaveOrganizationSetupDto })
  it('accepts explicit consent with the displayed versions', async () => {
    await expect(parse(valid)).resolves.toMatchObject(valid)
  })
  it.each([
    { accepted: false },
    { accepted: 'true' },
    { accepted: undefined },
    { name: '   ' },
    { name: 'a'.repeat(61) },
    { termsVersion: undefined },
    { privacyVersion: undefined },
    { userId: 'someone-else' },
    { acceptedAt: '2020-01-01' },
  ])('rejects invalid or client-controlled acceptance data: %j', async (change) => {
    await expect(parse({ ...valid, ...change })).rejects.toThrow()
  })
})
