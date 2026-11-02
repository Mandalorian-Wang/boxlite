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

type Status = 'unverified' | 'verifying' | 'granting' | 'redeeming' | 'complete' | 'failed' | 'ineligible' | 'delayed'
type Progress = { status: Status; attempts: number; checks: number; source?: 'promo'; amountCents?: number }
const statuses: Status[] = [
  'unverified',
  'verifying',
  'granting',
  'redeeming',
  'complete',
  'failed',
  'ineligible',
  'delayed',
]

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
      return {
        status: saved.status === 'verifying' ? 'unverified' : saved.status,
        attempts: saved.attempts,
        checks: saved.checks,
        ...(saved.source === 'promo' && saved.amountCents === 2000 ? { source: 'promo', amountCents: 2000 } : {}),
      }
  } catch {
    /* Optional local preview progress. */
  }
  return { status: 'unverified', attempts: 0, checks: 0 }
}

/** Local-only payment interaction; never collects card details or contacts Stripe. */
export default function WelcomeCardVerificationDemo({
  onBack,
  onContinue,
  useCase,
  illustrationRef,
}: {
  onBack: () => void
  onContinue?: (hasCredits: boolean) => void
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
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState<string | null>(null)
  const { status } = progress
  const busy = status === 'verifying' || status === 'granting' || status === 'redeeming'
  const verified = progress.source !== 'promo' && ['granting', 'complete', 'delayed', 'ineligible'].includes(status)
  const amount = status === 'complete' && progress.source === 'promo' ? progress.amountCents! / 100 : 100
  const purpose = PURPOSE[useCase ?? 'exploring']
  const enterConsole = () => {
    onContinue?.(status === 'complete')
    navigate(RoutePath.QUICKSTART)
  }

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
            current.status === 'redeeming'
              ? 'complete'
              : current.status === 'verifying'
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
      status === 'redeeming' ? 800 : status === 'verifying' ? 1200 : 1500,
    )
    return () => clearTimeout(timer)
  }, [busy, status, scenario])

  return (
    <section aria-label="Get credits" className="grid gap-9 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
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
            <p className="mt-5 flex items-start tracking-[-0.06em]" aria-label={`$${amount}`}>
              <span aria-hidden className="mr-1.5 mt-2 text-[32px] font-normal leading-none sm:mt-3 sm:text-[40px]">
                $
              </span>
              <span aria-hidden className="text-[76px] font-medium leading-[0.95] sm:text-[96px]">
                {amount}
              </span>
            </p>
            <h2 className="mt-3 text-em font-medium">
              {status === 'complete' ? 'Your credits are ready.' : 'in free BoxLite credits'}
            </h2>
          </>
        )}

        {(status === 'complete' || verified) && (
          <p className="mt-7 text-sm leading-6 text-muted-foreground">
            {status === 'complete'
              ? 'Choose how you want to build. Your first Box is next.'
              : status === 'ineligible'
                ? 'This organization is not eligible for signup credits.'
                : 'Your card is verified. We’re getting your credits ready.'}
          </p>
        )}

        {verified && (
          <div className="mt-5 flex items-center gap-2.5 text-xs">
            <Check className="size-4 text-brand" aria-hidden />
            <span>Visa ending in 4242</span>
            <span className="ml-auto text-muted-foreground">Verified</span>
          </div>
        )}

        {status === 'complete' && progress.source === 'promo' && (
          <p className="mt-5 flex items-center gap-2.5 text-xs">
            <Check className="size-4 text-brand" aria-hidden />
            Promo code redeemed
          </p>
        )}

        <div aria-live="polite" className="text-sm leading-6 [&:not(:empty)]:mt-5">
          {busy && (
            <p role="status" className="flex items-center gap-2">
              <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
              {status === 'redeeming'
                ? 'Redeeming your code…'
                : status === 'verifying'
                  ? 'Verifying your card…'
                  : 'Adding your credits…'}
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
              onClick={enterConsole}
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
                {busy ? 'Please wait…' : status === 'failed' ? 'Try again' : 'Verify card & claim $100'}
              </span>
              {!busy && <ArrowRightIcon aria-hidden className="size-4" />}
            </AsciiButton>
          )}
        </div>

        {!verified && status !== 'complete' && (
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            No verification fee. No paid plan is activated.
          </p>
        )}
        {status !== 'complete' && (
          <>
            <div className="mt-6">
              <div aria-hidden="true" className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <form
                className="mt-5"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  if (busy) return
                  const code = promoCode.trim().toUpperCase()
                  const error = !code
                    ? 'Enter a promo code.'
                    : code === 'EXPIRED20'
                      ? 'This promo code has expired.'
                      : code === 'USED20'
                        ? 'This promo code has already been redeemed.'
                        : code !== 'BOXLITE20'
                          ? 'This promo code is not valid.'
                          : null
                  setPromoError(error)
                  if (error) return
                  setProgress((current) => ({ ...current, status: 'redeeming', source: 'promo', amountCents: 2000 }))
                }}
              >
                <label htmlFor="welcome-promo-code" className="mb-2 block text-xs text-muted-foreground">
                  Promo code
                </label>
                <div className="flex gap-2">
                  <input
                    id="welcome-promo-code"
                    value={promoCode}
                    onChange={(event) => {
                      setPromoCode(event.target.value)
                      setPromoError(null)
                    }}
                    placeholder="Enter your code"
                    maxLength={64}
                    disabled={busy}
                    spellCheck={false}
                    autoComplete="off"
                    aria-invalid={!!promoError}
                    aria-describedby={promoError ? 'welcome-promo-error' : undefined}
                    className="h-11 min-w-0 flex-1 border border-border bg-background px-3 font-mono text-sm outline-none focus:border-foreground disabled:opacity-50"
                  />
                  <AsciiButton type="submit" disabled={busy} className="h-11 px-4 font-display text-sm">
                    Redeem
                  </AsciiButton>
                </div>
                {promoError && (
                  <p id="welcome-promo-error" role="alert" className="mt-2 text-xs text-destructive">
                    {promoError}
                  </p>
                )}
              </form>
            </div>
            <div className="mt-6 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onBack}
                  className="py-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={enterConsole}
                  className="flex items-center gap-2 py-2 text-sm underline-offset-4 hover:underline"
                >
                  Explore with BoxLite <ArrowRightIcon aria-hidden className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-right text-xs leading-5 text-muted-foreground">
                You’ll need credits to create a Box.
              </p>
            </div>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="font-display sm:max-w-[440px]">
          <DialogTitle>Save your card</DialogTitle>
          <DialogDescription>Test payment flow. No card details are sent.</DialogDescription>
          <p className="text-xs leading-5 text-muted-foreground">Your bank may show a temporary authorization.</p>
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
