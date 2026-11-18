import {
  BookA,
  BookOpen,
  Database,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  LayoutGrid,
  Library,
  List,
  ListOrdered,
  Map as MapIcon,
  PanelTop,
  PanelsTopLeft,
  Settings,
  Shapes,
  Sparkles,
  SquareLibrary,
  TrainFront,
} from 'lucide-react'

import type { NavItem, NavSection } from '@/components/layout/nav'
import { ANNOTATED_PAGES } from '@/features/lab/annotated/pages'
import { EXPERIMENTS, GROUP_LABELS, GROUP_ORDER, type ExperimentGroup } from '@/features/lab/catalog'
import { NARRATIVE_PAGES } from '@/features/lab/narrative/pages'
import { CatalogPage } from '@/pages/CatalogPage'
import { ComponentsPage } from '@/pages/ComponentsPage'
import { BannerExample } from '@/pages/headers/BannerExample'
import { CollapsingExample } from '@/pages/headers/CollapsingExample'
import { CommandBarExample } from '@/pages/headers/CommandBarExample'
import { EntityExample } from '@/pages/headers/EntityExample'
import { ListHeaderExample } from '@/pages/headers/ListHeaderExample'
import { PageHeadersPage } from '@/pages/headers/PageHeadersPage'
import { SplitPageExample } from '@/pages/headers/SplitPageExample'
import { SummaryHeaderExample } from '@/pages/headers/SummaryHeaderExample'
import { TaskBarExample } from '@/pages/headers/TaskBarExample'
import { HomePage } from '@/pages/HomePage'
import { AlmanacPage } from '@/pages/lab/AlmanacPage'
import { AskPage } from '@/pages/lab/AskPage'
import { AtlasPage } from '@/pages/lab/AtlasPage'
import { AttentionPage } from '@/pages/lab/AttentionPage'
import { BoxScorePage } from '@/pages/lab/BoxScorePage'
import { ChartPage } from '@/pages/lab/ChartPage'
import { dashboardGroupPage } from '@/pages/lab/DashboardGroupPage'
import { DeparturesPage } from '@/pages/lab/DeparturesPage'
import { DiffPage } from '@/pages/lab/DiffPage'
import { ForecastPage } from '@/pages/lab/ForecastPage'
import { GridClockPage } from '@/pages/lab/GridClockPage'
import { InboxPage } from '@/pages/lab/InboxPage'
import { LedgerPage } from '@/pages/lab/LedgerPage'
import { LifelinesPage } from '@/pages/lab/LifelinesPage'
import { PagesPage } from '@/pages/lab/PagesPage'
import { SpecimenPage } from '@/pages/lab/SpecimenPage'
import { TerminalPage } from '@/pages/lab/TerminalPage'
import { WirePage } from '@/pages/lab/WirePage'
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
 * - `description` is the line the Catalog index shows for the page.
 * - The `pinned` section sits at the bottom of the drawer (Settings).
 *
 * The app doubles as the template's catalog: Building blocks, Page types and
 * Dashboards show everything the kit can do. A new app keeps the sections it
 * wants and deletes the rest (see "Starting a new app" in AGENTS.md).
 */

/** Page component and layout per dashboard id (titles, icons and groups live in src/features/lab/catalog.ts). */
const DASHBOARD_PAGES: Record<string, Pick<NavItem, 'page' | 'layout'>> = {
  forecast: { page: ForecastPage },
  attention: { page: AttentionPage },
  terminal: { page: TerminalPage, layout: 'full' },
  ask: { page: AskPage },
  specimen: { page: SpecimenPage },
  wire: { page: WirePage, layout: 'full' },
  chart: { page: ChartPage },
  inbox: { page: InboxPage, layout: 'full' },
  diff: { page: DiffPage },
  almanac: { page: AlmanacPage },
  departures: { page: DeparturesPage },
  pages: { page: PagesPage, layout: 'full' },
  'box-score': { page: BoxScorePage },
  ledger: { page: LedgerPage, layout: 'full' },
  'grid-clock': { page: GridClockPage },
  lifelines: { page: LifelinesPage },
  ...NARRATIVE_PAGES,
  ...ANNOTATED_PAGES,
}

const GROUP_ICONS: Record<ExperimentGroup, NavItem['icon']> = {
  favorite: Sparkles,
  narrative: BookOpen,
  annotated: PanelsTopLeft,
  new: LayoutGrid,
  kept: SquareLibrary,
}

const GROUP_SLUGS: Record<ExperimentGroup, string> = {
  favorite: 'favorites',
  narrative: 'narrative',
  annotated: 'annotated',
  new: 'more',
  kept: 'kept',
}

/** One drawer group per dashboard group, its dashboards as subpages. */
const dashboardGroups: NavItem[] = GROUP_ORDER.map((g) => ({
  path: `/dashboards/${GROUP_SLUGS[g]}`,
  label: GROUP_LABELS[g],
  icon: GROUP_ICONS[g],
  page: dashboardGroupPage(g),
  children: EXPERIMENTS.filter((e) => e.group === g).map((e) => ({
    path: e.path,
    label: e.title,
    description: e.thesis,
    ...DASHBOARD_PAGES[e.id],
  })),
}))

