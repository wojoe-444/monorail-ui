import { useEffect, useRef, useState, type ReactNode } from 'react'

import { PageMeta, type PageMetaItem } from './PageMeta'
import { TopBarPortal } from './TopBarSlot'

interface CollapsingHeaderProps {
  /** Small overline, e.g. the kind of page and its date. */
  eyebrow?: string
  title: string
  description?: ReactNode
  meta?: PageMetaItem[]
  /** Shown in the header, and in the top bar once the title scrolls away. */
  actions?: ReactNode
}

/** TopBar height: the title counts as gone once it slides under the bar. */
const TOP_BAR = 64

/**
 * Header style G: a large, editorial title that hands off to the top bar
 * once it scrolls out of view. Presence when you arrive, a thin bar while
 * you read. For articles, reports, changelogs and long detail views.
 */
export function CollapsingHeader({ eyebrow, title, description, meta, actions }: CollapsingHeaderProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [condensed, setCondensed] = useState(false)

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setCondensed(!entry.isIntersecting && entry.boundingClientRect.top < TOP_BAR), {
      rootMargin: `-${TOP_BAR}px 0px 0px 0px`,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {condensed && (
        <TopBarPortal>
          <div className="flex min-w-0 flex-1 animate-in items-center gap-3 duration-200 fade-in slide-in-from-bottom-1">
            <span aria-hidden className="min-w-0 truncate text-base font-semibold tracking-tight">
              {title}
            </span>
            <span className="flex-1" />
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </TopBarPortal>
      )}
      <header className="flex flex-col gap-4 border-b pt-2 pb-8">
        {eyebrow && <div className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">{eyebrow}</div>}
        <h1 ref={titleRef} className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        {description && <p className="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">{description}</p>}
        {(meta || actions) && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {meta ? <PageMeta items={meta} /> : <span />}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
      </header>
    </>
  )
}
