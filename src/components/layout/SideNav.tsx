import { useState } from 'react'
import { ChevronDown, ChevronRight, Circle } from 'lucide-react'

import { APP } from '@/app/config'
import { BrandTile } from '@/components/layout/BrandMark'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { readJson, writeJson } from '@/lib/prefs'
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
 * Permanent navigation drawer: a 64px brand header aligned with the top bar,
 * grouped sections with overline labels, 40px items on soft pills, and the
 * active item filled with the drawer's primary color. Collapses to a 72px
 * icon rail; the toggle lives in the top bar.
 *
 * Items with subpages are collapsible groups drawn as a tree: the subpages
 * are plain text rows on a thin guide line under the parent's icon, the
 * current one tinted with a primary bar. Open/closed is remembered per group;
 * a closed group that holds the current page shows a dot. On the icon rail a
 * group's icon opens a menu with its pages.
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
        collapsed ? 'w-[72px]' : 'w-[256px]',
      )}
    >
      {/* Brand header: height matches the 64px top bar */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <BrandTile name={APP.name} className="size-8" />
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">{APP.name}</span>
            <span className="truncate text-xs text-sidebar-muted-foreground">{APP.tagline}</span>
          </div>
        )}
      </div>

      <nav
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4',
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
            <div key={section.heading ?? i} className={cn(i > 0 && 'mt-4')}>
              {section.heading && !collapsed && (
                <div className="flex h-8 items-center px-3 text-[11px] font-semibold tracking-wider text-sidebar-muted-foreground uppercase">
                  {section.heading}
                </div>
              )}
              {section.heading && collapsed && <div className="mx-2 mb-3 h-px bg-sidebar-border" />}
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item.path}>
                    {item.children && item.children.length > 0 ? (
                      <NavGroup item={item} current={current} collapsed={collapsed} onNavigate={onNavigate} />
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
        <div className="flex shrink-0 flex-col gap-1 border-t border-sidebar-border px-4 py-3">
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
        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-warning" aria-label={`${item.badge} need attention`} />
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
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

const OPEN_KEY = 'nav.open'

/** Open/closed state of one nav group, remembered in prefs. Groups start closed (the current page's group opens itself), so a large catalog stays scannable. */
function useGroupOpen(path: string, fallback: boolean): [boolean, (open: boolean) => void] {
  const [open, setOpenState] = useState(() => readJson<Record<string, boolean>>(OPEN_KEY, {})[path] ?? fallback)
  const setOpen = (next: boolean) => {
    setOpenState(next)
    writeJson(OPEN_KEY, { ...readJson<Record<string, boolean>>(OPEN_KEY, {}), [path]: next })
  }
  return [open, setOpen]
}

function NavGroup({
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
  const activeChild = children.find((c) => c.path === current)
  const [open, setOpen] = useGroupOpen(item.path, !!activeChild || item.path === current)

  // Arriving on a subpage from elsewhere (a link) opens its group.
  // Only when the current subpage changes, so the person can still close it.
  const activeChildPath = activeChild?.path
  const [seenChild, setSeenChild] = useState(activeChildPath)
  if (seenChild !== activeChildPath) {
    setSeenChild(activeChildPath)
    if (activeChildPath && !open) setOpen(true)
  }

  if (collapsed) return <RailGroup item={item} current={current} onNavigate={onNavigate} />

  const active = item.path === current
  const Icon = item.icon ?? Circle
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <div>
      <div
        className={cn(
          'flex h-10 w-full items-center rounded-md text-sm transition-colors',
          active
            ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25'
            : 'bg-sidebar-accent/70 text-sidebar-accent-foreground hover:bg-sidebar-accent',
          !active && activeChild && 'font-medium',
        )}
      >
        <button
          type="button"
          onClick={() => {
            onNavigate(item.path)
            if (!open) setOpen(true)
          }}
          aria-current={active ? 'page' : undefined}
          className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-md pl-3 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">{item.label}</span>
          {!open && activeChild && (
            <span
              className={cn('size-1.5 shrink-0 rounded-full', active ? 'bg-sidebar-primary-foreground' : 'bg-sidebar-primary')}
              aria-label={`${activeChild.label} is open`}
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-md opacity-60 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Chevron className="size-4" />
        </button>
      </div>
      {open && (
        // Tree: a hairline guide under the parent's icon (12px padding + half of 16px).
        <ul className="mt-0.5 mb-1 ml-[19px] flex flex-col border-l border-sidebar-border" aria-label={`${item.label} pages`}>
          {children.map((child) => {
            const on = child.path === current
            return (
              <li key={child.path}>
                <button
                  type="button"
                  onClick={() => onNavigate(child.path)}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    '-ml-px flex h-8 w-full items-center gap-2 rounded-r-md border-l-2 pr-3 pl-5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    on
                      ? 'border-sidebar-primary bg-sidebar-primary/10 font-semibold text-sidebar-accent-foreground dark:text-sidebar-primary'
                      : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                  )}
                >
                  <span className="flex-1 truncate">{child.label}</span>
                  {child.badge && (
                    <span className="min-w-5 rounded-full bg-warning px-1.5 text-center text-[11px] leading-5 font-semibold text-black">
                      {child.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** A group on the 72px icon rail: the icon opens a menu with the group's pages. */
function RailGroup({ item, current, onNavigate }: { item: NavItem; current: string; onNavigate: (path: string) => void }) {
  const children = item.children ?? []
  const active = item.path === current
  const holdsCurrent = children.some((c) => c.path === current)
  const Icon = item.icon ?? Circle
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${item.label} pages`}
              className={cn(
                'relative flex h-10 w-full items-center justify-center rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active || holdsCurrent
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25'
                  : 'bg-sidebar-accent/70 text-sidebar-accent-foreground hover:bg-sidebar-accent',
              )}
            >
              <Icon className="size-4 shrink-0" />
              <ChevronRight className="absolute right-1 size-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start" sideOffset={12}>
        <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onNavigate(item.path)} className={cn(active && 'font-semibold')}>
          <Icon />
          Overview
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {children.map((child) => {
          const ChildIcon = child.icon
          return (
            <DropdownMenuItem
              key={child.path}
              onSelect={() => onNavigate(child.path)}
              className={cn(child.path === current && 'font-semibold')}
            >
              {ChildIcon && <ChildIcon />}
              {child.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
