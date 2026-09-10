/*
 * Copyright 2025 BoxLite AI
 * SPDX-License-Identifier: AGPL-3.0
 */

// PROTOTYPE — not shippable. Every figure below is invented in this file; there
// is no referral service. Built to test the interaction, not the plumbing.
// Switch states with ?proto=empty | first | active.

import { AsciiButton, AsciiChip, BRAND, Metric, Panel, PanelNote, SectionTitle, StatusMark } from '@/components/ascii'
import { Input } from '@/components/ui/input'
import { Pencil } from '@/components/ui/icon'
import { boxHourlyPrice } from '@/lib/box-price'
import { useUsagePricesQuery } from '@/hooks/queries/useUsagePricesQuery'
import { formatAmount } from '@/lib/utils'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

type ReferralStatus = 'earned' | 'voided'

type ReferralRow = {
  id: string
  signedUpAt: string
  who: string
  status: ReferralStatus
  rewardCents: number
  /** Why a reward was taken back. Silence here is what breaks trust. */
  voidReason?: string
}

const STATUS_LABEL: Record<ReferralStatus, { text: string; tone: 'ok' | 'bad' }> = {
  earned: { text: 'Credited', tone: 'ok' },
  voided: { text: 'Reversed', tone: 'bad' },
}

const SCENARIOS = {
  empty: { rows: [] as ReferralRow[], label: 'No referrals yet' },
  first: {
    label: 'First one in',
    rows: [
      { id: '1', signedUpAt: 'Aug 21', who: 'k***@outlook.com', status: 'earned', rewardCents: 1000 },
    ] as ReferralRow[],
  },
  active: {
    label: 'Earning',
    rows: [
      { id: '1', signedUpAt: 'Jun 02', who: 'l***@gmail.com', status: 'earned', rewardCents: 1000 },
      { id: '2', signedUpAt: 'Jun 27', who: 'd***@fastmail.com', status: 'earned', rewardCents: 1000 },
      { id: '3', signedUpAt: 'Jul 14', who: 'y***@qq.com', status: 'earned', rewardCents: 1000 },
      {
        id: '4',
        signedUpAt: 'Jul 30',
        who: 'r***@gmail.com',
        status: 'voided',
        rewardCents: 1000,
        voidReason: 'flagged as a duplicate account',
      },
      { id: '5', signedUpAt: 'Aug 18', who: 'm***@gmail.com', status: 'earned', rewardCents: 1000 },
      { id: '6', signedUpAt: 'Aug 21', who: 'k***@outlook.com', status: 'earned', rewardCents: 1000 },
    ] as ReferralRow[],
  },
}

type ScenarioKey = keyof typeof SCENARIOS

const REWARD_CENTS = 1_000

/** The size the create-box dialog opens on, so the comparison is one a user has seen. */
const SMALL_BOX = { cpu: 1, memory: 1, disk: 10 }

/**
 * Server-issued in the real thing. Ambiguous glyphs (0/O, 1/I) are left out —
 * these get read aloud and typed from memory.
 */
function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function tally(rows: ReferralRow[]) {
  const signups = rows.length
  const earnedCents = rows.filter((r) => r.status === 'earned').reduce((sum, r) => sum + r.rewardCents, 0)
  return { signups, earnedCents }
}

const ROW = 'grid grid-cols-[92px_minmax(0,1fr)_170px_90px] items-center gap-x-4'

/**
 * Shared with the tab badge, so the two can never print different numbers.
 *
 * Reads the query string directly rather than through useSearchParams: the tab
 * strip renders in Billing's own layout tests, which mount the page without a
 * Router, and prototype scaffolding has no business adding that requirement.
 */
export function useReferralEarnedCents(): number {
  const scenario = (new URLSearchParams(globalThis.location?.search ?? '').get('proto') as ScenarioKey) || 'active'
  return tally((SCENARIOS[scenario] ?? SCENARIOS.active).rows).earnedCents
}

async function copyValue(value: string, label: string) {
  await navigator.clipboard.writeText(value)
  toast.success(`${label} copied`)
}

