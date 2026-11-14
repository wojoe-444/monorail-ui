import { FolderKanban, House, Settings, Shapes } from 'lucide-react'

import type { NavSection } from '@/components/layout/nav'
import { ComponentsPage } from '@/pages/ComponentsPage'
import { HomePage } from '@/pages/HomePage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { SettingsPage } from '@/pages/SettingsPage'

/**
 * Every page in the app, in drawer order. This is the one place to add a
 * page: give it a path, a label, a lucide icon and the component to render.
 *
 * - `heading` groups items under an overline label in the drawer.
 * - `children` makes a collapsible group (one level deep).
 * - `layout: 'full'` drops the page padding and max width (canvases, editors, maps).
 * - `hidden: true` keeps a route out of the drawer (detail pages, wizards).
 * - The `pinned` section sits at the bottom of the drawer (Settings).
 *
 * The Projects group and the Reference section are examples: replace them.
 */
export const NAV: NavSection[] = [
  {
    items: [{ path: '/', label: 'Home', icon: House, page: HomePage }],
  },
  {
    heading: 'Workspace',
    items: [
      {
        path: '/projects',
        label: 'Projects',
        icon: FolderKanban,
        page: () => <PlaceholderPage title="Projects" />,
        children: [
          { path: '/projects/active', label: 'Active', page: () => <PlaceholderPage title="Active projects" /> },
          { path: '/projects/archived', label: 'Archived', page: () => <PlaceholderPage title="Archived projects" /> },
        ],
      },
    ],
  },
  {
    heading: 'Reference',
    items: [{ path: '/components', label: 'Components', icon: Shapes, page: ComponentsPage }],
  },
  {
    pinned: true,
    items: [{ path: '/settings', label: 'Settings', icon: Settings, page: SettingsPage }],
  },
]
