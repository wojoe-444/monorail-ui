import {
  BookA,
  BookOpen,
  Database,
  FileText,
  FolderKanban,
  History,
  House,
  LayoutGrid,
  Library,
  List,
  ListOrdered,
  PanelTop,
  Settings,
  Shapes,
  TrainFront,
} from 'lucide-react'

import type { NavSection } from '@/components/layout/nav'
import { ComponentsPage } from '@/pages/ComponentsPage'
import { HomePage } from '@/pages/HomePage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StepsPageExample } from '@/pages/StepsPageExample'
import { TabbedPageExample } from '@/pages/TabbedPageExample'
import { WikiArticlePage } from '@/pages/wiki/WikiArticlePage'
import { WikiDatasetPage } from '@/pages/wiki/WikiDatasetPage'
import { WikiDirectoryPage } from '@/pages/wiki/WikiDirectoryPage'
import { WikiDocsPage } from '@/pages/wiki/WikiDocsPage'
import { WikiGlossaryPage } from '@/pages/wiki/WikiGlossaryPage'
import { WikiLayoutsPage } from '@/pages/wiki/WikiLayoutsPage'
import { WikiPortalPage } from '@/pages/wiki/WikiPortalPage'
import { WikiStationPage } from '@/pages/wiki/WikiStationPage'
import { WikiTimelinePage } from '@/pages/wiki/WikiTimelinePage'

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
 * The Projects group, the Wiki drafts section and the Reference section are
 * examples: replace them.
 * Keep TabbedPageExample / StepsPageExample as usage references until the
 * app has its own PageTabs / PageSteps pages.
 */
export const NAV: NavSection[] = [
  {
    items: [{ path: '/', label: 'Home', icon: House, page: HomePage }],
  },
  {
    heading: 'Wiki drafts',
    items: [
      { path: '/wiki/layouts', label: 'All layouts', icon: LayoutGrid, page: WikiLayoutsPage },
      { path: '/wiki', label: 'A · Portal', icon: Library, page: WikiPortalPage },
      { path: '/wiki/article', label: 'B · Article', icon: FileText, page: WikiArticlePage },
      { path: '/wiki/station', label: 'C · Entity profile', icon: TrainFront, page: WikiStationPage },
      { path: '/wiki/dataset', label: 'D · Dataset', icon: Database, page: WikiDatasetPage },
      { path: '/wiki/docs', label: 'E · Three-pane docs', icon: BookOpen, page: WikiDocsPage, layout: 'full' },
      { path: '/wiki/stations', label: 'F · Directory', icon: List, page: WikiDirectoryPage },
      { path: '/wiki/glossary', label: 'G · Glossary', icon: BookA, page: WikiGlossaryPage },
      { path: '/wiki/timeline', label: 'H · Timeline', icon: History, page: WikiTimelinePage },
    ],
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
    items: [
      { path: '/components', label: 'Components', icon: Shapes, page: ComponentsPage },
      { path: '/examples/tabs', label: 'Page tabs', icon: PanelTop, page: TabbedPageExample },
      { path: '/examples/steps', label: 'Step flow', icon: ListOrdered, page: StepsPageExample },
    ],
  },
  {
    pinned: true,
    items: [{ path: '/settings', label: 'Settings', icon: Settings, page: SettingsPage }],
  },
]
