/*
 * Copyright 2025 BoxLite AI
 * SPDX-License-Identifier: AGPL-3.0
 */

// TEMP(preview): Unified "This Cycle" card — quota water-level + concurrency status.
// Strictly per PRD §3 + §4.3. One card, no jargon.

import { BRAND, SectionTitle } from './ascii'
import { PLANS, CURRENT_TIER, DEMO_QUOTA_USED } from './plans'

// TEMP(preview): demo live state
const RUNNING_BOXES = 61
const BURST_BOXES = 0

export function QuotaBar({ used, limit, segments = 40 }: { used: number; limit: number; segments?: number }) {
  const ratio = limit > 0 ? used / limit : 0
  const filled = Math.max(0, Math.min(segments, Math.round(ratio * segments)))
  const color = ratio >= 0.9 ? 'hsl(var(--destructive))' : ratio >= 0.7 ? 'hsl(var(--warning))' : BRAND
  return (
    <div className="flex flex-1 gap-[3px]">
      {Array.from({ length: segments }).map((_, i) => (
        <span key={i} className="h-1.5 flex-1" style={{ background: i < filled ? color : 'hsl(var(--brand) / 0.15)' }} />
      ))}
    </div>
  )
}

export function QuotaOverviewCard() {
  const plan = PLANS.find((p) => p.tier === CURRENT_TIER)!
  const quotaTotal = plan.quotaUsd ?? 0
  const overage = 12.4
  const daysLeft = 11
  const wall = plan.concurrencyWall as number

  return (
    <div>
      <SectionTitle title="This Cycle" />
      <div className="border border-border bg-card">
        {/* Metrics row */}
        <div className="flex flex-col gap-6 px-[22px] py-6 sm:flex-row sm:gap-14">
          <Metric label="Quota consumed" value={`$${DEMO_QUOTA_USED.toFixed(2)}`} sub={`of $${quotaTotal.toFixed(2)} included`} />
          <Metric label="Overage (PAYG)" value={`$${overage.toFixed(2)}`} sub="after quota exhausted" accent />
          <Metric label="Cycle ends in" value={`${daysLeft}`} sub="days" />
        </div>

        {/* Quota bar */}
        <div className="border-t border-border px-[22px] py-4">
          <BarRow label="Quota used" used={DEMO_QUOTA_USED} limit={quotaTotal} display={`$${DEMO_QUOTA_USED.toFixed(2)} / $${quotaTotal.toFixed(2)}`} />
          {overage > 0 && (
            <p className="mt-2 font-mono text-[11px] text-warning">
              ⚠ Quota exhausted — overage billed at base PAYG rates
            </p>
          )}
        </div>

        {/* Concurrency */}
        <div className="border-t border-border px-[22px] py-4">
          <BarRow label="Concurrent" used={RUNNING_BOXES} limit={wall} display={`${RUNNING_BOXES} / ${wall}`} />
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px]">
            <span className="size-[7px]" style={{ background: BURST_BOXES > 0 ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground) / 0.3)' }} />
            <span className={BURST_BOXES > 0 ? 'text-warning' : 'text-muted-foreground'}>
              {BURST_BOXES > 0
                ? `${BURST_BOXES} above limit — charged 1.5× CPU/Mem`
                : 'Within limit'}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
            <span style={{ color: BRAND }}>▸</span>{' '}
            {plan.burstPolicy.includes('429')
              ? 'Above limit: new boxes rejected (429). Upgrade to raise the limit.'
              : 'Above limit: excess boxes run at 1.5× CPU/Mem. Upgrade to raise the limit.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
        <span style={{ color: BRAND }}>▸</span> {label}
      </span>
      <span className={`font-mono text-[26px] font-semibold leading-none tracking-tight tabular-nums ${accent ? 'text-warning' : 'text-foreground'}`}>
        {value}
      </span>
      {sub && <span className="font-mono text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

function BarRow({ label, used, limit, display }: { label: string; used: number; limit: number; display: string }) {
  return (
    <div className="flex items-center gap-4 font-mono text-[12px]">
      <span className="w-[100px] shrink-0 uppercase tracking-[0.5px] text-muted-foreground">{label}</span>
      <span className="w-[140px] shrink-0 tabular-nums text-foreground">{display}</span>
      <QuotaBar used={used} limit={limit} />
    </div>
  )
}
