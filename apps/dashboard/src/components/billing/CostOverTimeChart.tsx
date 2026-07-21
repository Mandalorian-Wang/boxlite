/*
 * Copyright 2025 BoxLite AI
 * SPDX-License-Identifier: AGPL-3.0
 */

// TEMP(preview): Stacked area cost chart (quota / overage / burst) + concurrency timeline with wall line.

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BRAND, SectionTitle } from './ascii'

// ─── Demo data generation ────────────────────────────────────────────────────

const WALL = 100
const QUOTA_DAILY = 8.33 // $250 / 30 days

function generateData() {
  const days = 30
  const data = []
  for (let i = 0; i < days; i++) {
    const date = `Jul ${i + 1}`
    // Base daily usage with some variance
    const baseUsage = 6 + Math.sin(i * 0.4) * 2 + Math.random() * 2
    // After day 14, quota exhausted → overage kicks in
    const quotaExhausted = i >= 14
    const quotaCovered = quotaExhausted ? QUOTA_DAILY : Math.min(baseUsage, QUOTA_DAILY)
    const overage = quotaExhausted ? Math.max(0, baseUsage - QUOTA_DAILY) * 0.6 : 0
    // Burst windows: days 18-20 and 24-26 have concurrency spikes
    const isBurstWindow = (i >= 18 && i <= 20) || (i >= 24 && i <= 26)
    const burst = isBurstWindow ? 1.5 + Math.random() * 1.2 : 0
    // Concurrency: base 50-70, spikes during burst windows
    const concurrency = isBurstWindow ? 105 + Math.round(Math.random() * 30) : 50 + Math.round(Math.sin(i * 0.3) * 20 + Math.random() * 10)

    data.push({
      date,
      quotaCovered: +quotaCovered.toFixed(2),
      overage: +overage.toFixed(2),
      burst: +burst.toFixed(2),
      concurrency,
    })
  }
  return data
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const COLOR_QUOTA = BRAND // cyan
const COLOR_OVERAGE = 'hsl(38 92% 50%)' // warning/amber
const COLOR_BURST = 'hsl(0 72% 51%)' // destructive/red
const COLOR_CONCURRENCY = BRAND
const COLOR_WALL = 'hsl(var(--muted-foreground))'

// ─── Component ───────────────────────────────────────────────────────────────

export function CostOverTimeChart() {
  const data = useMemo(() => generateData(), [])

  return (
    <div className="space-y-6">
      {/* Stacked cost area chart */}
      <div>
        <SectionTitle title="Cost Over Time" right={<span className="font-mono text-[10px] text-muted-foreground">Last 30 days</span>} />
        <div className="border border-border bg-card px-[22px] py-5">
          {/* Legend */}
          <div className="mb-4 flex flex-wrap gap-5 font-mono text-[10px] uppercase tracking-[1px] text-muted-foreground">
            <LegendDot color={COLOR_QUOTA} label="Quota-covered" />
            <LegendDot color={COLOR_OVERAGE} label="Overage (PAYG)" />
            <LegendDot color={COLOR_BURST} label="Burst 1.5×" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 0,
                  fontFamily: 'monospace',
                  fontSize: 11,
                }}
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
              />
              <Area type="monotone" dataKey="quotaCovered" stackId="cost" stroke={COLOR_QUOTA} fill={COLOR_QUOTA} fillOpacity={0.6} strokeWidth={2} name="Quota-covered" />
              <Area type="monotone" dataKey="overage" stackId="cost" stroke={COLOR_OVERAGE} fill={COLOR_OVERAGE} fillOpacity={0.7} strokeWidth={2} name="Overage" />
              <Area type="monotone" dataKey="burst" stackId="cost" stroke={COLOR_BURST} fill={COLOR_BURST} fillOpacity={0.7} strokeWidth={2} name="Burst 1.5×" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Concurrency timeline */}
      <div>
        <SectionTitle title="Concurrency Timeline" right={<span className="font-mono text-[10px] text-muted-foreground">limit = {WALL}</span>} />
        <div className="border border-border bg-card px-[22px] py-5">
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 150]}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 0,
                  fontFamily: 'monospace',
                  fontSize: 11,
                }}
                formatter={(value: number) => [`${value} boxes`, 'Concurrency']}
              />
              <ReferenceLine
                y={WALL}
                stroke={COLOR_WALL}
                strokeDasharray="6 3"
                label={{ value: `limit ${WALL}`, position: 'right', fontSize: 9, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Line
                type="monotone"
                dataKey="concurrency"
                stroke={COLOR_CONCURRENCY}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: COLOR_CONCURRENCY }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            <span style={{ color: BRAND }}>▸</span> Peaks above the limit trigger 1.5× pricing on CPU/Mem
          </p>
        </div>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-[8px]" style={{ background: color }} />
      {label}
    </span>
  )
}
