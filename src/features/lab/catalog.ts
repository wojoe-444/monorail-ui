import {
  AlignLeft,
  CalendarDays,
  Clock4,
  FileDiff,
  HeartPulse,
  Inbox,
  ListOrdered,
  MessageSquareText,
  PlaneTakeoff,
  Radio,
  Receipt,
  Sheet,
  SquareTerminal,
  Terminal,
  Type,
  WholeWord,
} from 'lucide-react'

import type { IconComponent } from '@/components/layout/nav'

import { ANNOTATED_EXPERIMENTS } from './annotated/catalog'
import { NARRATIVE_EXPERIMENTS } from './narrative/catalog'

/**
 * The experiments, each a dashboard that pushes one idea as far as it goes.
 * `density` (0 calm → 1 dense) and `verbal` (0 the data speaks in pictures →
 * 1 it speaks in words and type) place it on the Atlas map.
 *
 * `group` is the review round: the favorites from round one, the twelve new
 * options of round two, and the two kept from round one.
 */
export type ExperimentGroup = 'favorite' | 'narrative' | 'annotated' | 'new' | 'kept'

export interface Experiment {
  id: string
  path: string
  title: string
  icon: IconComponent
  group: ExperimentGroup
  /** The one idea, as a sentence. */
  thesis: string
  /** What it gives up to get there. */
  tradeoff: string
  source: string
  density: number
  verbal: number
}

export const GROUP_LABELS: Record<ExperimentGroup, string> = {
  favorite: 'Favorites',
  narrative: 'Narrative',
  annotated: 'Annotated graphs',
  new: 'New options',
  kept: 'Also kept',
}

