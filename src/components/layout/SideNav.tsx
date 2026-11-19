import { ChevronRight, Circle } from 'lucide-react'

import { APP } from '@/app/config'
import { BrandTile } from '@/components/layout/BrandMark'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { visibleItems, type NavItem, type NavSection } from './nav'

interface SideNavProps {
  sections: NavSection[]
  /** Path of the current nav item. */
  current: string
  onNavigate: (path: string) => void
  collapsed: boolean
}

/**
 * Permanent navigation drawer: a 40px brand header aligned with the top bar,
 * grouped sections with overline labels, 40px items on soft pills, and the
 * active item filled with the drawer's primary color. By default it is a
 * 60px icon rail where hovering or focusing an icon shows its name in a
 * tooltip; the toggle in the top bar opens it to 256px with labels.
 *
 * Items with subpages never expand inside the drawer: they open a panel just
 * right of it with the item's pages (`NavFlyout`), in the open drawer and on
 * the rail alike.
 *
 * Colors come from the sidebar-* tokens, so each palette's drawer style
 * (dark, light or bold) applies without changes here.
 */
export function SideNav({ sections, current, onNavigate, collapsed }: SideNavProps) {
  const mainSections = sections.filter((s) => !s.pinned)
  const pinned = sections.filter((s) => s.pinned).flatMap((s) => visibleItems(s.items))
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[256px]',
      )}
    >
      {/* Brand header: height matches the 40px top bar */}
      <div
        className={cn(
          'flex h-10 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <BrandTile name={APP.name} className="size-7" />
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] leading-4 font-semibold text-sidebar-accent-foreground">{APP.name}</span>
            <span className="truncate text-[11px] leading-4 text-sidebar-muted-foreground">{APP.tagline}</span>
          </div>
        )}
      </div>

      <nav
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3',
          collapsed && 'px-2.5',
          // Keep the narrow rail centered without a native scrollbar taking icon space.
          // Overflow still scrolls with the wheel, touch, and keyboard focus.
          collapsed && '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
        aria-label="Main"
      >
        {mainSections.map((section, i) => {
          const items = visibleItems(section.items)
          if (items.length === 0) return null
          return (
            <div key={section.heading ?? i} className={cn(i > 0 && 'mt-3')}>
              {section.heading && !collapsed && (
                <div className="flex h-8 items-center px-3 text-[11px] font-semibold tracking-wider text-sidebar-muted-foreground uppercase">
                  {section.heading}
                </div>
              )}
              {section.heading && collapsed && <div className="mx-2 mb-2 h-px bg-sidebar-border" />}
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item.path}>
                    {item.children && item.children.length > 0 ? (
                      <NavFlyout item={item} current={current} collapsed={collapsed} onNavigate={onNavigate} />
                    ) : (
                      <NavButton item={item} current={current} collapsed={collapsed} onNavigate={onNavigate} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      {pinned.length > 0 && (
        // Pinned items (Settings) sit above the bottom edge, outside the scrolling list.
        <div className={cn('flex shrink-0 flex-col gap-1 border-t border-sidebar-border px-4 py-2', collapsed && 'px-2.5')}>
          {pinned.map((item) => (
            <NavButton
              key={item.path}
              item={{ ...item, children: undefined }}
              current={item.children?.some((c) => c.path === current) ? item.path : current}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </aside>
  )
}

/** Items sit 16px (open drawer) or 10px (rail) inside the drawer's edge; this puts a tooltip or panel 8px past it. */
function edgeOffset(collapsed: boolean) {
  return collapsed ? 18 : 24
}

function NavButton({
  item,
  current,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  current: string
  collapsed: boolean
  onNavigate: (path: string) => void
}) {
  const active = item.path === current
  const Icon = item.icon ?? Circle
  const button = (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        'relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25'
          : 'bg-sidebar-accent/70 text-sidebar-accent-foreground hover:bg-sidebar-accent',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {collapsed && item.badge && (
        <span className="absolute top-1 right-1 size-2 rounded-full bg-warning" aria-label={`${item.badge} need attention`} />
      )}
      {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
      {!collapsed && item.badge && (
        <span
          className={cn(
            'min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold',
            active ? 'bg-sidebar-primary-foreground/20' : 'bg-warning text-black',
          )}
        >
          {item.badge}
        </span>
      )}
    </button>
  )
  if (!collapsed) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={edgeOffset(collapsed)}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * An item with subpages. It never expands inside the drawer: clicking it (or
 * Enter / Space / arrow keys) opens a panel just right of the drawer's edge
 * listing the item's own page first, then its subpages, the current one
 * highlighted. Same in the open drawer and on the icon rail. In the open
 * drawer the item shows the open subpage's name under its label.
 */
function NavFlyout({
  item,
  current,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  current: string
  collapsed: boolean
  onNavigate: (path: string) => void
}) {
  const children = item.children ?? []
  const active = item.path === current
  const activeChild = children.find((c) => c.path === current)
  const Icon = item.icon ?? Circle
  const pages: { path: string; label: string; badge?: string }[] = [{ path: item.path, label: 'Overview' }, ...children]

  const trigger = (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={collapsed ? `${item.label} pages` : undefined}
        className={cn(
          'relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          collapsed && 'justify-center px-0',
          active || activeChild
            ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25'
            : 'bg-sidebar-accent/70 text-sidebar-accent-foreground hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent',
        )}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && (
          <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
            <span className="truncate">{item.label}</span>
            {activeChild && <span className="truncate text-[11px] font-normal opacity-75">{activeChild.label}</span>}
          </span>
        )}
        {/* The open drawer marks items with subpages; rail icons stay clean (the tooltip names the item). */}
        {!collapsed && <ChevronRight className="size-4 shrink-0 opacity-60" />}
      </button>
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu modal={false}>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={edgeOffset(collapsed)}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={edgeOffset(collapsed)}
        alignOffset={-8}
        aria-label={`${item.label} pages`}
        className="min-w-44 rounded-xl p-1.5"
      >
        {pages.map((page) => {
          const on = page.path === current
          return (
            <DropdownMenuItem
              key={page.path}
              onSelect={() => onNavigate(page.path)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'h-9 px-3 text-muted-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
                on && 'bg-muted font-semibold text-foreground',
              )}
            >
              <span className="flex-1 truncate">{page.label}</span>
              {page.badge && (
                <span className="min-w-5 rounded-full bg-warning px-1.5 text-center text-[11px] leading-5 font-semibold text-black">
                  {page.badge}
                </span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
