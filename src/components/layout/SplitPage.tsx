import type { ReactNode } from 'react'

import type { PageTab } from '@/hooks/usePageTab'

import { PageTabs } from './PageTabs'

interface SplitPageProps {
  title: string
  /** A few sentences. This header has room to actually explain the page. */
  description?: ReactNode
  /** Sections of the page, listed under the description. Read the active one with `usePageTab(nav)`. */
  nav?: PageTab[]
  navLabel?: string
  /** Under the nav, e.g. a link to the docs. */
  aside?: ReactNode
  /** The content column. */
  children: ReactNode
}

/**
 * Header style F: the header is a left column (title, a paragraph, a section
 * list, a help link) that stays put while the content column scrolls. For
 * settings, forms, documentation and long configuration. Below `lg` it
 * stacks, and the section list becomes a row of chips.
 */
export function SplitPage({ title, description, nav, navLabel = `${title} sections`, aside, children }: SplitPageProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
      {/* top-18 = 40px top bar + 32px page padding */}
      <header className="flex min-w-0 flex-col lg:sticky lg:top-18 lg:self-start">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <div className="mt-2 text-sm text-pretty text-muted-foreground">{description}</div>}
        {nav && <PageTabs tabs={nav} variant="side" aria-label={navLabel} className="mt-5" />}
        {aside && <div className="mt-5 text-sm">{aside}</div>}
      </header>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </div>
  )
}
