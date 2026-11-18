import { AudioLines, BookOpenText, Columns2, Hourglass, PencilLine, ScrollText } from 'lucide-react'

import type { Experiment } from '../catalog'

/**
 * Narrative group: six views that push the idea behind Forecast, Written
 * (numbers belong inside sentences) in six different directions. Ids must
 * match NARRATIVE_PAGES in ./pages.tsx.
 */
export const NARRATIVE_EXPERIMENTS: Experiment[] = [
  {
    id: 'grid-day',
    path: '/lab/narrative/grid-day',
    title: 'One Day on the Grid',
    icon: ScrollText,
    group: 'narrative',
    thesis: 'Scrollytelling. The prose leads and the chart follows: each paragraph re-frames one sticky picture of the last 24 hours.',
    tradeoff: 'You read in the author’s order. Jumping around fights the form.',
    source: 'NESO Carbon Intensity API · generation mix and intensity, past 24h',
    density: 0.2,
    verbal: 0.5,
  },
  {
    id: 'country',
    path: '/lab/narrative/country',
    title: 'Country, Written',
    icon: BookOpenText,
    group: 'narrative',
    thesis: 'An encyclopedia entry written by the numbers. Pick any of 217 countries; every sentence is a comparison.',
    tradeoff: 'Long. It reads like an article because it is one.',
    source: 'World Bank · World Development Indicators (snapshot)',
    density: 0.64,
    verbal: 0.9,
  },
  {
    id: 'your-day',
    path: '/lab/narrative/your-day',
    title: 'Your Day',
    icon: Hourglass,
    group: 'narrative',
    thesis: 'Second person, hour by hour. The forecast as a timeline of what you’ll feel, see and need.',
    tradeoff: 'Opinionated advice: it decides when you need gloves.',
    source: 'Open-Meteo · hourly forecast and air quality',
    density: 0.5,
    verbal: 0.85,
  },
  {
    id: 'sentence',
    path: '/lab/narrative/sentence',
    title: 'Sentence Builder',
    icon: PencilLine,
    group: 'narrative',
    thesis: 'The interface is a sentence. Change its underlined words and the next sentence answers.',
    tradeoff: 'Only questions the grammar can say. No free text.',
    source: 'USGS · NESO · NOAA SWPC · Open-Meteo · World Bank',
    density: 0.1,
    verbal: 0.62,
  },
  {
    id: 'briefing',
    path: '/lab/narrative/briefing',
    title: 'Briefing, Spoken',
    icon: AudioLines,
    group: 'narrative',
    thesis: 'A dashboard you listen to. The day’s numbers composed into a briefing and read aloud, word by word.',
    tradeoff: 'Linear and slow. You can’t skim a voice.',
    source: 'Every lab feed, read by your browser’s voice',
    density: 0.06,
    verbal: 0.79,
  },
  {
    id: 'two-cities',
    path: '/lab/narrative/two-cities',
    title: 'Two Cities',
    icon: Columns2,
    group: 'narrative',
    thesis: 'A parallel text. Two cities written in the same sentences, side by side, with the difference in the gutter.',
    tradeoff: 'Two places only. Three would break the parallel.',
    source: 'Open-Meteo · forecast and air quality for both cities',
    density: 0.88,
    verbal: 0.7,
  },
]
