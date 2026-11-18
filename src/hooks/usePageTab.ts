import { useCallback } from 'react'

import type { IconComponent } from '@/components/layout/nav'
import { routePath } from '@/components/layout/nav'
import { href, navigate, useRoute, useSearchParams } from '@/lib/router'

/** One section of a page, shown as a tab (`PageTabs`) or a step (`PageSteps`). */
export interface PageTab {
  id: string
  label: string
  /** A lucide-react icon. Shown by `PageTabs`. */
  icon?: IconComponent
  /** Small count next to the label, e.g. open items. Shown by `PageTabs`. */
  count?: number
}

/**
 * The active tab of the current page, read from the URL (`?tab=activity`), so
 * every tab is linkable, survives a reload and works with back/forward. The
 * first tab is the default and has no query. Other query params are kept.
 *
 *   const [tab, setTab, tabHref] = usePageTab(TABS)
 */
export function usePageTab(tabs: PageTab[]) {
  const [path] = useRoute()
  const requested = useSearchParams().get('tab')
  const active = tabs.some((t) => t.id === requested) ? (requested as string) : tabs[0].id

  const pathFor = useCallback(
    (id: string) => {
      const next = new URLSearchParams(path.split('?')[1] ?? '')
      if (id === tabs[0].id) next.delete('tab')
      else next.set('tab', id)
      const query = next.toString()
      return query ? `${routePath(path)}?${query}` : routePath(path)
    },
    [path, tabs],
  )

  const setActive = useCallback((id: string) => navigate(pathFor(id)), [pathFor])
  const hrefFor = useCallback((id: string) => href(pathFor(id)), [pathFor])

  return [active, setActive, hrefFor] as const
}
