import { Map as MapIcon, Settings, Shapes } from 'lucide-react'

import type { NavItem, NavSection } from '@/components/layout/nav'
import { ANNOTATED_PAGES } from '@/features/lab/annotated/pages'
import { EXPERIMENTS, GROUP_LABELS, type ExperimentGroup } from '@/features/lab/catalog'
import { NARRATIVE_PAGES } from '@/features/lab/narrative/pages'
import { ComponentsPage } from '@/pages/ComponentsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AlmanacPage } from '@/pages/lab/AlmanacPage'
import { AskPage } from '@/pages/lab/AskPage'
import { AtlasPage } from '@/pages/lab/AtlasPage'
import { AttentionPage } from '@/pages/lab/AttentionPage'
import { BoxScorePage } from '@/pages/lab/BoxScorePage'
import { ChartPage } from '@/pages/lab/ChartPage'
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

/**
 * Every page in the app, in drawer order. This is the one place to add a
 * page: give it a path, a label, a lucide icon and the component to render.
 *
 * - `heading` groups items under an overline label in the drawer.
 * - `children` makes a collapsible group (one level deep).
 * - `layout: 'full'` drops the page padding and max width (canvases, editors, maps).
 * - `hidden: true` keeps a route out of the drawer (detail pages, wizards).
 * - The `pinned` section sits at the bottom of the drawer (Settings).
 */

/** Page component and layout per experiment id (titles, icons and groups live in the catalog). */
const LAB_PAGES: Record<string, Pick<NavItem, 'page' | 'layout'>> = {
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

const GROUPS: ExperimentGroup[] = ['favorite', 'narrative', 'annotated', 'new', 'kept']

export const NAV: NavSection[] = [
  {
    items: [{ path: '/', label: 'Atlas', icon: MapIcon, page: AtlasPage }],
  },
  ...GROUPS.map((g) => ({
    heading: GROUP_LABELS[g],
    items: EXPERIMENTS.filter((e) => e.group === g).map((e) => ({ path: e.path, label: e.title, icon: e.icon, ...LAB_PAGES[e.id] })),
  })),
  {
    heading: 'Reference',
    items: [{ path: '/components', label: 'Components', icon: Shapes, page: ComponentsPage }],
  },
  {
    pinned: true,
    items: [{ path: '/settings', label: 'Settings', icon: Settings, page: SettingsPage }],
  },
]
