/*
 * Copyright Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { CopyButton } from '@/components/CopyButton'
import { ResourceChip } from '@/components/ResourceChip'
import { TimestampTooltip } from '@/components/TimestampTooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { getBoxPublicId, getBoxPublicIdLabel } from '@/lib/box-identity'
import { formatDuration, getRelativeTimeString } from '@/lib/utils'
import { Box } from '@boxlite-ai/api-client'
import { AlertCircle } from 'lucide-react'
import React from 'react'

interface BoxInfoPanelProps {
  box: Box
  getRegionName: (id: string) => string | undefined
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 min-w-0 py-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <div className="min-w-0 text-sm text-right truncate">{children}</div>
    </div>
  )
}

export function BoxInfoPanel({ box, getRegionName }: BoxInfoPanelProps) {
  const publicBoxId = getBoxPublicId(box)
  const region = getRegionName(box.target) ?? box.target
  const labelEntries = Object.entries(box.labels ?? {})

  return (
    <div className="rounded-lg border border-border bg-card">
      {box.errorReason && (
        <div className="px-5 pt-4">
          <Alert variant={box.recoverable ? 'warning' : 'destructive'}>
            <AlertCircle />
            <AlertDescription>{box.errorReason}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-12 px-5 py-4 sm:grid-cols-2">
        <MetaRow label="Box ID">
          <div className="flex min-w-0 items-center justify-end gap-1">
            <span className="truncate font-mono text-xs">{getBoxPublicIdLabel(box)}</span>
            {publicBoxId && <CopyButton value={publicBoxId} tooltipText="Copy Box ID" size="icon-xs" />}
          </div>
        </MetaRow>
        <MetaRow label="Image">
          {box.image ? (
            <span className="truncate font-mono text-xs" title={box.image}>
              {box.image}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </MetaRow>
        <MetaRow label="Region">
          {region ? <span className="truncate">{region}</span> : <span className="text-muted-foreground">—</span>}
        </MetaRow>
        <MetaRow label="Resources">
          <div className="flex flex-wrap justify-end gap-1.5">
            <ResourceChip resource="cpu" value={box.cpu} />
            <ResourceChip resource="memory" value={box.memory} />
            <ResourceChip resource="disk" value={box.disk} />
          </div>
        </MetaRow>
        <MetaRow label="Auto-stop">
          {box.autoStopInterval ? (
            formatDuration(box.autoStopInterval)
          ) : (
            <span className="text-muted-foreground">Disabled</span>
          )}
        </MetaRow>
        <MetaRow label="Auto-delete">
          {box.autoDeleteInterval !== undefined && box.autoDeleteInterval >= 0 ? (
            box.autoDeleteInterval === 0 ? (
              'On stop'
            ) : (
              formatDuration(box.autoDeleteInterval)
            )
          ) : (
            <span className="text-muted-foreground">Disabled</span>
          )}
        </MetaRow>
        <MetaRow label="Created">
          <TimestampTooltip timestamp={box.createdAt}>
            <span>{getRelativeTimeString(box.createdAt).relativeTimeString}</span>
          </TimestampTooltip>
        </MetaRow>
        <MetaRow label="Last event">
          <TimestampTooltip timestamp={box.updatedAt}>
            <span>{getRelativeTimeString(box.updatedAt).relativeTimeString}</span>
          </TimestampTooltip>
        </MetaRow>
      </div>

      {labelEntries.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Labels</p>
          <div className="flex flex-wrap gap-1.5">
            {labelEntries.map(([key, value]) => (
              <span
                key={key}
                className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {key}={value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function InfoPanelSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <Skeleton className="h-2.5 w-16 mb-3" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-b border-border">
        <Skeleton className="h-2.5 w-20 mb-3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <div className="px-5 py-4 border-b border-border">
        <Skeleton className="h-2.5 w-18 mb-3" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-22" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <Skeleton className="h-2.5 w-24 mb-3" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}
