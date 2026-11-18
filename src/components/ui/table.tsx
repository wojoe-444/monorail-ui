import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Dense data table: single-line 36px rows, an uppercase header on a muted
 * band, dividers and a hover tint. Same parts as shadcn's Table. Put it
 * straight inside a `TableCard` (no padding) so the rows run edge to edge.
 *
 * - `fill` on one cell per row gives it the leftover width and truncates its
 *   text (wrap the text in a span). Use it for messages, titles, paths.
 * - `numeric` right-aligns with tabular figures (counts, times, sizes).
 */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('bg-muted/45 [&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn('border-b transition-colors [tbody_&]:hover:bg-accent/70 data-[state=selected]:bg-primary-soft', className)}
      {...props}
    />
  )
}

function TableHead({ className, numeric, ...props }: React.ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-8 px-2.5 text-left align-middle text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase first:pl-4 last:pr-3',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  numeric,
  fill,
  ...props
}: React.ComponentProps<'td'> & { numeric?: boolean; fill?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'h-9 px-2.5 align-middle whitespace-nowrap first:pl-4 last:pr-3',
        numeric && 'text-right tabular-nums',
        fill && 'w-full max-w-0 [&>*]:block [&>*]:truncate',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return <caption data-slot="table-caption" className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
}

/** A row that spans every column, for "Loading…" and "Nothing matches". */
function TableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr data-slot="table-empty">
      <td colSpan={colSpan} className="px-4 py-3.5 text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption, TableEmpty }
