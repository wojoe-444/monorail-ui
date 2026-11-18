import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import type { IconComponent } from './nav'

export interface PageMetaItem {
  icon?: IconComponent
  label: ReactNode
}

/** A wrapping row of small facts with icons ("Sam Ortiz · Updated 2h ago · Due Dec 4"). Used by the headers. */
export function PageMeta({ items, className }: { items: PageMetaItem[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground', className)}>
      {items.map(({ icon: Icon, label }, i) => (
        <li key={i} className="inline-flex min-w-0 items-center gap-1.5">
          {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
          {label}
        </li>
      ))}
    </ul>
  )
}
