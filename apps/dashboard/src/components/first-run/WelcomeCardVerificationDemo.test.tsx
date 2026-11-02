// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import WelcomeCardVerificationDemo from './WelcomeCardVerificationDemo'

vi.mock('react-oidc-context', () => ({ useAuth: () => ({ user: { profile: { sub: 'user-1' } } }) }))
vi.mock('@/hooks/useSelectedOrganization', () => ({
  useSelectedOrganization: () => ({ selectedOrganization: { id: 'org-1' } }),
}))
const KEY = 'boxlite:card-verification-preview:user-1:org-1:card'
let root: Root, host: HTMLDivElement
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  sessionStorage.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  sessionStorage.clear()
  vi.useRealTimers()
})
async function mount(scenario = '') {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[`/welcome?card=${scenario}`]}>
        <Routes>
          <Route path="/welcome" element={<WelcomeCardVerificationDemo onBack={() => {}} />} />
          <Route path="/dashboard/quickstart" element={<p>Quickstart destination</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}
function button(name: string) {
  return [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === name)!
}
async function click(name: string) {
  await act(async () => button(name).click())
}
async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTime(ms))
}
async function verify(action = 'Verify card & continue') {
  await click(action)
  expect(button('Save card').disabled).toBe(true)
  await act(async () => document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
  await click('Save card')
}

it('requires consent, verifies first, and exposes Quickstart only after credits arrive', async () => {
  await mount()
  expect(button('Start quickstart')).toBeUndefined()
  await verify()
  expect(host.textContent).toContain('Verifying your card…')
  expect(host.textContent).not.toContain('Your credits are ready.')
  await advance(1200)
  expect(host.textContent).toContain('Adding your credits…')
  expect(button('Start quickstart')).toBeUndefined()
  await advance(1500)
  expect(host.textContent).toContain('Your credits are ready.')
  await click('Start quickstart')
  expect(host.textContent).toContain('Quickstart destination')
})

it('cancelling card entry does not verify or grant credit', async () => {
  await mount()
  await click('Verify card & continue')
  await click('Cancel')
  await advance(10000)
  expect(JSON.parse(sessionStorage.getItem(KEY)!).status).toBe('unverified')
  expect(button('Start quickstart')).toBeUndefined()
})

it('allows retry after a declined verification without granting on failure', async () => {
  await mount('declined')
  await verify()
  await advance(1200)
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('could not be verified')
  expect(button('Start quickstart')).toBeUndefined()
  await verify('Try again')
  await advance(1200)
  await advance(1500)
  expect(host.textContent).toContain('Your credits are ready.')
})

it('never grants a second trial for an ineligible card', async () => {
  await mount('used-card')
  await verify()
  await advance(1200)
  await advance(10000)
  expect(host.textContent).toContain('already been used for signup credits')
  expect(button('Start quickstart')).toBeUndefined()
  expect(JSON.parse(sessionStorage.getItem(`${KEY}:used-card`)!).status).toBe('ineligible')
})

it('rechecks delayed credit without repeating card verification and restores completion', async () => {
  await mount('delayed')
  await verify()
  await advance(1200)
  await advance(1500)
  expect(host.textContent).toContain('Credits are taking longer')
  await click('Check again')
  await advance(1500)
  expect(host.textContent).toContain('Your credits are ready.')
  expect(JSON.parse(sessionStorage.getItem(`${KEY}:delayed`)!).attempts).toBe(1)
  await act(async () => root.unmount())
  root = createRoot(host)
  await mount('delayed')
  expect(host.textContent).toContain('Your credits are ready.')
  expect(button('Verify card & continue')).toBeUndefined()
})

it('does not complete an interrupted verification after unmount', async () => {
  await mount()
  await verify()
  await act(async () => root.unmount())
  await advance(10000)
  expect(JSON.parse(sessionStorage.getItem(KEY)!).status).toBe('verifying')
  root = createRoot(host)
  await mount()
  expect(button('Verify card & continue')).toBeDefined()
  expect(button('Start quickstart')).toBeUndefined()
})
