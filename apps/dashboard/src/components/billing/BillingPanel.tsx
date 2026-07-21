/*
 * Copyright 2025 BoxLite AI
 * SPDX-License-Identifier: AGPL-3.0
 */

// TEMP(preview): Subscription-era billing — payment method + monthly invoices.
// No top-up / wallet / auto-reload. Invoices show subscription fee + overage breakdown.

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { BRAND, SectionTitle, CardBrand } from './ascii'

// ─── Demo data ───────────────────────────────────────────────────────────────

type Invoice = {
  cycle: string
  plan: string
  subscriptionFee: number
  quotaUsed: number
  overage: number
  total: number
  status: 'paid' | 'pending' | 'failed'
}

const INVOICES: Invoice[] = [
  { cycle: '2026-07', plan: 'Pro', subscriptionFee: 149, quotaUsed: 250, overage: 12.40, total: 161.40, status: 'pending' },
  { cycle: '2026-06', plan: 'Pro', subscriptionFee: 149, quotaUsed: 218.30, overage: 0, total: 149.00, status: 'paid' },
  { cycle: '2026-05', plan: 'Starter', subscriptionFee: 19, quotaUsed: 30, overage: 43.20, total: 62.20, status: 'paid' },
  { cycle: '2026-04', plan: 'Starter', subscriptionFee: 19, quotaUsed: 30, overage: 0, total: 19.00, status: 'paid' },
  { cycle: '2026-03', plan: 'Starter', subscriptionFee: 19, quotaUsed: 22.10, overage: 0, total: 19.00, status: 'paid' },
  { cycle: '2026-02', plan: 'Starter', subscriptionFee: 19, quotaUsed: 30, overage: 15.80, total: 34.80, status: 'paid' },
  { cycle: '2026-01', plan: 'Starter', subscriptionFee: 19, quotaUsed: 18.50, overage: 0, total: 19.00, status: 'failed' },
]

const ROW = 'grid grid-cols-[80px_70px_100px_100px_90px_90px_1fr_70px_28px] items-center gap-x-4'

// ─── Component ───────────────────────────────────────────────────────────────

export function BillingPanel() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return INVOICES
    const q = query.toLowerCase()
    return INVOICES.filter(
      (inv) =>
        inv.cycle.includes(q) ||
        inv.plan.toLowerCase().includes(q) ||
        inv.status.includes(q) ||
        inv.total.toFixed(2).includes(q),
    )
  }, [query])

  return (
    <div className="space-y-8">
      {/* Payment method */}
      <PaymentMethodSection />

      {/* Invoices */}
      <div>
        <SectionTitle
          title="Invoices"
          count={`${filtered.length} records`}
          right={
            <div className="flex items-center border border-border px-3 py-2 font-mono text-[13px] transition-colors hover:border-brand focus-within:border-brand">
              <span style={{ color: BRAND }} className="mr-2">⌕</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search invoices…"
                className="w-[160px] bg-transparent font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          }
        />

        {/* Header */}
        <div className={`${ROW} border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted-foreground`}>
          <span>Cycle</span>
          <span>Plan</span>
          <span className="text-right">Sub fee</span>
          <span className="text-right">Quota used</span>
          <span className="text-right">Overage</span>
          <span className="text-right">Total</span>
          <span></span>
          <span className="text-right">Status</span>
          <span></span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-8 text-center font-mono text-[13px] text-muted-foreground">no invoices found</div>
        ) : (
          filtered.map((inv) => (
            <div
              key={inv.cycle}
              className={`${ROW} border-b border-border/40 py-[14px] font-mono text-[13px] transition-colors hover:bg-muted/30`}
            >
              <span className="text-foreground">{inv.cycle}</span>
              <span className="text-muted-foreground">{inv.plan}</span>
              <span className="text-right tabular-nums text-foreground">${inv.subscriptionFee.toFixed(2)}</span>
              <span className="text-right tabular-nums text-foreground">${inv.quotaUsed.toFixed(2)}</span>
              <span className={`text-right tabular-nums ${inv.overage > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {inv.overage > 0 ? `$${inv.overage.toFixed(2)}` : '—'}
              </span>
              <span className="text-right tabular-nums font-semibold text-foreground">${inv.total.toFixed(2)}</span>
              <span></span>
              <span className="text-right">
                <StatusBadge status={inv.status} />
              </span>
              <span className="text-right">
                <button
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => toast.info(`Downloading invoice ${inv.cycle}`)}
                  title="Download PDF"
                >
                  ↓
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Payment Method ──────────────────────────────────────────────────────────

function PaymentMethodSection() {
  return (
    <div>
      <SectionTitle title="Payment Method" />
      <div className="border border-border bg-card px-[22px] py-5">
        <div className="flex flex-wrap items-center gap-4">
          <CardBrand brand="visa" size="lg" />
          <span className="font-mono text-[18px] tracking-[2px] text-foreground">···· 4242</span>
          <span className="font-mono text-[12px] text-muted-foreground">exp 08/27</span>
          <div className="ml-auto flex gap-3">
            <button
              className="border border-border px-4 py-2 font-mono text-[12px] text-foreground transition-colors hover:border-brand"
              onClick={() => toast.info('Redirecting to card update…')}
            >
              Update card
            </button>
            <button
              className="border border-border px-4 py-2 font-mono text-[12px] text-foreground transition-colors hover:border-brand"
              onClick={() => toast.info('Opening billing portal…')}
            >
              Billing portal ↗
            </button>
          </div>
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          <span style={{ color: BRAND }}>▸</span> Used for monthly subscription renewal and overage auto-charges
        </p>
      </div>
    </div>
  )
}

// ─── Status indicator ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const color =
    status === 'paid' ? 'hsl(var(--success))' : status === 'failed' ? 'hsl(var(--destructive))' : 'hsl(var(--warning))'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-[9px]" style={{ background: color }} />
      <span className={status === 'failed' ? 'text-destructive' : status === 'pending' ? 'text-warning' : 'text-foreground'}>
        {status}
      </span>
    </span>
  )
}