export const NAV: NavSection[] = [
  {
    items: [{ path: '/', label: 'Catalog', icon: LayoutDashboard, page: CatalogPage }],
  },
  {
    heading: 'Building blocks',
    items: [
      {
        path: '/components',
        label: 'Components',
        icon: Shapes,
        page: ComponentsPage,
        description: 'Every UI kit component in use: buttons, forms, cards, dialogs, menus, KPI tiles, charts.',
      },
      {
        path: '/headers',
        label: 'Page headers',
        icon: PanelsTopLeft,
        page: PageHeadersPage,
        description: 'Nine header styles and when to use each.',
        children: [
          { path: '/headers/command-bar', label: 'Command bar', page: CommandBarExample, description: 'Tools and dense data: title, tabs and actions in the top bar.' },
          { path: '/headers/summary', label: 'Summary', page: SummaryHeaderExample, description: 'Dashboards and reports: metrics beside the title.' },
          { path: '/headers/banner', label: 'Banner', page: BannerExample, description: 'A front door: big title, search and shortcuts.' },
          { path: '/headers/entity', label: 'Entity', page: EntityExample, description: 'Detail pages: icon tile, status badges, facts, underline tabs.' },
          { path: '/headers/list', label: 'List toolbar', page: ListHeaderExample, description: 'Lists and tables: search, filter chips, sort, bulk actions.' },
          { path: '/headers/split', label: 'Side header', page: SplitPageExample, description: 'Settings, forms and docs: a sticky left column.' },
          { path: '/headers/collapsing', label: 'Collapsing', page: CollapsingExample, description: 'Long reading: a large title that moves into the top bar.' },
          { path: '/headers/task', label: 'Task bar', page: TaskBarExample, description: 'Create and edit flows: close, steps, save status, commit.' },
        ],
      },
      { path: '/examples/tabs', label: 'Page tabs', icon: PanelTop, page: TabbedPageExample, description: 'Sections inside one page, kept in the URL.' },
      { path: '/examples/steps', label: 'Step flow', icon: ListOrdered, page: StepsPageExample, description: 'Sub-pages in a set order with Back and Next.' },
    ],
  },
  {
    heading: 'Page types',
    items: [
      {
        path: '/examples/overview',
        label: 'Overview',
        icon: LayoutGrid,
        page: HomePage,
        description: 'A conventional home page: KPI tiles, recent activity, progress.',
      },
      {
        path: '/projects',
        label: 'Nested pages',
        icon: FolderKanban,
        page: () => <PlaceholderPage title="Projects" />,
        description: 'A drawer group with subpages, and the placeholder for pages not built yet.',
        children: [
          { path: '/projects/active', label: 'Active', page: () => <PlaceholderPage title="Active projects" />, description: 'A subpage.' },
          { path: '/projects/archived', label: 'Archived', page: () => <PlaceholderPage title="Archived projects" />, description: 'Another subpage.' },
        ],
      },
      {
        path: '/wiki/layouts',
        label: 'Wiki pages',
        icon: Library,
        page: WikiLayoutsPage,
        description: 'Eight layouts for a knowledge base, side by side.',
        children: [
          { path: '/wiki', label: 'Portal', icon: Library, page: WikiPortalPage, description: 'The wiki front page.' },
          { path: '/wiki/article', label: 'Article', icon: FileText, page: WikiArticlePage, description: 'A long article with contents and infobox.' },
          { path: '/wiki/station', label: 'Entity profile', icon: TrainFront, page: WikiStationPage, description: 'One thing, all its facts.' },
          { path: '/wiki/dataset', label: 'Dataset', icon: Database, page: WikiDatasetPage, description: 'A table with its documentation.' },
          { path: '/wiki/docs', label: 'Three-pane docs', icon: BookOpen, page: WikiDocsPage, layout: 'full', description: 'Navigation, page and outline.' },
          { path: '/wiki/stations', label: 'Directory', icon: List, page: WikiDirectoryPage, description: 'Browse every entry.' },
          { path: '/wiki/glossary', label: 'Glossary', icon: BookA, page: WikiGlossaryPage, description: 'Terms A to Z.' },
          { path: '/wiki/timeline', label: 'Timeline', icon: History, page: WikiTimelinePage, description: 'Events in order.' },
        ],
      },
    ],
  },
  {
    heading: 'Dashboards',
    items: [
      {
        path: '/dashboards',
        label: 'Atlas',
        icon: MapIcon,
        page: AtlasPage,
        description: 'Every dashboard on one map: how dense, and whether it speaks in pictures or words.',
      },
      ...dashboardGroups,
    ],
  },
  {
    pinned: true,
    items: [{ path: '/settings', label: 'Settings', icon: Settings, page: SettingsPage, description: 'Appearance: mode and color scheme.' }],
  },
]
