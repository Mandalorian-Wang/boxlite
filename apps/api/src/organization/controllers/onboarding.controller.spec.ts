import 'reflect-metadata'
import { Test } from '@nestjs/testing'
import { AuthGuard } from '@nestjs/passport'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AuthenticatedRateLimitGuard } from '../../common/guards/authenticated-rate-limit.guard'
import { ExecutionContext } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Reflector } from '@nestjs/core'
import { OnboardingController } from './onboarding.controller'
import { OrganizationActionGuard } from '../guards/organization-action.guard'
import { OrganizationMemberRole } from '../enums/organization-member-role.enum'
import { RequiredOrganizationMemberRole } from '../decorators/required-organization-member-role.decorator'
import { OnboardingService } from '../services/onboarding.service'
import { AuthContext } from '../../common/interfaces/auth-context.interface'

jest.mock('../services/organization.service', () => ({ OrganizationService: class {} }))
jest.mock('../services/organization-user.service', () => ({
  OrganizationUserService: class {
    static membershipCacheKey() {
      return 'test-membership'
    }
  },
}))
jest.mock('../../common/guards/authenticated-rate-limit.guard', () => ({ AuthenticatedRateLimitGuard: class {} }))

describe('onboarding route access', () => {
  it('publishes the six endpoints and nullable reads in OpenAPI', async () => {
    const module = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [{ provide: OnboardingService, useValue: {} }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(OrganizationActionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthenticatedRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile()
    const app = module.createNestApplication()
    try {
      await app.init()
      const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build())
      const operations = Object.values(doc.paths).flatMap((path) => Object.values(path))
      expect(operations).toHaveLength(6)
      const read = doc.paths['/organizations/{organizationId}/onboarding'].get!
      expect(read.operationId).toBe('getOrganizationOnboarding')
      expect((read.responses['200'] as any).content['application/json'].schema.nullable).toBe(true)
      expect(doc.components?.schemas?.CreatePromptHandoffDto).toBeDefined()
    } finally {
      await app.close()
    }
  })

  it('uses authentication and organization membership guards on every route', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, OnboardingController)
    expect(guards).toHaveLength(3)
    expect(guards).toContain(OrganizationActionGuard)
    expect(new Reflector().get(RequiredOrganizationMemberRole, OnboardingController.prototype.saveOnboarding)).toBe(
      OrganizationMemberRole.OWNER,
    )
  })

  it('takes prompt ownership from authentication, not the body', async () => {
    const saveDraft = jest.fn()
    const controller = new OnboardingController({ saveDraft } as unknown as OnboardingService)
    const input = { text: 'app', revision: 0 }
    await controller.saveDraft('org', { userId: 'authenticated' } as AuthContext, input)
    expect(saveDraft).toHaveBeenCalledWith('org', 'authenticated', input)
  })

  it.each([
    [null, 'saveDraft', false],
    [OrganizationMemberRole.MEMBER, 'saveOnboarding', false],
    [OrganizationMemberRole.OWNER, 'saveOnboarding', true],
    [OrganizationMemberRole.MEMBER, 'saveDraft', true],
    [OrganizationMemberRole.MEMBER, 'createHandoff', true],
  ])('enforces membership %s for %s', async (role, method, allowed) => {
    const guard = new OrganizationActionGuard(
      { findOne: jest.fn().mockResolvedValue({ id: 'org' }) } as never,
      { findOne: jest.fn().mockResolvedValue(role ? { role } : null) } as never,
      new Reflector(),
    )
    Object.assign(guard, { redis: { get: jest.fn().mockResolvedValue(null), set: jest.fn() } })
    const request = { params: { organizationId: 'org' }, user: { userId: 'user', role: 'user' } }
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => OnboardingController.prototype[method],
      getClass: () => OnboardingController,
    } as unknown as ExecutionContext
    expect(await guard.canActivate(context)).toBe(allowed)
  })
})
