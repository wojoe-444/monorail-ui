import type { ReactNode } from 'react'
import { ChevronRight, Moon, PanelLeft, Sun } from 'lucide-react'

import { APP } from '@/app/config'
import { Button } from '@/components/ui/button'
import { useThemeMode } from '@/lib/theme'

interface TopBarProps {
  /** Nav section of the current page, e.g. "Workspace". Home has none. */
  section?: string
  /** Parent page of a subpage, shown as a link between section and title. */
  parent?: { label: string; path: string }
  onNavigate?: (path: string) => void
  title: string
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Extra controls on the right, before the light / dark toggle. */
  actions?: ReactNode
}

/**
 * 64px app bar: drawer toggle, a section > page breadcrumb, and a light /
 * dark toggle on the right. The color scheme lives in Settings > Appearance.
 */
export function TopBar({ section, parent, onNavigate, title, collapsed, onToggleCollapsed, actions }: TopBarProps) {
  const [mode, toggleMode] = useThemeMode()
  const modeLabel = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/85 px-6 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 size-8"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        <PanelLeft />
      </Button>
      <span className="h-6 w-px bg-border" aria-hidden />
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <span className="hidden shrink-0 text-muted-foreground sm:inline">{section ?? APP.name}</span>
        <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden />
        {parent && (
          <>
            <button
              type="button"
              onClick={() => onNavigate?.(parent.path)}
              className="shrink-0 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {parent.label}
            </button>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </>
        )}
        <span className="truncate font-medium" aria-current="page">
          {title}
        </span>
      </nav>
      {actions}
      <Button variant="ghost" size="icon" className="-mr-2 size-8" onClick={toggleMode} aria-label={modeLabel} title={modeLabel}>
        {mode === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </header>
  )
}
