/* Copyright 2026 BoxLite AI · SPDX-License-Identifier: AGPL-3.0 */
import { http, HttpResponse } from 'msw'
import { MOCK_ORGANIZATION, MOCK_USER } from './fixtures'

/** Dev-only API fixtures. Production imports remain behind VITE_ENABLE_MOCKING. */
export function onboardingHandlers(api: string) {
  const read = (key: string) => JSON.parse(localStorage.getItem(`onboarding-fixture:${key}`) ?? 'null')
  const save = (key: string, value: unknown) => localStorage.setItem(`onboarding-fixture:${key}`, JSON.stringify(value))
  const terms = {
    termsVersion: '2026-10-10',
    privacyVersion: '2026-10-10',
    termsUrl: 'https://boxlite.ai/legal/terms',
    privacyUrl: 'https://boxlite.ai/legal/privacy',
  }
  const acceptanceKey = (org: unknown) => `terms:${org}:${MOCK_USER.sub}:${terms.termsVersion}:${terms.privacyVersion}`
  return [
    http.get(`${api}/organizations/:org/onboarding/terms`, ({ params }) =>
      HttpResponse.json({ ...terms, acceptedAt: read(acceptanceKey(params.org)) }),
    ),
    http.put(`${api}/organizations/:org/onboarding/setup`, async ({ request, params }) => {
      const input = (await request.json()) as {
        name: string
        accepted: boolean
        termsVersion: string
        privacyVersion: string
      }
      if (input.accepted !== true || !input.name?.trim() || input.name.length > 60)
        return HttpResponse.json(
          { message: 'Enter an organization name and accept the terms to continue.' },
          { status: 400 },
        )
      if (input.termsVersion !== terms.termsVersion || input.privacyVersion !== terms.privacyVersion)
        return HttpResponse.json(
          { message: 'The terms have changed. Reload this page to review the current version.' },
          { status: 409 },
        )
      const key = acceptanceKey(params.org)
      const acceptedAt = read(key) ?? new Date().toISOString()
      save(key, acceptedAt)
      MOCK_ORGANIZATION.name = input.name.trim()
      return HttpResponse.json({ ...terms, acceptedAt })
    }),
    http.patch(`${api}/organizations/:org/name`, async ({ request }) => {
      const { name } = (await request.json()) as { name: string }
      MOCK_ORGANIZATION.name = name
      return HttpResponse.json(MOCK_ORGANIZATION)
    }),
    http.get(`${api}/organizations/:org/onboarding`, ({ params }) => HttpResponse.json(read(`profile:${params.org}`))),
    http.put(`${api}/organizations/:org/onboarding`, async ({ request, params }) => {
      const input = (await request.json()) as object
      const value = { ...input, submittedBy: MOCK_USER.sub, submittedAt: new Date().toISOString() }
      save(`profile:${params.org}`, value)
      return HttpResponse.json(value)
    }),
    http.get(`${api}/organizations/:org/quickstart/prompt`, ({ params }) =>
      HttpResponse.json(read(`draft:${params.org}`)),
    ),
    http.put(`${api}/organizations/:org/quickstart/prompt`, async ({ request, params }) => {
      const input = (await request.json()) as { text: string; revision: number }
      const key = `draft:${params.org}`
      if (input.revision !== (read(key)?.revision ?? 0))
        return HttpResponse.json({ message: 'Draft changed' }, { status: 409 })
      const value = { text: input.text, revision: input.revision + 1, updatedAt: new Date().toISOString() }
      save(key, value)
      return HttpResponse.json(value)
    }),
    http.post(`${api}/organizations/:org/quickstart/handoffs`, async ({ request, params }) => {
      const input = (await request.json()) as { text: string; requestId: string }
      const key = `handoff:${params.org}:${input.requestId}`
      const existing = read(key)
      if (existing && existing.text !== input.text)
        return HttpResponse.json({ message: 'Request ID reused' }, { status: 409 })
      const value = existing ?? { ...input, copiedAt: null, createdAt: new Date().toISOString() }
      save(key, value)
      return HttpResponse.json(value)
    }),
    http.patch(`${api}/organizations/:org/quickstart/handoffs/:id/copied`, ({ params }) => {
      const key = `handoff:${params.org}:${params.id}`
      const value = read(key)
      if (!value) return HttpResponse.json({ message: 'Handoff not found' }, { status: 404 })
      value.copiedAt ??= new Date().toISOString()
      save(key, value)
      return HttpResponse.json(value)
    }),
  ]
}
