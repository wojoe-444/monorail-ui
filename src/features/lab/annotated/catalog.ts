import { StickyNote, Tags, Waypoints } from 'lucide-react'

import type { Experiment } from '../catalog'

/**
 * Annotated group: how far the annotated charts of Attention can go, with
 * annotation as the main event. Ids must match ANNOTATED_PAGES in ./pages.tsx.
 */
export const ANNOTATED_EXPERIMENTS: Experiment[] = [
  {
    id: 'every-country',
    path: '/lab/annotated/every-country',
    title: 'Every Country, Labeled',
    icon: Tags,
    group: 'annotated',
    thesis: 'Every dot is offered a name. A placement engine decides who gets one at this zoom, and written callouts explain the outliers.',
    tradeoff: 'At full view some names wait for zoom; the busiest corner stays crowded.',
    source: 'World Bank · GDP per person, life expectancy, population (snapshot)',
    density: 0.74,
    verbal: 0.26,
  },
  {
    id: 'margin-notes',
    path: '/lab/annotated/margin-notes',
    title: 'Margin Notes',
    icon: StickyNote,
    group: 'annotated',
    thesis: 'An annotation engine reads the line for you: records, surges, shifts and spikes, ranked by importance and written up in the margin.',
    tradeoff: 'The engine decides what’s notable. What it can’t detect, it doesn’t mention.',
    source: 'NOAA Mauna Loa CO₂ · NESO grid · Wikimedia pageviews',
    density: 0.46,
    verbal: 0.48,
  },
  {
    id: 'story-arcs',
    path: '/lab/annotated/story-arcs',
    title: 'Story Arcs',
    icon: Waypoints,
    group: 'annotated',
    thesis: 'Two weeks of Wikipedia’s top articles as a bump chart, each line annotated at the moments that make its story.',
    tradeoff: 'Ranks only: a #1 with 300K readers looks the same as one with 3M.',
    source: 'Wikimedia · English Wikipedia daily top pageviews, 14 days',
    density: 0.6,
    verbal: 0.38,
  },
]
