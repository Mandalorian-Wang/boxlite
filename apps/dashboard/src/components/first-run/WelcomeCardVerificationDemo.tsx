/* Copyright 2026 BoxLite AI · SPDX-License-Identifier: AGPL-3.0 */
import { useEffect, useState, type Ref } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { AsciiButton } from '@/components/ascii'
import { ArrowRightIcon, Check, CreditCardIcon, Loader2 } from '@/components/ui/icon'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useSelectedOrganization } from '@/hooks/useSelectedOrganization'
import { RoutePath } from '@/enums/RoutePath'
import { CARD_VERIFICATION_PREVIEW_KEY, type FirstRunUseCase } from '@/lib/first-run'
import WelcomeBoxIllustration from './WelcomeBoxIllustration'

const PURPOSE: Record<FirstRunUseCase, { heading: string; ending: string; description: string }> = {
  'coding-agent': {
    heading: 'Your agent.',
    ending: 'Its own Box.',
    description: 'Give your coding agent a place to write code, run tests, and get things done.',
  },
  'long-running-agent': {
    heading: 'Your agent.',
    ending: 'Its own Box.',
    description: 'Give your agent a dedicated environment for its tools, files, and long-running tasks.',
  },
  'code-execution': {
    heading: 'Your code.',
    ending: 'Room to run.',
    description: 'Run tests and CI jobs in an isolated Box, with the tools and dependencies you need.',
  },
  'browser-agent': {
    heading: 'Your browser.',
    ending: 'Its own Box.',
    description: 'Give your browser automation a Box to run in, from a single test to a complete workflow.',
  },
  'application-deployments': {
    heading: 'Your next app.',
    ending: 'Starts in a Box.',
    description: 'Give your agent a Box to build your app, run a server, and share a preview.',
  },
  'reinforcement-learning': {
    heading: 'Your experiments.',
    ending: 'Their own Boxes.',
    description: 'Give each experiment an isolated environment to run, evaluate, and iterate.',
  },
  exploring: {
    heading: 'Your next idea.',
    ending: 'Starts in a Box.',
    description: 'Run code, build with agents, or launch an app. Start with a Box and make it yours.',
  },
}

type Status = 'unverified' | 'verifying' | 'granting' | 'complete' | 'failed' | 'ineligible' | 'delayed'
type Progress = { status: Status; attempts: number; checks: number }
const statuses: Status[] = ['unverified', 'verifying', 'granting', 'complete', 'failed', 'ineligible', 'delayed']

function restore(key: string): Progress {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (
      saved &&
      statuses.includes(saved.status) &&
      Number.isSafeInteger(saved.attempts) &&
      saved.attempts >= 0 &&
      Number.isSafeInteger(saved.checks) &&
      saved.checks >= 0
    )
      return { ...saved, status: saved.status === 'verifying' ? 'unverified' : saved.status }
  } catch {
    /* Optional local preview progress. */
  }
  return { status: 'unverified', attempts: 0, checks: 0 }
}