export function ReferralsSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scenario = (searchParams.get('proto') as ScenarioKey) || 'active'
  const rows = (SCENARIOS[scenario] ?? SCENARIOS.active).rows

  const [code, setCode] = useState(() => randomCode())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(code)
  const [email, setEmail] = useState('')

  const { signups, earnedCents } = tally(rows)
  const copy = copyValue
  const { data: prices } = useUsagePricesQuery()
  const smallBox = boxHourlyPrice(prices, SMALL_BOX)
  const hoursPerReward = smallBox ? Math.round(REWARD_CENTS / smallBox.totalCents) : null
  const link = `boxlite.ai/?ref=${code}`
  // A bare URL makes the sender write the pitch. Handing over a sendable line
  // is the difference between "I'll do it later" and a paste.
  const shareText = `I've been building my agents & applications in BoxLite Cloud. Sign up with my link: https://${link}`

  return (
    <div className="flex flex-col gap-8">
      {/* Tokens, not taste.
          An earlier pass invented 10.5 / 11.5 / 14 / 15 / 17 / 19px type and a
          left-rule brand band, none of which exist anywhere else in the app —
          which is why it read as foreign even in the right typeface. Sizes here
          come from the scale the rest of billing uses (9/10/11/12/13, and the
          Metric primitive for figures); the callout matches the one in
          CreateApiKeyDialog.

          No width cap of its own: the other three tabs run to the shared
          billing container, and a narrower Referrals made the layout jump on
          every tab switch and stranded the column against the left edge of a
          centred page. */}
      <div className="flex flex-col gap-3 border border-brand/25 bg-brand/[0.06] px-[18px] py-4">
        <span className="font-mono text-[13px] leading-relaxed text-foreground">
          Earn <span className="text-[26px] font-semibold tracking-tight">{formatAmount(REWARD_CENTS)}</span> every time
          a developer signs up with your link
        </span>
        <span className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          Instantly, straight into your wallet. No cap.
          {hoursPerReward
            ? ` Ten sign-ups is ${formatAmount(REWARD_CENTS * 10)} — about ${(hoursPerReward * 10).toLocaleString()} hours of a small box.`
            : ''}
        </span>
      </div>

      <section>
        <SectionTitle title="Share your link" />
        <Panel className="px-[22px] py-5">
          {/* The link spans, because a bordered field filling the row is a
              shape people read as "copy me". The earlier gap was not caused by
              stretching but by bare text with a distant button and nothing
              between them; shrinking the text only moved the hole. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground">
              {link}
            </span>
            <AsciiButton variant="primary" className="shrink-0" onClick={() => copy(shareText, 'Invitation')}>
              Copy invitation
            </AsciiButton>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 font-mono text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={() => copy(code, 'Code')}
              className="transition-colors hover:text-foreground"
            >
              or code {code}
            </button>
            <button
              type="button"
              aria-label="Edit referral code"
              onClick={() => setEditing(true)}
              className="transition-colors hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>

          {editing && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Input
                value={draft}
                autoFocus
                onChange={(event) => setDraft(event.target.value.toUpperCase())}
                className="h-9 w-[200px] font-mono text-[13px]"
              />
              <AsciiButton
                variant="primary"
                onClick={() => {
                  setCode(draft || code)
                  setEditing(false)
                  toast.success('Referral code updated')
                }}
              >
                Save
              </AsciiButton>
              <AsciiButton
                onClick={() => {
                  setDraft(code)
                  setEditing(false)
                }}
              >
                Cancel
              </AsciiButton>
              <span className="font-mono text-[11px] text-muted-foreground">Your old link stops working.</span>
            </div>
          )}
        </Panel>
      </section>

      <section>
        <SectionTitle title="Invite by email" />
        <Panel className="px-[22px] py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={email}
              placeholder="their@email.com"
              onChange={(event) => setEmail(event.target.value)}
              className="h-9 min-w-0 flex-1 font-mono text-[13px]"
            />
            <AsciiButton
              variant="primary"
              className="shrink-0"
              disabled={!email.includes('@')}
              onClick={() => {
                toast.success(`Invitation sent to ${email}`)
                setEmail('')
              }}
            >
              Send invite
            </AsciiButton>
          </div>
          <PanelNote>They get your link and a short note about BoxLite</PanelNote>
        </Panel>
      </section>

      <section>
        <SectionTitle title="Your results" />
        <Panel>
          {/* Same figure row the plan overview uses — fixed gaps, not thirds of
              the panel, so three short values do not sit in three wide voids. */}
          <div className="grid grid-cols-2 gap-5 px-[22px] py-5 sm:flex sm:flex-row sm:gap-14">
            <Metric label="Earned" value={formatAmount(earnedCents)} sub="paid into your wallet" />
            <Metric label="Signed up" value={String(signups)} sub={signups === 1 ? 'developer' : 'developers'} />
          </div>
        </Panel>
      </section>

      <section>
        <SectionTitle title="Referral history" />
        <Panel>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-12 text-center">
              <div className="flex size-11 items-center justify-center border border-border bg-card">
                <span className="font-mono text-[13px]" style={{ color: BRAND }}>
                  ↗
                </span>
              </div>
              <div className="font-mono text-[13px] font-semibold">
                {formatAmount(REWARD_CENTS)} per developer, with no limit
              </div>
              <p className="max-w-[400px] font-mono text-[12px] leading-relaxed text-muted-foreground">
                {hoursPerReward ? `Every sign-up is about ${hoursPerReward} box-hours in your wallet. ` : ''}
                Send your link to the first one.
              </p>
            </div>
          ) : (
            <div className="border-t border-border px-[22px] py-4">
              <div
                className={`${ROW} border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted-foreground`}
              >
                <span>Signed up</span>
                <span>Developer</span>
                <span>Status</span>
                <span className="text-right">Reward</span>
              </div>
              {rows.map((row) => {
                const status = STATUS_LABEL[row.status]
                return (
                  <div key={row.id} className={`${ROW} border-b border-border/40 py-[11px] font-mono text-[12px]`}>
                    <span className="text-muted-foreground">{row.signedUpAt}</span>
                    <span className="truncate text-foreground">{row.who}</span>
                    <span className="flex flex-col gap-0.5">
                      <StatusMark tone={status.tone}>{status.text}</StatusMark>
                      {row.status === 'voided' && row.voidReason && (
                        <span className="pl-[15px] text-[10px] text-muted-foreground">{row.voidReason}</span>
                      )}
                    </span>
                    <span
                      className={`text-right tabular-nums ${
                        row.status === 'earned' ? 'text-foreground' : 'text-muted-foreground line-through'
                      }`}
                    >
                      {formatAmount(row.rewardCents)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </section>

      <ProtoSwitcher
        current={scenario}
        onPick={(next) => {
          searchParams.set('proto', next)
          setSearchParams(searchParams, { replace: true })
        }}
      />
    </div>
  )
}

/**
 * Prototype-only, and parked in the corner rather than in the page.
 *
 * A reviewer needs to walk the states without editing fixtures, but a control
 * that is not part of the product must not take the first thing the eye lands
 * on — the page has to read as the real thing from the top down.
 */
function ProtoSwitcher({ current, onPick }: { current: ScenarioKey; onPick: (next: ScenarioKey) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-1 border border-dashed border-border bg-background/95 p-2 backdrop-blur">
          {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
            <AsciiChip key={key} selected={key === current} onClick={() => onPick(key)}>
              {SCENARIOS[key].label}
            </AsciiChip>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="border border-dashed border-border bg-background/95 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        {open ? '× proto' : 'proto'}
      </button>
    </div>
  )
}

/**
 * Entry layer 2 — the one that decides whether anybody finds this feature.
 *
 * Fires once, right after a first subscription, when the user has just made
 * the biggest commitment they are going to make. Inline and dismissible: a
 * modal demanding a share at that moment is the most resented pattern there is.
 */
export function ReferralPrompt({ onOpenReferrals }: { onOpenReferrals: () => void }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('proto-referral-prompt') === 'dismissed')
  if (dismissed) return null

  return (
    <div className="flex flex-wrap items-center gap-4 border border-border bg-card px-[22px] py-4">
      <div className="min-w-[260px] flex-1">
        <div className="font-mono text-[13px] text-foreground">Pass BoxLite on.</div>
        <div className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
          Earn {formatAmount(REWARD_CENTS)} in credit for every developer who signs up through your link, paid the
          moment they create an account.
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AsciiButton variant="primary" onClick={onOpenReferrals}>
          Get my link
        </AsciiButton>
        <button
          type="button"
          className="px-2 py-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            localStorage.setItem('proto-referral-prompt', 'dismissed')
            setDismissed(true)
          }}
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  )
}
