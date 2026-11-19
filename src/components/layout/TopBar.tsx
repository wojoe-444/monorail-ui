import type { MouseEvent, ReactNode } from 'react'
import { ChevronRight, Moon, PanelLeft, Search, Sun } from 'lucide-react'

import { APP } from '@/app/config'
import { openSearch } from '@/components/search/store'
import { Button } from '@/components/ui/button'
import { href } from '@/lib/router'
import { useThemeMode } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface TopBarProps {
  /** Nav section of the current page, e.g. "Building blocks", linked to the section's first page. Home has none. */
  section?: { label: string; path: string }
  /** Parent page of a subpage, shown as a link between section and title. */
  parent?: { label: string; path: string }
  onNavigate?: (path: string) => void
  title: string
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Extra controls on the right, before the light / dark toggle. */
  actions?: ReactNode
  /** Receives the element pages fill through `TopBarPortal`. */
  slotRef?: (el: HTMLDivElement | null) => void
  /** A page's `TopBarPortal` has taken the breadcrumb's place. */
  hideBreadcrumb?: boolean
}

/**
 * 40px app bar, always visible: drawer toggle, a section > page breadcrumb
 * (each step a real link), the search field (opens the command palette, like
 * Ctrl+K) and a light / dark toggle on the right. The color scheme lives in
 * Settings > Appearance. Pages can put their own title and controls here with
 * `TopBarPortal`; the search field then shrinks to an icon to make room.
 */
export function TopBar({
  section,
  parent,
  onNavigate,
  title,
  collapsed,
  onToggleCollapsed,
  actions,
  slotRef,
  hideBreadcrumb,
}: TopBarProps) {
  const [mode, toggleMode] = useThemeMode()
  const modeLabel = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <header data-slot="top-bar" className="sticky top-0 z-10 flex h-10 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1.5 size-7"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        <PanelLeft />
      </Button>
      <span className="h-5 w-px shrink-0 bg-border" aria-hidden />
      <nav aria-label="Breadcrumb" className={cn('min-w-0 flex-1 items-center gap-1.5 text-sm', hideBreadcrumb ? 'hidden' : 'flex')}>
        <Crumb label={section?.label ?? APP.name} path={section?.path ?? '/'} onNavigate={onNavigate} className="hidden sm:inline" />
        <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden />
        {parent && (
          <>
            <Crumb label={parent.label} path={parent.path} onNavigate={onNavigate} />
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </>
        )}
        <span className="min-w-0 flex-1 truncate font-medium" aria-current="page">
          {title}
        </span>
      </nav>
      <div ref={slotRef} className="flex min-w-0 flex-1 items-center gap-3 empty:hidden" />
      <TopBarSearch compact={hideBreadcrumb} />
      {actions}
      <Button variant="ghost" size="icon" className="-mr-1.5 size-7" onClick={toggleMode} aria-label={modeLabel} title={modeLabel}>
        {mode === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </header>
  )
}

/** A breadcrumb step: a real link (copyable, opens in a new tab) that navigates inside the app on a plain click. */
function Crumb({
  label,
  path,
  onNavigate,
  className,
}: {
  label: string
  path: string
  onNavigate?: (path: string) => void
  className?: string
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onNavigate(path)
  }
  return (
    <a
      href={href(path)}
      onClick={onClick}
      className={cn(
        'min-w-0 max-w-[40%] truncate rounded-sm text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {label}
    </a>
  )
}

/**
 * The top bar's search field: looks like an input and opens the command
 * palette (the same as Ctrl+K). Typing a letter while it has focus opens the
 * palette with that letter. Below `md`, or while a page fills the top bar
 * (`compact`), it is an icon button.
 */
function TopBarSearch({ compact }: { compact?: boolean }) {
  const label = `Search ${APP.name} (Ctrl+K)`
  return (
    <button
      type="button"
      onClick={() => openSearch()}
      onKeyDown={(e) => {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
          e.preventDefault()
          openSearch({ query: e.key })
        }
      }}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-7 shrink-0 items-center gap-2 rounded-md border border-input bg-card px-2 text-xs text-muted-foreground transition-colors outline-none hover:border-ring/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30',
        !compact && 'md:w-64 lg:w-80',
      )}
    >
      <Search className="size-3.5 shrink-0" aria-hidden />
      {!compact && (
        <>
          <span className="hidden flex-1 truncate text-left md:inline">Search or browse pages</span>
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 font-mono text-[10px] md:inline">Ctrl K</kbd>
        </>
      )}
    </button>
  )
}
