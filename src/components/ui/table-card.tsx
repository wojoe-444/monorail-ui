import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { prefs } from '@/lib/prefs'
import { cn } from '@/lib/utils'

interface TableCardProps {
  title: React.ReactNode
  /** A count pill next to the title (rows in the full list, not just the shown ones). */
  count?: number
  /** One short line after the title: what the numbers mean, the scope. Truncates. */
  description?: React.ReactNode
  /** Right side of the header: a "View all" link, an icon button, a small filter. */
  action?: React.ReactNode
  /**
   * Let the person fold the card down to its header. Pass a preference key
   * (e.g. 'repo.readme') to remember the choice with `prefs`, or `true` to
   * keep it for the visit only.
   */
  collapsible?: string | boolean
  defaultCollapsed?: boolean
  /** Flush content: a `Table`, a list with dividers. Add your own padding for anything else. */
  children?: React.ReactNode
  className?: string
}

/**
 * A card for dense data: a compact 44px header row (title, count, one-line
 * description, action, optional collapse chevron) above flush content. Use it
 * instead of `Card` when the content is a table or list, so rows run edge to
 * edge and more of them fit.
 */
export function TableCard({
  title,
  count,
  description,
  action,
  collapsible,
  defaultCollapsed = false,
  children,
  className,
}: TableCardProps) {
  const prefKey = typeof collapsible === 'string' ? `collapsed.${collapsible}` : null
  const [collapsed, setCollapsed] = React.useState(() => {
    if (!collapsible) return false
    const saved = prefKey ? prefs.getItem(prefKey) : null
    return saved === null ? defaultCollapsed : saved === '1'
  })
  const bodyId = React.useId()
  const toggle = () => {
    const next = !collapsed
    if (prefKey) prefs.setItem(prefKey, next ? '1' : '0')
    setCollapsed(next)
  }
  const label = typeof title === 'string' ? title : 'this card'

  return (
    <section
      data-slot="table-card"
      className={cn('min-w-0 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10', className)}
    >
      <div className={cn('flex min-h-11 items-center gap-2 pr-2 pl-4', !collapsed && 'border-b', collapsible && 'pl-2')}>
        {collapsible && (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={collapsed ? `Show ${label}` : `Hide ${label}`}
            title={collapsed ? `Show ${label}` : `Hide ${label}`}
            onClick={toggle}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown className={cn('size-4 transition-transform', collapsed && '-rotate-90')} />
          </button>
        )}
        <h2 className="text-sm font-semibold whitespace-nowrap">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground tabular-nums">{count}</span>
        )}
        {description && <span className="min-w-0 truncate text-xs text-muted-foreground">{description}</span>}
        <span className="flex-1" />
        {action}
      </div>
      {!collapsed && <div id={bodyId}>{children}</div>}
    </section>
  )
}
