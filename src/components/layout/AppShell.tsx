import { useEffect, useRef, useState, type ReactNode } from 'react'

import { APP } from '@/app/config'
import { SideNav } from '@/components/layout/SideNav'
import { TopBar } from '@/components/layout/TopBar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { prefs } from '@/lib/prefs'
import { useRoute } from '@/lib/router'
import { cn } from '@/lib/utils'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { findNavItem, type NavSection } from './nav'

const COLLAPSED_KEY = 'nav.collapsed'

function initialCollapsed(): boolean {
  const stored = prefs.getItem(COLLAPSED_KEY)
  if (stored !== null) return stored === 'true'
  // Small screens start on the icon rail so the page keeps its width.
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

/**
 * The app frame: drawer on the left, top bar and the current page on the
 * right. Pages come from `sections` (src/app/routes.tsx). A normal page sits
 * in a centred column (max 1536px, 24/32px gutters) and the body scrolls; a
 * `layout: 'full'` page fills the body edge to edge and handles its own scrolling.
 */
export function AppShell({ sections, topBarActions }: { sections: NavSection[]; topBarActions?: ReactNode }) {
  const [path, navigate] = useRoute()
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const body = useRef<HTMLDivElement>(null)

  const found = findNavItem(sections, path)
  const current = found?.item
  const Page = current?.page ?? NotFoundPage
  const full = current?.layout === 'full'
  // A hidden subpage (a detail page) lights up its parent in the drawer.
  const navCurrent = current?.hidden && found?.parent ? found.parent.path : (current?.path ?? path)

  // A new page starts at the top, and the document title follows it.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
    document.title = current && current.path !== '/' ? `${current.label} · ${APP.name}` : APP.name
  }, [current])

  const toggleCollapsed = () => {
    const next = !collapsed
    prefs.setItem(COLLAPSED_KEY, String(next))
    setCollapsed(next)
  }

  return (
    <TooltipProvider>
      <div className="flex h-full overflow-hidden">
        <SideNav sections={sections} current={navCurrent} onNavigate={navigate} collapsed={collapsed} />
        <div ref={body} className={cn('flex min-w-0 flex-1 flex-col', full ? 'overflow-hidden' : 'overflow-y-auto')}>
          <TopBar
            section={found?.section.heading}
            parent={found?.parent ? { label: found.parent.label, path: found.parent.path } : undefined}
            onNavigate={navigate}
            title={current?.label ?? 'Not found'}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            actions={topBarActions}
          />
          {full ? (
            <main className="min-h-0 flex-1 overflow-hidden">
              <Page key={current?.path} />
            </main>
          ) : (
            <main className="mx-auto w-full max-w-[96rem] p-6 lg:p-8">
              <Page key={current?.path} />
            </main>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
