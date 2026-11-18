import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { cn } from '@/lib/utils'

interface PageTabsProps {
  tabs: PageTab[]
  'aria-label': string
  /**
   * Stick under the top bar while the page scrolls (default). The bar bleeds
   * to the edges of the page column. Pass `false` on `layout: 'full'` pages
   * or inside cards.
   */
  sticky?: boolean
  className?: string
}

/**
 * Left-to-right sub-navigation inside a page: icon + label + count chips, the
 * active one tinted with the brand color. Goes right under `PageHeader`. Each
 * tab is a link (`?tab=<id>`); read the active tab with `usePageTab(tabs)`.
 * On narrow screens the row scrolls sideways.
 */
export function PageTabs({ tabs, sticky = true, className, ...rest }: PageTabsProps) {
  const [active, , hrefFor] = usePageTab(tabs)

  const row = (
    <nav aria-label={rest['aria-label']} className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {tabs.map((tab) => {
        const current = tab.id === active
        const Icon = tab.icon
        return (
          <a
            key={tab.id}
            href={hrefFor(tab.id)}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              current
                ? 'bg-primary-soft text-primary-soft-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {Icon && <Icon className="size-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  current ? 'bg-primary/15' : 'bg-muted text-muted-foreground',
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

  if (!sticky) return <div className={className}>{row}</div>

  // top-16 = TopBar height; the negative margins match AppShell's page padding.
  return (
    <div
      className={cn(
        'sticky top-16 z-[5] -mx-6 border-b bg-background/85 px-6 py-2 backdrop-blur lg:-mx-8 lg:px-8',
        className,
      )}
    >
      {row}
    </div>
  )
}
