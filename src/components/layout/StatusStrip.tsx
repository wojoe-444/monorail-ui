import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * One thin row of facts in a hairline card, cells split by dividers. Use it
 * on dense pages instead of a row of `StatTile`s: the same numbers in a
 * tenth of the height, plus room for problems that need the person, with a
 * fix-it link. Put it right under `PageHeader` (and `PageTabs`).
 *
 * ```tsx
 * <StatusStrip aria-label="Summary">
 *   <StatusItem value={9} label="repositories" />
 *   <StatusItem value={2} label="not pushed" title="Commits only on this computer" />
 *   <StatusSpacer />
 *   <StatusItem tone="destructive" icon={TriangleAlert} label="Backup failed" action={<a href="…">Retry</a>} />
 * </StatusStrip>
 * ```
 */
export function StatusStrip({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="status-strip"
      className={cn(
        'flex flex-wrap items-stretch overflow-hidden rounded-xl bg-card text-sm text-muted-foreground ring-1 ring-foreground/10',
        className,
      )}
      {...props}
    />
  )
}

interface StatusItemProps {
  /** The figure, shown bold with tabular numbers. Leave out for a text-only fact. */
  value?: React.ReactNode
  label: React.ReactNode
  /** default: muted text. warning / destructive: the cell is tinted (needs the person). */
  tone?: 'default' | 'warning' | 'destructive'
  icon?: React.ComponentType<{ className?: string }>
  /** A link or button after the label, e.g. "Retry". Gets underlined. */
  action?: React.ReactNode
  /** Tooltip: what exactly is counted. */
  title?: string
  className?: string
}

export function StatusItem({ value, label, tone = 'default', icon: Icon, action, title, className }: StatusItemProps) {
  return (
    <div
      data-slot="status-item"
      title={title}
      className={cn(
        'flex min-w-0 items-center gap-2 border-r px-4 py-2 whitespace-nowrap last:border-r-0',
        tone === 'warning' && 'bg-warning-soft text-warning-soft-foreground',
        tone === 'destructive' && 'bg-destructive-soft text-destructive-soft-foreground',
        className,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      {value !== undefined && (
        <span className={cn('font-semibold tabular-nums', tone === 'default' ? 'text-base text-foreground' : '')}>{value}</span>
      )}
      <span className="truncate">{label}</span>
      {action && <span className="[&_a]:underline [&_a]:underline-offset-2 [&_button]:underline [&_button]:underline-offset-2">{action}</span>}
    </div>
  )
}

/** Pushes the items after it to the right end of the strip (problems, the newest event). */
export function StatusSpacer() {
  return <span data-slot="status-spacer" aria-hidden className="flex-1" />
}
