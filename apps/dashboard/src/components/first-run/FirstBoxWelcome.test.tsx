// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import FirstBoxWelcome from './FirstBoxWelcome'
const api = vi.hoisted(() => ({
  profile: vi.fn(),
  terms: vi.fn(),
  setup: vi.fn(),
  rename: vi.fn(),
  save: vi.fn(),
  credits: vi.fn(),
  refresh: vi.fn(),
  billingApiUrl: 'https://billing.example.test',
}))
vi.mock('@/hooks/useApi', () => ({
  useApi: () => ({
    getOrganizationOnboarding: api.profile,
    getOrganizationTerms: api.terms,
    saveOrganizationSetup: api.setup,
    saveOrganizationOnboarding: api.save,
    organizationsApi: { updateOrganizationName: api.rename },
    billingApi: { getSignupCreditDelivery: api.credits },
  }),
}))
vi.mock('@/hooks/useSelectedOrganization', () => ({
  useSelectedOrganization: () => ({ selectedOrganization: { id: 'org-1', name: 'Existing organization' } }),
}))
vi.mock('@/hooks/useOrganizations', () => ({ useOrganizations: () => ({ refreshOrganizations: api.refresh }) }))
vi.mock('@/hooks/useConfig', () => ({ useConfig: () => ({ billingApiUrl: api.billingApiUrl }) }))
vi.mock('react-oidc-context', () => ({ useAuth: () => ({ user: { profile: { sub: 'user-1' } } }) }))
vi.mock('./FirstBoxAtmosphere', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
const acceptedTerms = {
  termsVersion: '2026-10-10',
  privacyVersion: '2026-10-10',
  termsUrl: 'https://boxlite.ai/legal/terms',
  privacyUrl: 'https://boxlite.ai/legal/privacy',
  acceptedAt: '2026-11-02T00:00:00.000Z',
}
let host: HTMLDivElement, root: Root, client: QueryClient
beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_MOCKING', 'false')
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.resetAllMocks()
  api.billingApiUrl = 'https://billing.example.test'
  localStorage.clear()
  sessionStorage.clear()
  api.terms.mockResolvedValue(acceptedTerms)
  api.setup.mockResolvedValue(acceptedTerms)
  api.profile.mockResolvedValue(null)
  api.credits.mockResolvedValue({ delivered: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  client.clear()
  localStorage.clear()
  sessionStorage.clear()
  vi.unstubAllEnvs()
})
it('positions the animation on a fresh organization step without requiring a step change', async () => {
  vi.stubEnv('VITE_ENABLE_MOCKING', 'true')
  api.terms.mockResolvedValue({ ...acceptedTerms, acceptedAt: null })
  await mount('/welcome?preview=card-verification')
  expect(host.textContent).toContain('Create your organization')
  expect(host.querySelector<HTMLElement>('.welcome-journey-art')!.style.visibility).toBe('visible')
})
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20))
  })
}
async function mount(entry = '/welcome') {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/welcome" element={<FirstBoxWelcome />} />
            <Route path="/dashboard/quickstart" element={<p>Quickstart destination</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  )
  await settle()
}
async function click(text: string) {
  const b = Array.from(host.querySelectorAll('button')).find((e) => e.textContent?.trim() === text)!
  await act(async () => b.click())
  await settle()
}
async function input(id: string, value: string) {
  const e = host.querySelector('#' + id)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      e.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
      'value',
    )!.set!.call(e, value)
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
it('requires explicit acceptance, opens official links separately, and preserves a failed submission', async () => {
  api.terms.mockResolvedValue({ ...acceptedTerms, acceptedAt: null })
  api.setup.mockRejectedValueOnce(new Error('Could not save. Please retry.'))
  await mount()
  await input('welcome-organization', 'Acme')
  const checkbox = host.querySelector<HTMLInputElement>('#welcome-terms')!
  expect(checkbox.checked).toBe(false)
  expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)
  const links = [...host.querySelectorAll<HTMLAnchorElement>('#welcome-terms-label a')]
  expect(links.map((link) => link.href)).toEqual([acceptedTerms.termsUrl, acceptedTerms.privacyUrl])
  expect(links.every((link) => link.target === '_blank' && link.rel.includes('noopener'))).toBe(true)
  await act(async () => checkbox.click())
  await click('Continue')
  expect(host.textContent).toContain('Could not save. Please retry.')
  expect(checkbox.checked).toBe(true)
  expect(host.querySelector<HTMLInputElement>('#welcome-organization')!.value).toBe('Acme')
  expect(host.textContent).not.toContain('What are you building?')
  api.setup.mockResolvedValue(acceptedTerms)
  await click('Continue')
  expect(host.textContent).toContain('What are you building?')
  await click('Back')
  expect(host.querySelector('#welcome-terms')).toBeNull()
})