/** Local-only payment interaction; never collects card details or contacts Stripe. */
export default function WelcomeCardVerificationDemo({
  onBack,
  useCase,
  illustrationRef,
}: {
  onBack: () => void
  useCase?: FirstRunUseCase | null
  illustrationRef?: Ref<HTMLDivElement>
}) {
  const { selectedOrganization } = useSelectedOrganization()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requestedScenario = params.get('card')
  const scenario = ['declined', 'used-card', 'delayed'].includes(requestedScenario ?? '') ? requestedScenario : null
  const key = `${CARD_VERIFICATION_PREVIEW_KEY}:${user?.profile.sub}:${selectedOrganization?.id}:card${scenario ? `:${scenario}` : ''}`
  const [progress, setProgress] = useState<Progress>(() => restore(key))
  const [open, setOpen] = useState(false)
  const [consent, setConsent] = useState(false)
  const { status } = progress
  const busy = status === 'verifying' || status === 'granting'
  const verified = ['granting', 'complete', 'delayed', 'ineligible'].includes(status)
  const purpose = PURPOSE[useCase ?? 'exploring']

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(progress))
    } catch {
      /* Preview remains usable without storage. */
    }
  }, [key, progress])

  useEffect(() => {
    if (!busy) return
    const timer = setTimeout(
      () => {
        setProgress((current) => ({
          ...current,
          status:
            current.status === 'verifying'
              ? scenario === 'declined' && current.attempts === 1
                ? 'failed'
                : scenario === 'used-card'
                  ? 'ineligible'
                  : 'granting'
              : scenario === 'delayed' && current.checks === 0
                ? 'delayed'
                : 'complete',
        }))
      },
      status === 'verifying' ? 1200 : 1500,
    )
    return () => clearTimeout(timer)
  }, [busy, status, scenario])

  return (
    <section aria-label="Card verification" className="grid gap-9 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      <div>
        <h1 className="text-[38px] font-medium leading-[1.08] tracking-[-0.045em] sm:text-[52px] lg:text-[58px]">
          {purpose.heading}
          <span className="block text-muted-foreground">{purpose.ending}</span>
        </h1>
        <p className="mt-5 max-w-[390px] text-[15px] leading-7 text-muted-foreground">{purpose.description}</p>
        <div ref={illustrationRef} className="mt-10 hidden max-w-[420px] lg:block">
          {illustrationRef ? <div className="aspect-[480/310]" /> : <WelcomeBoxIllustration />}
        </div>
      </div>

      <div className="border-t border-border pt-7 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-1">
        {status === 'ineligible' ? (
          <h2 className="text-page font-medium">Let’s check your eligibility.</h2>
        ) : (
          <>
            <p className="font-mono text-label text-muted-foreground">
              {status === 'complete' ? 'READY TO USE' : 'WELCOME CREDIT'}
            </p>
            <p className="mt-5 flex items-start tracking-[-0.06em]" aria-label="$100">
              <span aria-hidden className="mr-1.5 mt-2 text-[32px] font-normal leading-none sm:mt-3 sm:text-[40px]">
                $
              </span>
              <span aria-hidden className="text-[76px] font-medium leading-[0.95] sm:text-[96px]">
                100
              </span>
            </p>
            <h2 className="mt-3 text-em font-medium">
              {status === 'complete' ? 'Your credits are ready.' : 'in free BoxLite credits'}
            </h2>
          </>
        )}

        <p className="mt-7 text-sm leading-6 text-muted-foreground">
          {status === 'complete'
            ? 'Choose how you want to build. Your first Box is next.'
            : status === 'ineligible'
              ? 'This organization is not eligible for signup credits.'
              : verified
                ? 'Your card is verified. We’re getting your credits ready.'
                : 'Add a card to verify your account. Your credits will be added after verification.'}
        </p>

        {verified && (
          <div className="mt-5 flex items-center gap-2.5 text-xs">
            <Check className="size-4 text-brand" aria-hidden />
            <span>Visa ending in 4242</span>
            <span className="ml-auto text-muted-foreground">Verified</span>
          </div>
        )}

        <div aria-live="polite" className="text-sm leading-6 [&:not(:empty)]:mt-5">
          {busy && (
            <p role="status" className="flex items-center gap-2">
              <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
              {status === 'verifying' ? 'Verifying your card…' : 'Adding your credits…'}
            </p>
          )}
          {status === 'failed' && (
            <p role="alert" className="text-destructive">
              Your card could not be verified. Try again or use another card.
            </p>
          )}
          {status === 'ineligible' && (
            <p role="alert">
              This card has already been used for signup credits. Contact support if you think this is a mistake.
            </p>
          )}
          {status === 'delayed' && (
            <p role="status">
              Your card is verified. Credits are taking longer than expected. You don’t need to add your card again.
            </p>
          )}
        </div>

        <div className="mt-7 flex flex-col items-stretch gap-4">
          {status === 'complete' ? (
            <AsciiButton
              variant="primary"
              className="flex h-12 items-center justify-between px-5 font-display text-sm"
              onClick={() => navigate(RoutePath.QUICKSTART)}
            >
              Start quickstart <ArrowRightIcon aria-hidden className="size-4" />
            </AsciiButton>
          ) : status === 'ineligible' ? (
            <a href="mailto:support@boxlite.ai" className="text-sm underline underline-offset-4">
              Contact support
            </a>
          ) : status === 'delayed' ? (
            <AsciiButton
              variant="primary"
              className="h-12 px-5 font-display text-sm"
              onClick={() => setProgress((current) => ({ ...current, status: 'granting', checks: current.checks + 1 }))}
            >
              Check again
            </AsciiButton>
          ) : (
            <AsciiButton
              variant="primary"
              disabled={busy}
              className="flex h-12 items-center justify-between px-5 font-display text-sm"
              onClick={() => {
                setConsent(false)
                setOpen(true)
              }}
            >
              <span className="flex items-center gap-2.5">
                {!busy && <CreditCardIcon aria-hidden className="size-4 shrink-0" />}
                {busy ? 'Please wait…' : status === 'failed' ? 'Try again' : 'Verify card & continue'}
              </span>
              {!busy && <ArrowRightIcon aria-hidden className="size-4" />}
            </AsciiButton>
          )}
        </div>

        {!verified && (
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            No verification fee.
            <br />
            No paid plan is activated.
          </p>
        )}
        {status !== 'complete' && (
          <div className="mt-8 border-t border-border pt-4">
            {!verified && (
              <p className="text-[11px] leading-5 text-muted-foreground">
                Your bank may show a temporary authorization.
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={onBack}
              className="mt-3 py-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-40"
            >
              Back
            </button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="font-display sm:max-w-[440px]">
          <DialogTitle>Save your card</DialogTitle>
          <DialogDescription>Test payment flow. No card details are sent.</DialogDescription>
          <div className="mt-2 border border-border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Card number</span>
              <span className="font-mono">TEST CARD</span>
            </div>
            <p className="mt-2 font-mono text-sm">4242 4242 4242 4242</p>
            <div className="mt-4 flex gap-12 text-xs">
              <span>
                <span className="text-muted-foreground">Expiry</span>
                <span className="mt-1 block font-mono">12 / 30</span>
              </span>
              <span>
                <span className="text-muted-foreground">CVC</span>
                <span className="mt-1 block font-mono">•••</span>
              </span>
            </div>
          </div>
          <label className="my-2 flex items-start gap-2.5 text-sm leading-5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 accent-foreground"
            />
            I agree to save this card for this organization.
          </label>
          <div className="flex justify-end gap-3">
            <AsciiButton onClick={() => setOpen(false)}>Cancel</AsciiButton>
            <AsciiButton
              variant="primary"
              disabled={!consent}
              onClick={() => {
                setOpen(false)
                setProgress((current) => ({ ...current, status: 'verifying', attempts: current.attempts + 1 }))
              }}
            >
              Save card
            </AsciiButton>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
