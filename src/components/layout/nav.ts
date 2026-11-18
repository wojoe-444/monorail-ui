import type { ComponentType, SVGProps } from 'react'

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export interface NavItem {
  /** Route path, e.g. "/projects". Also the item's identity. */
  path: string
  label: string
  /** A lucide-react icon. Required for top-level items; subpages may omit it. */
  icon?: IconComponent
  /** The page to render at this path. */
  page: ComponentType
  /** One line on what the page is for (the catalog index shows it). */
  description?: string
  /** A short count or label on the item, e.g. "3". */
  badge?: string
  /** Subpages, listed in a panel that opens right of the drawer (SideNav `NavFlyout`). One level deep. */
  children?: NavItem[]
  /** `full`: the page fills the body edge to edge, with no padding or max width. */
  layout?: 'page' | 'full'
  /** Routable but not listed in the drawer. */
  hidden?: boolean
}

export interface NavSection {
  heading?: string
  /** Drawn at the bottom of the drawer instead of in the scrolling list (Settings). */
  pinned?: boolean
  items: NavItem[]
}

/** The route path without its query string. */
export function routePath(path: string): string {
  return path.split('?')[0] || '/'
}

/** Find an item (or subpage) by path, with its section and parent item. */
export function findNavItem(
  sections: NavSection[],
  path: string,
): { item: NavItem; section: NavSection; parent?: NavItem } | undefined {
  const p = routePath(path)
  for (const section of sections) {
    for (const item of section.items) {
      if (item.path === p) return { item, section }
      const child = item.children?.find((c) => c.path === p)
      if (child) return { item: child, section, parent: item }
    }
  }
  return undefined
}

/** The visible items of a section (hidden routes left out, recursively). */
export function visibleItems(items: NavItem[]): NavItem[] {
  return items
    .filter((i) => !i.hidden)
    .map((i) => (i.children ? { ...i, children: i.children.filter((c) => !c.hidden) } : i))
}