it('does not treat browser progress as acceptance and blocks unavailable terms reads', async () => {
  localStorage.setItem('boxlite:welcome:user-1:org-1', JSON.stringify({ organizationName: 'Acme', completedAt: 123 }))
  api.terms.mockRejectedValueOnce(new Error('offline'))
  await mount()
  expect(host.textContent).toContain('Could not load your setup')
  api.terms.mockResolvedValue({ ...acceptedTerms, acceptedAt: null })
  await click('Try again')
  expect(host.textContent).toContain('Create your organization')
  expect(host.querySelector('#welcome-terms')).not.toBeNull()
  expect(api.setup).not.toHaveBeenCalled()
})
it('requires another check when the displayed document versions change before submission', async () => {
  api.terms.mockResolvedValue({ ...acceptedTerms, acceptedAt: null })
  await mount()
  await input('welcome-organization', 'Acme')
  await act(async () => host.querySelector<HTMLInputElement>('#welcome-terms')!.click())
  expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false)
  await act(async () => {
    client.setQueryData(['organization-terms', 'user-1', 'org-1'], {
      ...acceptedTerms,
      acceptedAt: null,
      termsVersion: '2026-11-02',
    })
  })
  await settle()
  expect(host.querySelector<HTMLInputElement>('#welcome-terms')!.checked).toBe(false)
  expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)
  expect(host.querySelector<HTMLInputElement>('#welcome-organization')!.value).toBe('Acme')
})
it('saves the name and selected intent before advancing after confirmed credit delivery', async () => {
  api.terms.mockResolvedValue({ ...acceptedTerms, acceptedAt: null })
  await mount()
  expect(host.textContent).toContain('Create your organization')
  await input('welcome-organization', 'New team')
  await act(async () => host.querySelector<HTMLInputElement>('#welcome-terms')!.click())
  await click('Continue')
  expect(api.setup).toHaveBeenCalledWith('org-1', {
    name: 'New team',
    accepted: true,
    termsVersion: acceptedTerms.termsVersion,
    privacyVersion: acceptedTerms.privacyVersion,
  })
  expect(host.textContent).toContain('What are you building?')
  await act(async () => host.querySelector<HTMLInputElement>('input[value="long-running-agent"]')!.click())
  await input('welcome-note', 'Run an agent overnight')
  await click('Start quickstart')
  expect(api.save).toHaveBeenCalledWith('org-1', { useCase: 'long-running-agent', note: 'Run an agent overnight' })
  expect(host.textContent).toContain('Quickstart destination')
})
it('restores saved intent, supports going back, and keeps failed submissions retryable', async () => {
  api.profile.mockResolvedValue({ useCase: 'coding-agent', note: 'Saved note' })
  await mount()
  expect(host.querySelector<HTMLTextAreaElement>('#welcome-note')!.value).toBe('Saved note')
  await click('Back')
  expect(host.querySelector<HTMLInputElement>('#welcome-organization')!.value).toBe('Existing organization')
  await click('Continue')
  await act(async () => host.querySelector<HTMLInputElement>('input[value="exploring"]')!.click())
  api.save.mockRejectedValue(new Error('Try saving later'))
  await click('Start quickstart')
  expect(host.textContent).toContain('Try saving later')
  expect(api.credits).not.toHaveBeenCalled()
  api.save.mockResolvedValue({})
  await click('Try again')
  expect(host.textContent).toContain('Quickstart destination')
})
it('shows profile loading failures and reloads them without losing the page', async () => {
  api.terms.mockResolvedValue({ ...acceptedTerms, acceptedAt: null })
  api.profile.mockRejectedValue(new Error('offline'))
  await mount()
  expect(host.textContent).toContain('Could not load your setup')
  api.profile.mockResolvedValue(null)
  await click('Try again')
  expect(host.textContent).toContain('Create your organization')
})

it('restores the confirmed organization step after reloading before intent submission', async () => {
  localStorage.setItem('boxlite:welcome:user-1:org-1', JSON.stringify({ organizationName: 'Existing organization' }))
  await mount()
  expect(host.textContent).toContain('What are you building?')
  await click('Back')
  expect(host.querySelector<HTMLInputElement>('#welcome-organization')!.value).toBe('Existing organization')
})

it('opens Quickstart without billing or a fabricated credit grant', async () => {
  api.billingApiUrl = ''
  api.profile.mockResolvedValue({ useCase: 'exploring', note: '' })
  await mount()
  expect(host.textContent).not.toContain('signup credits')
  await click('Start quickstart')
  expect(host.textContent).toContain('Quickstart destination')
  expect(api.credits).not.toHaveBeenCalled()
})
it('offers an explicit exit when configured billing cannot deliver credits', async () => {
  api.profile.mockResolvedValue({ useCase: 'exploring', note: '' })
  api.credits.mockRejectedValue(new Error('Credits unavailable'))
  await mount()
  await click('Start quickstart')
  expect(host.textContent).toContain('Credits unavailable')
  await click('Continue without credits')
  expect(host.textContent).toContain('Quickstart destination')
  expect(api.credits).toHaveBeenCalledTimes(1)
})

