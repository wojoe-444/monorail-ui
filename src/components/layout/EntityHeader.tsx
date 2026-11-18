import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

import type { PageTab } from '@/hooks/usePageTab'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

import type { IconComponent } from './nav'
import { PageMeta, type PageMetaItem } from './PageMeta'
import { PageTabs } from './PageTabs'

interface EntityHeaderProps {
  title: string
  /** Icon for the tile left of the title. */
  icon?: IconComponent
  /** Replaces the icon tile, e.g. a large `Avatar` or a thumbnail. */
  media?: ReactNode
  /** Link back to the list this item belongs to. */
  back?: { label: string; path: string }
  /** Next to the title: a status `Badge`, a favorite toggle. */
  badges?: ReactNode
  /** Facts under the title: owner, updated, due date, counts. */
  meta?: PageMetaItem[]
  actions?: ReactNode
  /** Sections of the item, drawn as underline tabs on the band's bottom edge. */
  tabs?: PageTab[]
  tabsLabel?: string
  /** Extra content under the meta row, e.g. a progress bar. */
  children?: ReactNode
}

/**
 * Header style D: identity first. An icon tile, the item's name and status,
 * a row of facts, and its sections as tabs, on a card-colored band that runs
 * the full width of the page. For detail pages: a project, person, order,
 * device. Render it first in the page; it cancels the page's top padding.
 */
export function EntityHeader({
  title,
  icon: Icon,
  media,
  back,
  badges,
  meta,
  actions,
  tabs,
  tabsLabel = `${title} sections`,
  children,
}: EntityHeaderProps) {
  return (
    // The band cancels AppShell's page padding (-mx/-mt) and paints past the
    // page column's max width with a spread shadow, clipped to its own height.
    <header
      className={cn(
        'relative isolate -mx-6 -mt-6 bg-card px-6 pt-5 shadow-[0_0_0_100vmax_var(--card)] [clip-path:inset(0_-100vmax)] lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-6',
        !tabs && 'pb-6',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-px bg-border shadow-[0_0_0_100vmax_var(--border)] [clip-path:inset(0_-100vmax)]"
      />
      {back && (
        <a
          href={href(back.path)}
          className="mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          {back.label}
        </a>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {media ??
            (Icon && (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary-soft-foreground">
                <Icon className="size-6" />
              </div>
            ))}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{title}</h1>
              {badges}
            </div>
            {meta && <PageMeta items={meta} className="mt-2" />}
            {children}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <PageTabs tabs={tabs} variant="underline" aria-label={tabsLabel} className="mt-4" />}
    </header>
  )
}
