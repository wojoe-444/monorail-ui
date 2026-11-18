import type { NavItem } from '@/components/layout/nav'
import { BriefingPage } from '@/pages/lab/narrative/BriefingPage'
import { CountryPage } from '@/pages/lab/narrative/CountryPage'
import { GridDayPage } from '@/pages/lab/narrative/GridDayPage'
import { SentencePage } from '@/pages/lab/narrative/SentencePage'
import { TwoCitiesPage } from '@/pages/lab/narrative/TwoCitiesPage'
import { YourDayPage } from '@/pages/lab/narrative/YourDayPage'

/** Page component and layout per narrative experiment id (see ./catalog.ts). */
export const NARRATIVE_PAGES: Record<string, Pick<NavItem, 'page' | 'layout'>> = {
  'grid-day': { page: GridDayPage },
  country: { page: CountryPage },
  'your-day': { page: YourDayPage },
  sentence: { page: SentencePage },
  briefing: { page: BriefingPage },
  'two-cities': { page: TwoCitiesPage },
}
