/*
 * Copyright 2025 Daytona Platforms Inc.
 * Modified by BoxLite AI, 2025-2026
 * SPDX-License-Identifier: AGPL-3.0
 */

import { useIsCompactScreen, useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { DebouncedInput } from '../DebouncedInput'
import { BoxTableHeaderProps } from './types'

export function BoxTableHeader({ table, headerAction }: BoxTableHeaderProps) {
  const isMobile = useIsMobile()
  const isCompactScreen = useIsCompactScreen()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DebouncedInput
        value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
        onChange={(value) => table.getColumn('name')?.setFilterValue(value)}
        placeholder="Search by name or Box ID"
        className={cn('min-w-0', {
          'w-full': isMobile,
          'min-w-[16rem] flex-1': !isMobile && isCompactScreen,
          'w-[360px]': !isMobile && !isCompactScreen,
        })}
      />
      {headerAction && <div className={cn('ml-auto', isMobile && 'w-full')}>{headerAction}</div>}
    </div>
  )
}
