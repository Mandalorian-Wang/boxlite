/*
 * Copyright 2025 BoxLite AI
 * SPDX-License-Identifier: AGPL-3.0
 */

// Alert banners for billing edge states (PRD §4.2 + §4.3).
// Renders conditionally based on DEMO_USER_STATE.

import { toast } from 'sonner'
import { BRAND } from './ascii'
import {
  DEMO_USER_STATE,
  PLANS,
  CURRENT_TIER,
  DEMO_QUOTA_USED,
  BAD_DEBT_THRESHOLD_MULTIPLIER,
  FREE_CREDIT_REMAINING,
  FREE_CREDIT_TOTAL,
  DESTRUCTION_COUNTDOWN_DAYS,
} from './plans'

export function AlertBanners() {
  switch (DEMO_USER_STATE) {
    case 'bad_debt_warning':
      return <BadDebtBanner />
    case 'suspended':
      return <SuspendedBanner />
    case 'credit_exhausted':
      return <CreditExhaustedBanner />
    default:
      return null
  }
}

// ─── Bad debt warning (PRD §4.2) ─────────────────────────────────────────────
// Overage ≥ 2× subscription fee → emergency Stripe charge imminent.

function BadDebtBanner() {
  const plan = PLANS.find((p) => p.tier === CURRENT_TIER)!
  const threshold = (plan.priceMonthly ?? 0) * BAD_DEBT_THRESHOLD_MULTIPLIER
  const currentOverage = 310 // demo: exceeds 2 × $149 = $298

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-warning/60 bg-warning/10 px-[22px] py-4">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2 font-mono text-[12px] font-semibold text-warning">
          <span className="size-[9px]" style={{ background: 'hsl(var(--warning))' }} />
          Overage approaching emergency billing threshold
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          Current overage ${currentOverage.toFixed(2)} / threshold ${threshold.toFixed(2)}.
          An automatic charge will be attempted if this is exceeded. Payment failure will suspend all boxes.
        </span>
      </div>
      <button
        className="border border-warning/60 px-4 py-2 font-mono text-[12px] text-warning transition-colors hover:bg-warning/10"
        onClick={() => document.querySelector<HTMLElement>('[data-value="plan"]')?.click()}
      >
        Upgrade to raise quota →
      </button>
    </div>
  )
}

// ─── Suspended (PRD §4.2: payment failed → SIGTERM all boxes) ────────────────

function SuspendedBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-destructive/60 bg-destructive/10 px-[22px] py-4">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2 font-mono text-[12px] font-semibold text-destructive">
          <span className="size-[9px]" style={{ background: 'hsl(var(--destructive))' }} />
          Account suspended — all boxes stopped
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          Payment could not be processed. Update your payment method to restore service.
          Data is retained for 14 days.
        </span>
      </div>
      <button
        className="bg-foreground px-4 py-2 font-mono text-[12px] font-semibold text-background transition-opacity hover:opacity-90"
        onClick={() => toast.info('Redirecting to payment update…')}
      >
        Update payment →
      </button>
    </div>
  )
}

// ─── Credit exhausted + countdown (PRD §4.3) ─────────────────────────────────

function CreditExhaustedBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-destructive/60 bg-destructive/10 px-[22px] py-4">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2 font-mono text-[12px] font-semibold text-destructive">
          <span className="size-[9px]" style={{ background: 'hsl(var(--destructive))' }} />
          Free credits depleted — all boxes suspended
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          Data will be <span className="text-destructive font-semibold">permanently destroyed in {DESTRUCTION_COUNTDOWN_DAYS} days</span>.
          Start a plan to keep your data and restore service.
        </span>
      </div>
      <button
        className="bg-foreground px-4 py-2 font-mono text-[12px] font-semibold text-background transition-opacity hover:opacity-90"
        onClick={() => document.querySelector<HTMLElement>('[data-value="plan"]')?.click()}
      >
        Choose a plan →
      </button>
    </div>
  )
}

// ─── Free trial banner (shown in Usage tab for free_trial state) ─────────────

export function FreeTrialBanner() {
  if (DEMO_USER_STATE !== 'free_trial') return null
  const ratio = FREE_CREDIT_USED / FREE_CREDIT_TOTAL

  return (
    <div className="border border-border bg-card px-[22px] py-5">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
          <span style={{ color: BRAND }}>▸</span> Free credits
        </span>
        <span className="font-mono text-[26px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
          ${FREE_CREDIT_REMAINING.toFixed(2)}
          <span className="ml-2 text-[13px] font-normal text-muted-foreground">/ ${FREE_CREDIT_TOTAL.toFixed(2)}</span>
        </span>
      </div>
      <div className="mt-4 flex items-center gap-4 font-mono text-[12px]">
        <span className="w-[100px] shrink-0 uppercase tracking-[0.5px] text-muted-foreground">Used</span>
        <span className="w-[140px] shrink-0 tabular-nums text-foreground">
          ${FREE_CREDIT_USED.toFixed(2)} / ${FREE_CREDIT_TOTAL.toFixed(2)}
        </span>
        <div className="flex flex-1 gap-[3px]">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1"
              style={{ background: i < Math.round(ratio * 40) ? BRAND : 'hsl(var(--brand) / 0.15)' }}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        <span style={{ color: BRAND }}>▸</span> When credits reach $0, all boxes will be suspended. After 7 days, data is permanently destroyed.
      </p>
    </div>
  )
}
