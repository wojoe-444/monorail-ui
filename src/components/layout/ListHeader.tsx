import type { ComponentProps, ReactNode } from 'react'
import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ListHeaderProps {
  title: string
  /** Number of items, shown in a pill next to the title. */
  count?: number
  actions?: ReactNode
  /** The `ListToolbar`. */
  children?: ReactNode
}

/**
 * Header style E: on a list page the controls are the header. A small title
 * with a count, then a `ListToolbar` with search, filters, sort and view. For
 * lists, tables, inboxes and search results.
 */
export function ListHeader({ title, count, actions, children }: ListHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          {count !== undefined && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {count.toLocaleString()}
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

interface ListToolbarProps {
  /** Search, `FilterChip`s, `AddFilterButton`, sort and view controls. */
  children: ReactNode
  /** Selected rows. Above zero the toolbar turns into the bulk-action bar. */
  selectedCount?: number
  /** Buttons for the selected rows (ghost, `size="sm"`). */
  selectionActions?: ReactNode
  onClearSelection?: () => void
  'aria-label'?: string
  className?: string
}

/**
 * The toolbar under `ListHeader`. When rows are selected the same bar shows
 * the count and bulk actions instead, so nothing on the page moves.
 */
export function ListToolbar({ children, selectedCount = 0, selectionActions, onClearSelection, className, ...rest }: ListToolbarProps) {
  const selecting = selectedCount > 0
  return (
    <div
      aria-label={rest['aria-label'] ?? 'List controls'}
      role="group"
      className={cn(
        'flex min-h-12 flex-wrap items-center gap-2 rounded-xl border p-2 transition-colors',
        selecting ? 'border-primary/25 bg-primary-soft' : 'bg-card',
        className,
      )}
    >
      {selecting ? (
        <>
          <span className="px-2 text-sm font-semibold text-primary-soft-foreground tabular-nums">{selectedCount} selected</span>
          {selectionActions}
          <span className="flex-1" />
          {onClearSelection && (
            <Button variant="ghost" size="icon" className="size-8" aria-label="Clear selection" onClick={onClearSelection}>
              <X />
            </Button>
          )}
        </>
      ) : (
        children
      )}
    </div>
  )
}

interface FilterChipProps {
  label: string
  value: string
  onRemove: () => void
}

/** An applied filter ("Status: Active") with a remove button. */
export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-primary-soft pr-1 pl-2.5 text-sm text-primary-soft-foreground">
      {label}: <span className="font-semibold">{value}</span>
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
        className="ml-0.5 rounded-sm p-0.5 outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" />
      </button>
    </span>
  )
}

/** Dashed "+ Filter" button. Use it as a `DropdownMenuTrigger` (`asChild`). */
export function AddFilterButton({ className, children = 'Filter', ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-dashed border-input px-2.5 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      <Plus className="size-3.5" />
      {children}
    </button>
  )
}
