/*
 * Copyright 2025 BoxLite AI
 * SPDX-License-Identifier: AGPL-3.0
 */

// TEMP(preview): hardcoded subscription plan data from PRD §3.
// Production would derive from server-driven plan catalog.

export type SubscriptionPlan = {
  id: string
  tier: number
  name: string
  /** Monthly subscription price in USD; null for custom/enterprise */
  priceMonthly: number | null
  /** Included quota (usage credit) in USD per billing cycle */
  quotaUsd: number | null
  /** Quota leverage multiplier (quota / price) */
  quotaLeverage: string | null
  /** Max concurrent sandboxes; 'unlimited' for enterprise */
  concurrencyWall: number | 'unlimited'
  /** What happens when concurrency wall is exceeded */
  burstPolicy: string
  /** Target audience one-liner */
  audience: string
  /** Enterprise/custom plan flag */
  custom?: boolean
}

export const PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    tier: 1,
    name: 'Starter',
    priceMonthly: 19,
    quotaUsd: 30,
    quotaLeverage: '1.57×',
    concurrencyWall: 20,
    burstPolicy: 'Hard reject (429)',
    audience: 'Independent devs & side projects',
  },
  {
    id: 'pro',
    tier: 2,
    name: 'Pro',
    priceMonthly: 149,
    quotaUsd: 250,
    quotaLeverage: '1.67×',
    concurrencyWall: 100,
    burstPolicy: '1.5× CPU/Mem rate',
    audience: 'AI builders with early traffic',
  },
  {
    id: 'max',
    tier: 3,
    name: 'Max',
    priceMonthly: 499,
    quotaUsd: 900,
    quotaLeverage: '1.8×',
    concurrencyWall: 1000,
    burstPolicy: '1.5× CPU/Mem rate',
    audience: 'High-frequency production agents',
  },
  {
    id: 'enterprise',
    tier: 4,
    name: 'Enterprise',
    priceMonthly: null,
    quotaUsd: null,
    quotaLeverage: null,
    concurrencyWall: 'unlimited',
    burstPolicy: 'Negotiated · contract terms',
    audience: 'Large orgs with compliance needs',
    custom: true,
  },
]

/** Current org tier — matches MSW mock (GET /organization/:id/tier → tier: 2) */
export const CURRENT_TIER = 2

// Demo utilization
export const DEMO_QUOTA_USED = 163.2
export const DEMO_CONCURRENCY_USED = 61

// ─── User state (PRD §4.2 + §4.3) ──────────────────────────────────────────

export type UserBillingState =
  | 'active'            // Normal subscriber within quota
  | 'overage'           // Quota exhausted, paying PAYG
  | 'bad_debt_warning'  // Overage ≥ 2× subscription fee — emergency charge imminent
  | 'suspended'         // Payment failed or credits depleted — boxes SIGTERM'd
  | 'free_trial'        // New user, no subscription, using $100 free credits
  | 'credit_exhausted'  // Free credits gone, 7-day destruction countdown

/**
 * TEMP(preview): toggle this to demo different user states.
 * Production derives from server: wallet status + tier + suspension flags.
 */
export const DEMO_USER_STATE: UserBillingState = 'active'

// Free trial constants (PRD §4.3)
export const FREE_CREDIT_TOTAL = 100
export const FREE_CREDIT_USED = 37.70
export const FREE_CREDIT_REMAINING = FREE_CREDIT_TOTAL - FREE_CREDIT_USED

// Bad debt threshold (PRD §4.2): overage ≥ 2× monthly subscription → emergency charge
export const BAD_DEBT_THRESHOLD_MULTIPLIER = 2

// Credit exhaustion countdown (PRD §4.3): 7 days until physical destruction
export const DESTRUCTION_COUNTDOWN_DAYS = 5
