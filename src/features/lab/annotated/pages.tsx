import type { NavItem } from '@/components/layout/nav'
import { EveryCountryPage } from '@/pages/lab/annotated/EveryCountryPage'
import { MarginNotesPage } from '@/pages/lab/annotated/MarginNotesPage'
import { StoryArcsPage } from '@/pages/lab/annotated/StoryArcsPage'

/** Page component and layout per annotated experiment id (see ./catalog.ts). */
export const ANNOTATED_PAGES: Record<string, Pick<NavItem, 'page' | 'layout'>> = {
  'every-country': { page: EveryCountryPage },
  'margin-notes': { page: MarginNotesPage },
  'story-arcs': { page: StoryArcsPage },
}
