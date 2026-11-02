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
  expect(button(name), `Expected the ${name} action to be available`).toBeDefined()
  await act(async () => button(name).click())
}
async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTime(ms))
}
async function verify(action = 'Verify card & claim $100') {
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
  await click('Verify card & claim $100')
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
  expect(button('Verify card & claim $100')).toBeUndefined()
})

it('does not complete an interrupted verification after unmount', async () => {
  await mount()
  await verify()
  await act(async () => root.unmount())
  await advance(10000)
  expect(JSON.parse(sessionStorage.getItem(KEY)!).status).toBe('verifying')
  root = createRoot(host)
  await mount()
  expect(button('Verify card & claim $100')).toBeDefined()
  expect(button('Start quickstart')).toBeUndefined()
})

async function redeem(code: string) {
  const field = host.querySelector<HTMLInputElement>('#welcome-promo-code')!
  expect(field, 'Expected an inline promo-code field').not.toBeNull()
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, code)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => field.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
}

it('lets users explore without card verification or a credit grant', async () => {
  await mount()
  expect(host.textContent).toContain('You’ll need credits to create a Box.')
  await click('Explore with BoxLite')
  expect(host.textContent).toContain('Quickstart destination')
  expect(JSON.parse(sessionStorage.getItem(KEY)!)).toMatchObject({ status: 'unverified', attempts: 0 })
})

it('redeems the promo amount without fabricating a verified card and restores it once', async () => {
  await mount()
  await redeem(' boxlite20 ')
  expect(host.textContent).toContain('Redeeming your code…')
  await advance(800)
  expect(host.querySelector('[aria-label="$20"]')).not.toBeNull()
  expect(host.querySelector('[aria-label="$100"]')).toBeNull()
  expect(host.textContent).toContain('Promo code redeemed')
  expect(host.textContent).not.toContain('Visa ending')
  expect(host.querySelector('#welcome-promo-code')).toBeNull()
  await act(async () => root.unmount())
  root = createRoot(host)
  await mount()
  expect(host.querySelector('[aria-label="$20"]')).not.toBeNull()
  expect(button('Verify card & claim $100')).toBeUndefined()
  await click('Start quickstart')
  expect(host.textContent).toContain('Quickstart destination')
})

it.each([
  ['', 'Enter a promo code.'],
  ['UNKNOWN', 'This promo code is not valid.'],
  ['EXPIRED20', 'This promo code has expired.'],
  ['USED20', 'This promo code has already been redeemed.'],
])('refuses promo %j without granting credits or hiding alternatives', async (code, message) => {
  await mount()
  await redeem(code)
  expect(host.querySelector('[role="alert"]')?.textContent).toBe(message)
  expect(host.querySelector<HTMLInputElement>('#welcome-promo-code')!.value).toBe(code)
  expect(button('Verify card & claim $100').disabled).toBe(false)
  expect(button('Explore with BoxLite').disabled).toBe(false)
  expect(JSON.parse(sessionStorage.getItem(KEY)!).status).toBe('unverified')
})

it('allows a promo after an ineligible card without re-verifying', async () => {
  await mount('used-card')
  await verify()
  await advance(1200)
  expect(button('Explore with BoxLite').disabled).toBe(false)
  await redeem('BOXLITE20')
  await advance(800)
  expect(host.querySelector('[aria-label="$20"]')).not.toBeNull()
  expect(host.textContent).not.toContain('Visa ending')
  expect(JSON.parse(sessionStorage.getItem(`${KEY}:used-card`)!).attempts).toBe(1)
})

it('can leave during verification without completing an interrupted grant', async () => {
  await mount()
  await verify()
  await click('Explore with BoxLite')
  await advance(10000)
  expect(host.textContent).toContain('Quickstart destination')
  expect(JSON.parse(sessionStorage.getItem(KEY)!).status).toBe('verifying')
})
