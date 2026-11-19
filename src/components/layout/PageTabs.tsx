import { useEffect, useRef, useState } from 'react'

import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { cn } from '@/lib/utils'

interface PageTabsProps {
  tabs: PageTab[]
  'aria-label': string
  /**
   * - `chips` (default): tinted chips, the standard bar under `PageHeader`.
   * - `underline`: text tabs on a bottom rule. `EntityHeader` uses these.
   * - `side`: a vertical list from `lg` up, chips below it. `SplitPage` uses these.
   */
  variant?: 'chips' | 'underline' | 'side'
  /** `sm` fits the 40px top bar (`PageCommandBar`). Chips only. */
  size?: 'default' | 'sm'
  /** Leave out the icons (to fit more tabs, e.g. in the top bar). */
  hideIcons?: boolean
  /**
   * Stick under the top bar while the page scrolls (default for chips). The
   * bar bleeds to the edges of the page column. Pass `false` on
   * `layout: 'full'` pages, inside cards, or in the top bar. Ignored by the
   * underline and side variants, which never stick on their own.
   */
  sticky?: boolean
  className?: string
}

/**
 * Left-to-right sub-navigation inside a page: icon + label + count. Goes
 * right under `PageHeader`. Each tab is a link (`?tab=<id>`); read the active
 * tab with `usePageTab(tabs)`. On narrow screens the row scrolls sideways: a
 * mouse wheel scrolls it, the edges fade where tabs are out of sight, and the
 * active tab is kept in view.
 */
export function PageTabs({ tabs, variant = 'chips', size = 'default', hideIcons = false, sticky = true, className, ...rest }: PageTabsProps) {
  const [active, , hrefFor] = usePageTab(tabs)
  const ref = useRef<HTMLElement>(null)
  // Which edges have tabs scrolled out of sight, so a fade can say there is more.
  const [more, setMore] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setMore({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 })
    // A mouse wheel scrolls the row sideways.
    const wheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    el.addEventListener('wheel', wheel, { passive: false })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      el.removeEventListener('wheel', wheel)
      ro.disconnect()
    }
  }, [])

  // Keep the active tab in view. Scrolls only the row, never the page.
  useEffect(() => {
    const el = ref.current
    const tab = el?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!el || !tab || el.scrollWidth <= el.clientWidth) return
    const left = tab.offsetLeft // the nav is `relative`, so this is from its left edge
    if (left < el.scrollLeft) el.scrollLeft = left
    else if (left + tab.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = left + tab.offsetWidth - el.clientWidth
  }, [active])

  const fade =
    more.left && more.right
      ? '[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]'
      : more.right
        ? '[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]'
        : more.left
          ? '[mask-image:linear-gradient(to_right,transparent,black_2rem)]'
          : ''

  const row = (
    <nav
      ref={ref}
      aria-label={rest['aria-label']}
      className={cn(
        'relative flex overflow-x-auto [scrollbar-width:none]',
        variant === 'underline' ? 'gap-6' : 'gap-1',
        variant === 'side' && 'lg:flex-col',
        fade,
      )}
    >
      {tabs.map((tab) => {
        const current = tab.id === active
        const Icon = tab.icon
        return (
          <a
            key={tab.id}
            href={hrefFor(tab.id)}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              variant === 'chips' && [
                'rounded-md',
                size === 'sm' ? 'h-7 px-2.5' : 'h-9 px-3',
                current
                  ? 'bg-primary-soft text-primary-soft-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ],
              variant === 'underline' && [
                'h-11 border-b-2 px-0.5',
                current
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              ],
              variant === 'side' && [
                'h-9 rounded-md border px-3',
                current
                  ? 'bg-card text-foreground shadow-elevation-1'
                  : 'border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ],
            )}
          >
            {Icon && !hideIcons && <Icon className="size-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  current && variant === 'chips' ? 'bg-primary/15' : 'bg-muted text-muted-foreground',
                  variant === 'side' && 'ml-auto',
                )}
              >
                {tab.count}
              </span>
            )}
          </a>
        )
      })}
    </nav>
  )

  if (variant !== 'chips' || !sticky) return <div className={className}>{row}</div>

  // top-10 = TopBar height; the negative margins match AppShell's page padding.
  return (
    <div className={cn('sticky top-10 z-[5] -mx-6 border-b bg-background/85 px-6 py-2 backdrop-blur lg:-mx-8 lg:px-8', className)}>
      {row}
    </div>
  )
}