const BASE: Experiment[] = [
  // ── Favorites ──
  {
    id: 'forecast',
    path: '/lab/forecast',
    title: 'Forecast, Written',
    icon: AlignLeft,
    group: 'favorite',
    thesis: 'Numbers belong inside sentences. Word-sized charts sit in the prose where the claim is made.',
    tradeoff: 'Slower to scan than a grid of tiles; faster to understand.',
    source: 'Open-Meteo · forecast, air quality and 30-year archive',
    density: 0.42,
    verbal: 0.93,
  },
  {
    id: 'attention',
    path: '/lab/attention',
    title: 'Attention',
    icon: Type,
    group: 'favorite',
    thesis: 'The label is the mark. What the world read yesterday, set in type sized by readers.',
    tradeoff: 'Size is a coarse encoding: read ranks, not exact gaps.',
    source: 'Wikimedia · English Wikipedia top pageviews, daily',
    density: 0.72,
    verbal: 0.84,
  },
  {
    id: 'terminal',
    path: '/lab/terminal',
    title: 'Terminal',
    icon: Terminal,
    group: 'favorite',
    thesis: 'Density is a feature for experts. Every pixel carries data and the keyboard drives.',
    tradeoff: 'Hostile on first visit; unbeatable on the hundredth.',
    source: 'USGS · NOAA SWPC · NESO · Hacker News, live',
    density: 0.97,
    verbal: 0.6,
  },

  // ── New options ──
  {
    id: 'ask',
    path: '/lab/ask',
    title: 'Ask',
    icon: MessageSquareText,
    group: 'new',
    thesis: 'One input box. Type a question in a tiny query language; the answer comes back as a sentence and a small chart.',
    tradeoff: 'Nothing shows until you ask, so you have to know what to ask.',
    source: 'Every lab feed, queried in the browser',
    density: 0.14,
    verbal: 0.93,
  },
  {
    id: 'specimen',
    path: '/lab/specimen',
    title: 'Specimen',
    icon: WholeWord,
    group: 'new',
    thesis: 'A variable font is the chart. Each country’s name is set in a weight and size drawn from its numbers.',
    tradeoff: 'Weight is a soft encoding. It shows the pattern, not the value.',
    source: 'World Bank · World Development Indicators (snapshot)',
    density: 0.3,
    verbal: 0.84,
  },
  {
    id: 'wire',
    path: '/lab/wire',
    title: 'Wire',
    icon: Radio,
    group: 'new',
    thesis: 'Every Wikipedia edit, worldwide, as a live log you can filter, pause and read at speed.',
    tradeoff: 'A firehose. You read the rate and the shape, not every line.',
    source: 'Wikimedia EventStreams · recent changes, live',
    density: 0.92,
    verbal: 0.8,
  },
  {
    id: 'chart',
    path: '/lab/chart',
    title: 'The Chart',
    icon: ListOrdered,
    group: 'new',
    thesis: 'A week of Wikipedia as a weekly hit chart: ▲▼, NEW, weeks on chart and peak position.',
    tradeoff: 'Ranks hide how far apart the entries really are.',
    source: 'Wikimedia · English Wikipedia top pageviews, last 14 days',
    density: 0.6,
    verbal: 0.76,
  },
  {
    id: 'inbox',
    path: '/lab/inbox',
    title: 'Inbox',
    icon: Inbox,
    group: 'new',
    thesis: 'Alerts are messages to deal with, not tiles to stare at. Read, star, snooze, archive, by keyboard.',
    tradeoff: 'Only what crosses a threshold gets in. Quiet trends never reach you.',
    source: 'USGS · NOAA SWPC · NESO · Open-Meteo · Launch Library',
    density: 0.44,
    verbal: 0.74,
  },
  {
    id: 'diff',
    path: '/lab/diff',
    title: 'Diff',
    icon: FileDiff,
    group: 'new',
    thesis: 'Show only what changed since you last looked, as a diff: red for what went, green for what came.',
    tradeoff: 'Your first visit is blank by design; it needs a second.',
    source: 'Every lab feed, compared with your last visit',
    density: 0.26,
    verbal: 0.67,
  },
  {
    id: 'almanac',
    path: '/lab/almanac',
    title: 'Almanac',
    icon: CalendarDays,
    group: 'new',
    thesis: 'A printed reference page for today: sun, moon, tides and the sky, set in tables.',
    tradeoff: 'Built for looking things up, not for spotting change.',
    source: 'Open-Meteo · NOAA tides · moon and sun computed in the browser',
    density: 0.56,
    verbal: 0.66,
  },
  {
    id: 'departures',
    path: '/lab/departures',
    title: 'Departures',
    icon: PlaneTakeoff,
    group: 'new',
    thesis: 'Rocket launches on a departures board: what goes next, when, from where, and whether it’s on time.',
    tradeoff: 'One kind of data, one kind of question.',
    source: 'The Space Devs · Launch Library 2',
    density: 0.4,
    verbal: 0.58,
  },
  {
    id: 'pages',
    path: '/lab/pages',
    title: 'Pages',
    icon: SquareTerminal,
    group: 'new',
    thesis: 'A paged information service: type a three-digit page number, get a full screen of facts.',
    tradeoff: 'One page at a time; you have to remember the numbers.',
    source: 'Every lab feed, as numbered pages',
    density: 0.66,
    verbal: 0.58,
  },
  {
    id: 'box-score',
    path: '/lab/box-score',
    title: 'Box Score',
    icon: Receipt,
    group: 'new',
    thesis: 'The GB grid’s day as a sports box score. Every fuel is a player with a stat line.',
    tradeoff: 'The metaphor does some of the explaining, and some of the distorting.',
    source: 'NESO Carbon Intensity API · generation mix, past 24h',
    density: 0.82,
    verbal: 0.48,
  },
  {
    id: 'ledger',
    path: '/lab/ledger',
    title: 'Ledger',
    icon: Sheet,
    group: 'new',
    thesis: 'A spreadsheet that reads like a dashboard: 217 countries by 10 indicators, every cell carrying a mark.',
    tradeoff: 'A wall of cells. Sorting and keyboard moves do the work.',
    source: 'World Bank · World Development Indicators (snapshot)',
    density: 0.95,
    verbal: 0.38,
  },

  // ── Also kept ──
  {
    id: 'grid-clock',
    path: '/lab/grid-clock',
    title: 'Grid Clock',
    icon: Clock4,
    group: 'kept',
    thesis: 'Lead with the decision, not the data: “run the dishwasher at 02:30”. The chart is the proof.',
    tradeoff: 'Opinionated. It decides what you care about.',
    source: 'NESO Carbon Intensity API · Great Britain, 48h forecast',
    density: 0.32,
    verbal: 0.36,
  },
  {
    id: 'lifelines',
    path: '/lab/lifelines',
    title: 'Lifelines',
    icon: HeartPulse,
    group: 'kept',
    thesis: 'Two hundred small charts beat one big one. Same scale, so the eye does the comparing.',
    tradeoff: 'Each line is tiny. Detail lives one click away.',
    source: 'World Bank · life expectancy at birth, 1960 to today',
    density: 0.86,
    verbal: 0.12,
  },
]

/** Every experiment: the base set, then the narrative and annotated groups (each owned in its own folder). */
export const EXPERIMENTS: Experiment[] = [...BASE, ...NARRATIVE_EXPERIMENTS, ...ANNOTATED_EXPERIMENTS]

export const experiment = (id: string) => EXPERIMENTS.find((e) => e.id === id)!