it('restores completion after continuing without credits instead of repeating setup', async () => {
  localStorage.setItem(
    'boxlite:welcome:user-1:org-1',
    JSON.stringify({
      organizationName: 'Existing organization',
      completedAt: 1793200000000,
      creditGrantedAt: null,
    }),
  )
  api.profile.mockResolvedValue({ useCase: 'exploring', note: '' })
  await mount()
  expect(host.textContent).toContain('Quickstart destination')
  expect(api.save).not.toHaveBeenCalled()
  expect(api.credits).not.toHaveBeenCalled()
})

it('saves organization and intent before the local card step without polling or granting credits', async () => {
  vi.stubEnv('VITE_ENABLE_MOCKING', 'true')
  // Prior production progress must not skip or be overwritten by this replay.
  localStorage.setItem('boxlite:welcome:user-1:org-1', JSON.stringify({ completedAt: 123 }))
  await mount('/welcome?preview=card-verification')
  await input('welcome-organization', 'Verified team')
  await click('Continue')
  await act(async () => host.querySelector<HTMLInputElement>('input[value="long-running-agent"]')!.click())
  await input('welcome-note', 'Overnight tasks')
  await click('Continue')
  await settle()
  expect(api.setup).toHaveBeenCalledWith('org-1', expect.objectContaining({ name: 'Verified team', accepted: true }))
  expect(api.save).toHaveBeenCalledWith('org-1', { useCase: 'long-running-agent', note: 'Overnight tasks' })
  await vi.waitFor(async () => {
    await settle()
    expect(host.textContent).toContain('long-running tasks.')
  })
  expect(host.textContent).toContain('Your agent.Its own Box.')
  expect(host.textContent).not.toContain('Continue without credits')
  expect(api.credits).not.toHaveBeenCalled()
  expect(JSON.parse(localStorage.getItem('boxlite:welcome:user-1:org-1')!)).toEqual({ completedAt: 123 })
  await click('Back')
  expect(host.querySelector<HTMLTextAreaElement>('#welcome-note')!.value).toBe('Overnight tasks')
})

it('restores saved preview intent directly into Get credits', async () => {
  vi.stubEnv('VITE_ENABLE_MOCKING', 'true')
  localStorage.setItem(
    'boxlite:card-verification-preview:user-1:org-1',
    JSON.stringify({ organizationName: 'Preview team', useCase: 'coding-agent', note: 'Saved' }),
  )
  await mount('/welcome?preview=card-verification')
  expect(host.textContent).toContain('Your agent.Its own Box.')
  expect(api.credits).not.toHaveBeenCalled()
})

it('ignores the preview query when mocking is disabled', async () => {
  api.profile.mockResolvedValue({ useCase: 'exploring', note: '' })
  await mount('/welcome?preview=card-verification')
  expect(host.textContent).not.toContain('3 Get credits')
  await click('Start quickstart')
  expect(api.credits).toHaveBeenCalledTimes(1)
  expect(host.textContent).toContain('Quickstart destination')
})

it('never enables the prototype in a production build even with the preview flag and query', async () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_ENABLE_MOCKING', 'true')
  api.profile.mockResolvedValue({ useCase: 'exploring', note: '' })
  await mount('/welcome?preview=card-verification')
  expect(host.textContent).not.toContain('3 Get credits')
  await click('Start quickstart')
  expect(api.credits).toHaveBeenCalledTimes(1)
})

it('remembers exploring from the credits step without granting or polling credit', async () => {
  vi.stubEnv('VITE_ENABLE_MOCKING', 'true')
  const key = 'boxlite:card-verification-preview:user-1:org-1'
  localStorage.setItem(
    key,
    JSON.stringify({ organizationName: 'Preview team', useCase: 'coding-agent', note: 'Saved' }),
  )
  await mount('/welcome?preview=card-verification')
  await vi.waitFor(async () => {
    await settle()
    expect(host.textContent).toContain('3 Get credits')
    expect(host.textContent).toContain('Explore with BoxLite')
  })
  await click('Explore with BoxLite')
  expect(host.textContent).toContain('Quickstart destination')
  expect(api.credits).not.toHaveBeenCalled()
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({
    organizationName: 'Preview team',
    useCase: 'coding-agent',
    note: 'Saved',
    creditGrantedAt: null,
    completedAt: expect.any(Number),
  })
  expect(localStorage.getItem('SkipOnboarding_user-1')).toBe('true')
  expect(localStorage.getItem('boxlite:welcome:user-1:org-1')).toBeNull()
  await act(async () => root.unmount())
  root = createRoot(host)
  await mount('/welcome?preview=card-verification')
  expect(host.textContent).toContain('Quickstart destination')
  expect(api.credits).not.toHaveBeenCalled()
})
