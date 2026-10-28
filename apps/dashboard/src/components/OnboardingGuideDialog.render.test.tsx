// @vitest-environment jsdom
/*
 * Modified by BoxLite AI, 2026
 * SPDX-License-Identifier: AGPL-3.0
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnboardingGuideDialog } from './OnboardingGuideDialog'
import { quickstartRecipeFor } from '@/lib/quickstart/recipes'

const mocks = vi.hoisted(() => ({
  saveDraft: vi.fn(async (_org, text, revision) => ({ text, revision: revision + 1 })),
  handoff: vi.fn(async () => ({})),
  markCopied: vi.fn(async () => ({})),
  copy: vi.fn(async () => true),
  createApiKey: vi.fn(),
  listBoxes: vi.fn(),
  hasPermission: vi.fn(() => true),
}))

vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ resolvedTheme: 'dark' }) }))
vi.mock('@/lib/copy-text', () => ({ copyToClipboard: mocks.copy }))

vi.mock('@/hooks/useApi', () => ({
  useApi: () => ({
    savePromptDraft: mocks.saveDraft,
    preparePromptHandoff: mocks.handoff,
    markPromptCopied: mocks.markCopied,
    apiKeyApi: { createApiKey: mocks.createApiKey },
    boxApi: { listBoxesPaginated: mocks.listBoxes },
  }),
}))
vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({ apiUrl: 'https://api.test', oidc: { issuer: 'https://auth.test' } }),
}))
vi.mock('@/hooks/useSelectedOrganization', () => ({
  useSelectedOrganization: () => ({
    selectedOrganization: { id: 'org-1', name: 'Org' },
    organizationMembers: [{ id: 'member-1' }],
    refreshOrganizationMembers: vi.fn(),
    authenticatedUserHasPermission: mocks.hasPermission,
  }),
}))
vi.mock('react-oidc-context', () => ({ useAuth: () => ({ user: { profile: { sub: 'user-1' } } }) }))
// The handoff screen polls for boxes; this test is about the other tab.
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ setQueryData: vi.fn() }),
  useQuery: ({ queryKey }) => (queryKey[0] === 'quickstart-prompt' ? { data: null, isSuccess: true } : { data: [] }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

let root: Root | null = null

function flush() {
  return act(async () => {
    await Promise.resolve()
  })
}

function tabNamed(label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((t) =>
    (t.textContent ?? '').includes(label),
  )
}

// Radix activates a tab on `mousedown`, so a bare click never switched panels.
async function click(el: HTMLElement | undefined) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  mocks.listBoxes.mockReset()
  sessionStorage.clear()
  mocks.createApiKey.mockResolvedValue({ data: { name: 'sdk-quickstart', value: 'blk_live_theOnlyCopy' } })
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('OnboardingGuideDialog tabs', () => {
  it('renders SDK and editable local-agent handoff inline without a dialog or second scenario picker', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const progress = vi.fn()
    mocks.listBoxes.mockResolvedValue({ data: { items: [] } })
    const renderMethod = async (method: 'sdk' | 'prompt') => {
      await act(async () => {
        root ??= createRoot(host)
        root.render(
          <OnboardingGuideDialog
            inline
            open
            onOpenChange={() => {}}
            onProgressChange={progress}
            progress={{ boxCreated: false, sdkConnected: false }}
            preview={{
              inline: true,
              recipe: quickstartRecipeFor(method === 'sdk' ? 'code-execution' : 'application-deployments'),
              onRecipeChange: () => {},
              onConsole: () => {},
              creditCents: 10000,
            }}
          />,
        )
      })
      await flush()
    }
    await renderMethod('sdk')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector('[aria-label="Quickstart action"]')).toBeNull()
    expect(document.body.textContent).toContain('Create key')
    expect(document.body.textContent).toContain('pip install boxlite')
    expect(document.body.textContent).toContain('Hello from BoxLite')
    expect([...document.querySelectorAll('h2')].map((item) => item.textContent)).toEqual([
      '1. Get an API key',
      '2. Choose your SDK or CLI',
      '3. Create a Box',
      '4. Run code',
    ])
    expect(document.querySelector('select')).toBeNull()
    const cliButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === 'CLI',
    )!
    await click(cliButton)
    expect(cliButton.getAttribute('data-state')).toBe('active')
    expect(document.body.textContent).toContain('boxlite create --name')
    expect(document.body.textContent).toContain('boxlite exec "$box_name"')
    expect(document.body.textContent).not.toContain('Next →')
    await renderMethod('prompt')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    const request = document.querySelector<HTMLTextAreaElement>('[aria-label="Application request"]')!
    expect(request).not.toBeNull()
    expect(request.value).toBe('')
    expect(document.querySelector('details')?.open).toBe(false)
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('button')].find((item) =>
        item.textContent?.includes('Copy prompt'),
      )?.disabled,
    ).toBe(true)
    const agents = document.querySelector('[aria-label="Local coding agents"]')!
    expect(agents.querySelector('button')).toBeNull()
    for (const label of ['Grok', 'Hermes', 'Pi']) expect(agents.querySelector(`[title="${label}"]`)).not.toBeNull()
    expect(agents.querySelectorAll('svg, img')).toHaveLength(8)
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        request,
        'Build an inventory dashboard.',
      )
      request.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flush()
    expect(document.querySelector('pre')?.textContent).toContain('Application request: Build an inventory dashboard.')
    expect(document.querySelector('pre')?.textContent).not.toContain('blk_live_theOnlyCopy')
    expect(document.body.textContent).not.toContain('waiting for your agent')
    const copyButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === 'Copy prompt',
    )
    expect(copyButton).toBeDefined()
    await click(copyButton)
    expect(mocks.copy).toHaveBeenCalledWith(
      expect.stringContaining('Application request: Build an inventory dashboard.'),
    )
    expect(mocks.handoff).toHaveBeenCalledWith('org-1', 'Build an inventory dashboard.', expect.any(String))
    expect(mocks.markCopied).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).toContain('Prompt copied. Continue in your coding agent.')
    await click(
      [...document.querySelectorAll<HTMLButtonElement>('button')].find(
        (item) => item.textContent?.trim() === 'API service',
      ),
    )
    expect(document.body.textContent).not.toContain('Prompt copied. Continue in your coding agent.')
    mocks.copy.mockResolvedValueOnce(false)
    await click(
      [...document.querySelectorAll<HTMLButtonElement>('button')].find(
        (item) => item.textContent?.trim() === 'Copy prompt',
      ),
    )
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Could not save or copy')
    expect(document.body.textContent).not.toContain('Prompt copied.')
    expect(progress).not.toHaveBeenCalled()
  })

  it('offers two actions instead of asking the user to choose their use case again', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    await act(async () => {
      root = createRoot(host)
      root.render(
        <OnboardingGuideDialog
          open
          onOpenChange={() => {}}
          onProgressChange={() => {}}
          progress={{ boxCreated: false, sdkConnected: false }}
          preview={{
            recipe: quickstartRecipeFor('code-execution'),
            onRecipeChange: () => {},
            onConsole: () => {},
            creditCents: 10000,
          }}
        />,
      )
    })
    await flush()
    const buttons = [...document.querySelectorAll('button')].map((button) => button.textContent?.trim())
    expect(buttons).toContain('Run code')
    expect(buttons).toContain('Build an app')
    expect(document.querySelector('[aria-label="Quickstart use case"]')).toBeNull()
    expect(document.querySelector('[aria-label="Example"]')).toBeNull()
  })

  it('keeps execution focused on Hello World and preserves the key and interface across actions', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const renderRecipe = async (id: string) => {
      await act(async () => {
        root ??= createRoot(host)
        root.render(
          <OnboardingGuideDialog
            open
            onOpenChange={() => {}}
            onProgressChange={() => {}}
            progress={{ boxCreated: false, sdkConnected: false }}
            preview={{
              recipe: quickstartRecipeFor(id),
              onRecipeChange: () => {},
              onConsole: () => {},
              creditCents: 10000,
            }}
          />,
        )
      })
      await flush()
    }
    const button = (text: string) =>
      [...document.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.trim() === text)
    await renderRecipe('code-execution')
    await click(button('Create key'))
    await click(button('Copied · Next →'))
    for (const name of ['Python', 'Node', 'Go', 'Rust', 'C', 'CLI', 'REST']) expect(button(name)).toBeDefined()
    await click(button('CLI'))
    await renderRecipe('application-deployments')
    await renderRecipe('code-execution')
    expect(button('CLI')?.getAttribute('aria-pressed')).toBe('true')
    await click(button('Installed · Next →'))
    expect(document.querySelector('[aria-label="Example"]')).toBeNull()
    expect(document.body.textContent).not.toContain('More examples')
    expect(document.body.textContent).not.toContain('Example:')
    expect(document.body.textContent).toContain('Hello from BoxLite')
    expect(document.body.textContent).toContain('blk_live_theOnlyCopy')
    expect(mocks.createApiKey).toHaveBeenCalledTimes(1)
  })

  it('keeps a created key when the user looks at the other job and comes back', async () => {
    // The plaintext key is returned exactly once. Changing tabs used to reset
    // the walkthrough, so this round trip discarded it for good and left a
    // live key in the account that the user never saw.
    const host = document.createElement('div')
    document.body.appendChild(host)
    await act(async () => {
      root = createRoot(host)
      root.render(<OnboardingGuideDialog open onOpenChange={() => {}} onProgressChange={() => {}} />)
    })
    await flush()

    await click(tabNamed('Run untrusted code'))
    const createKey = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => (b.textContent ?? '').trim() === 'Create key',
    )
    await click(createKey)
    expect(document.body.textContent).toContain('blk_live_theOnlyCopy')

    await click(tabNamed('Build an app online'))
    await click(tabNamed('Run untrusted code'))

    expect(document.body.textContent).toContain('blk_live_theOnlyCopy')
    expect(mocks.createApiKey).toHaveBeenCalledTimes(1)
  })
})
