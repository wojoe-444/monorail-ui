import * as React from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'

import { cn } from '../../lib/utils.js'

function Progress({
  className,
  indicatorClassName,
  value,
  max = 100,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  const limit = Number.isFinite(max) && max > 0 ? max : 100
  const current = typeof value === 'number' && value >= 0 && value <= limit ? value : null
  const percent = ((current ?? 0) / limit) * 100

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
      max={limit}
      value={current}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn('h-full w-full flex-1 bg-primary transition-all', indicatorClassName)}
        style={{ transform: `translateX(${percent - 100}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
