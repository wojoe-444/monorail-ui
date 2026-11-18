/*
 * The curriculum drawn as a transit network, for the "Curriculum map" home
 * (`HomeTransitMap`). Each learning path is a line, each course or item a
 * station. Coordinates are in grid units (1 unit = 40 SVG px); every route
 * segment runs at 0, 45 or 90 degrees.
 */

import type { Format } from './data'

export type StationStatus = 'done' | 'current' | 'started' | 'todo'

/** Where a label sits relative to its station. */
export type LabelPos = 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw' | 'e' | 'w'

export interface Station {
  id: string
  /** Label on the map, one entry per line of text. */
  label: string[]
  /** Full title for the detail card. */
  title: string
  x: number
  y: number
  pos: LabelPos
  status: StationStatus
  /** 0–100 for `started` / `current`. */
  progress?: number
  /** An ITEMS id when the station is a catalog item; its fields win. */
  itemId?: string
  format: Format
  minutes: number
  author: string
  summary: string
  /** The mockup page that shows this station's content. */
  path?: string
}

export interface Line {
  id: string
  name: string
  /** Chart series slot, 1–6. */
  series: 1 | 2 | 3 | 4 | 5 | 6
  /** Who keeps the line running. */
  owner: string
  blurb: string
  /** Waypoints, including bends, in drawing order. */
  route: [number, number][]
  /** Station ids in riding order. */
  stops: string[]
  path?: string
}

export const STATIONS: Station[] = [
  // Getting started
  {
    id: 'first-week',
    label: ['Your first week'],
    title: 'Your first week at Kestrel',
    x: 1.5,
    y: 12,
    pos: 's',
    status: 'done',
    itemId: 'first-week',
    format: 'path',
    minutes: 140,
    author: 'sol',
    summary: 'Laptop, accounts, buddies and the five meetings worth going to.',
  },
  {
    id: 'accounts',
    label: ['Laptop &', 'accounts'],
    title: 'Laptop and accounts',
    x: 3.5,
    y: 12,
    pos: 's',
    status: 'done',
    format: 'howto',
    minutes: 25,
    author: 'sol',
    summary: 'Every account you need on day one, in the order that avoids lockouts.',
  },
  {
    id: 'phish',
    label: ['Spot the', 'phish'],
    title: 'Spot the phish',
    x: 5.5,
    y: 12,
    pos: 's',
    status: 'done',
    itemId: 'phishing',
    format: 'quiz',
    minutes: 6,
    author: 'june',
    summary: 'Ten real emails we received. Which ones would you have clicked?',
  },
  {
    id: 'git',
    label: ['Git, the parts', 'you’ll use'],
    title: 'Git, the parts you’ll actually use',
    x: 7.5,
    y: 8,
    pos: 'n',
    status: 'done',
    itemId: 'git-sheet',
    format: 'cheatsheet',
    minutes: 3,
    author: 'mara',
    summary: 'One page: undo, rewrite, rescue, compare. Printable.',
    path: '/learn/cheat-sheet',
  },

  // Ready for on-call
  {
    id: 'flags',
    label: ['Ship behind', 'a feature flag'],
    title: 'Ship behind a feature flag',
    x: 10,
    y: 8,
    pos: 's',
    status: 'started',
    progress: 40,
    itemId: 'flags-lab',
    format: 'lab',
    minutes: 25,
    author: 'mara',
    summary: 'Hands-on: wrap a change, roll it to 5%, watch the graphs, roll back.',
    path: '/learn/lab',
  },
  {
    id: 'store',
    label: ['Which data', 'store?'],
    title: 'Which data store should I use?',
    x: 12.25,
    y: 8,
    pos: 'n',
    status: 'todo',
    itemId: 'which-store',
    format: 'guide',
    minutes: 4,
    author: 'mara',
    summary: 'Answer four questions, get a recommendation and the reasons behind it.',
    path: '/learn/decision-guide',
  },
  {
    id: 'sql',
    label: ['Can you read', 'this query?'],
    title: 'Can you read this query?',
    x: 14.5,
    y: 8,
    pos: 'sw',
    status: 'todo',
    itemId: 'sql-check',
    format: 'quiz',
    minutes: 12,
    author: 'ana',
    summary: 'Twelve questions on joins, grouping and the traps in between.',
    path: '/learn/quiz',
  },
  {
    id: 'failure',
    label: ['Failure', 'Modes'],
    title: 'Failure Modes',
    x: 17,
    y: 8,
    pos: 'n',
    status: 'started',
    progress: 50,
    itemId: 'failure-modes',
    format: 'video',
    minutes: 94,
    author: 'mara',
    summary: 'Six episodes on how real systems break, told by the engineers who were paged.',
    path: '/learn/video',
  },
  {
    id: 'rotate',
    label: ['Rotate a', 'leaked key'],
    title: 'Rotate a leaked API key in under ten minutes',
    x: 19.5,
    y: 8,
    pos: 's',
    status: 'todo',
    itemId: 'rotate-keys',
    format: 'howto',
    minutes: 9,
    author: 'june',
    summary: 'The exact steps, in order, when a secret ends up somewhere it shouldn’t.',
    path: '/learn/how-to',
  },
  {
    id: 'night',
    label: ['Night Shift,', 'ep. 14'],
    title: 'Night Shift, ep. 14: The 3 a.m. rollback',
    x: 22,
    y: 8,
    pos: 'se',
    status: 'todo',
    itemId: 'night-shift',
    format: 'podcast',
    minutes: 38,
    author: 'kwame',
    summary: 'Kwame and June on deciding fast, saying “I don’t know” and writing it up after.',
    path: '/learn/podcast',
  },
  {
    id: 'postmortem',
    label: ['Postmortems', 'that teach'],
    title: 'Postmortems that teach',
    x: 25,
    y: 8,
    pos: 'se',
    status: 'todo',
    format: 'article',
    minutes: 15,
    author: 'sol',
    summary: 'Blameless, specific and short: how to write the incident review people learn from.',
  },
  {
    id: 'shadow',
    label: ['Shadow', 'shift'],
    title: 'Your shadow shift',
    x: 28,
    y: 8,
    pos: 'n',
    status: 'todo',
    format: 'live',
    minutes: 480,
    author: 'mara',
    summary: 'A day on call beside a seasoned engineer. You hold the pager; they hold you.',
  },

  // Data literacy for builders
  {
    id: 'question',
    label: ['Ask a good', 'question'],
    title: 'Module 1: Ask a good question',
    x: 2,
    y: 4,
    pos: 's',
    status: 'done',
    format: 'course',
    minutes: 55,
    author: 'ana',
    summary: 'Turn “is it working?” into something a number can answer.',
    path: '/learn/course',
  },
  {
    id: 'medians',
    label: ['Medians &', 'spread'],
    title: 'Module 2: Medians and spread',
    x: 5,
    y: 4,
    pos: 's',
    status: 'current',
    progress: 67,
    format: 'course',
    minutes: 70,
    author: 'ana',
    summary: 'Why the average checkout time lies, and what to report instead.',
    path: '/learn/course',
  },
  {
    id: 'charts',
    label: ['How charts lie'],
    title: 'How charts lie (and how ours won’t)',
    x: 9,
    y: 4,
    pos: 's',
    status: 'todo',
    itemId: 'charts-lie',
    format: 'article',
    minutes: 12,
    author: 'ana',
    summary: 'Truncated axes, dual scales, cherry-picked windows. With fixes.',
  },
  {
    id: 'readout',
    label: ['Run your own', 'readout'],
    title: 'Module 5: Run your own experiment readout',
    x: 19,
    y: 10,
    pos: 's',
    status: 'todo',
    format: 'lab',
    minutes: 90,
    author: 'ana',
    summary: 'Take a real A/B test from raw events to a one-page decision.',
    path: '/learn/course',
  },

  // Design craft
  {
    id: 'tokens',
    label: ['Tokens all the way down'],
    title: 'Tokens all the way down',
    x: 1.5,
    y: 1.5,
    pos: 'n',
    status: 'done',
    itemId: 'tokens-series',
    format: 'video',
    minutes: 41,
    author: 'theo',
    summary: 'Four short videos on how our design tokens flow from Figma to production.',
  },
  {
    id: 'crit',
    label: ['Design critiques'],
    title: 'Running a design critique people look forward to',
    x: 5.5,
    y: 1.5,
    pos: 'n',
    status: 'todo',
    itemId: 'design-crit',
    format: 'howto',
    minutes: 11,
    author: 'theo',
    summary: 'A format, a script and the phrases that keep it kind and useful.',
  },
  {
    id: 'a11y',
    label: ['Accessible by default'],
    title: 'Accessible by default',
    x: 13.5,
    y: 1.5,
    pos: 'n',
    status: 'todo',
    format: 'course',
    minutes: 120,
    author: 'theo',
    summary: 'Focus, contrast, motion and words: the checks every screen passes before review.',
  },
  {
    id: 'research',
    label: ['Research you', 'can trust'],
    title: 'Research you can trust',
    x: 16,
    y: 1.5,
    pos: 's',
    status: 'todo',
    format: 'video',
    minutes: 48,
    author: 'theo',
    summary: 'Five interviews beat fifty survey answers, if you ask the right way.',
  },
  {
    id: 'systems',
    label: ['Systems in depth'],
    title: 'Design systems in depth',
    x: 18.5,
    y: 1.5,
    pos: 'n',
    status: 'todo',
    format: 'course',
    minutes: 160,
    author: 'theo',
    summary: 'Contribute a component end to end: proposal, tokens, docs, release.',
  },

  // Leading people
  {
    id: 'one-ones',
    label: ['Your first 1:1s'],
    title: 'Your first 1:1s',
    x: 16.5,
    y: 13,
    pos: 's',
    status: 'todo',
    format: 'article',
    minutes: 10,
    author: 'kwame',
    summary: 'What to ask, what to write down, and the one question to end every 1:1 with.',
  },
  {
    id: 'feedback',
    label: ['Feedback that lands'],
    title: 'Feedback that lands',
    x: 19.5,
    y: 13,
    pos: 's',
    status: 'todo',
    itemId: 'feedback-course',
    format: 'course',
    minutes: 210,
    author: 'kwame',
    summary: 'A three-week course for new managers, with practice partners.',
  },
  {
    id: 'proposal',
    label: ['Write a proposal'],
    title: 'Write a proposal that gets a decision',
    x: 25,
    y: 4,
    pos: 'nw',
    status: 'done',
    itemId: 'proposal',
    format: 'article',
    minutes: 9,
    author: 'sol',
    summary: 'Structure, length and the one paragraph every reader skips to.',
  },
  {
    id: 'hard-talks',
    label: ['Hard conversations', '(live)'],
    title: 'Hard conversations, a live workshop',
    x: 27.25,
    y: 4,
    pos: 's',
    status: 'todo',
    format: 'live',
    minutes: 90,
    author: 'kwame',
    summary: 'Practise the conversation you’ve been putting off, with a partner and a script.',
    path: '/learn/live',
  },
  {
    id: 'decisions',
    label: ['Decisions', 'people trust'],
    title: 'Decisions people trust',
    x: 29.5,
    y: 4,
    pos: 'n',
    status: 'todo',
    format: 'course',
    minutes: 120,
    author: 'ben',
    summary: 'Deciding in the open: options, owners and saying what would change your mind.',
  },

  // Writing at Kestrel
  {
    id: 'messages',
    label: ['Messages people read'],
    title: 'Messages people read',
    x: 29,
    y: 1.5,
    pos: 'n',
    status: 'done',
    format: 'howto',
    minutes: 8,
    author: 'sol',
    summary: 'Lead with the ask, one idea per message, and when to stop typing and call.',
  },
  {
    id: 'boring',
    label: ['Boring tech,', 'revisited'],
    title: 'The case for boring technology, revisited',
    x: 27.5,
    y: 12,
    pos: 's',
    status: 'todo',
    itemId: 'boring-tech',
    format: 'article',
    minutes: 14,
    author: 'ben',
    summary: 'Read as a model argument: claim, evidence, concession, recommendation.',
    path: '/learn/article',
  },
  {
    id: 'launch',
    label: ['Launch notes'],
    title: 'Launch notes customers finish',
    x: 29.75,
    y: 12,
    pos: 's',
    status: 'todo',
    format: 'howto',
    minutes: 12,
    author: 'sol',
    summary: 'What changed, who it’s for and what to do now, in that order.',
  },
]

export const STATION_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s])) as Record<string, Station>

export const LINES: Line[] = [
  {
    id: 'start',
    name: 'Getting started',
    series: 1,
    owner: 'sol',
    blurb: 'Your first weeks. Every other line is one change away.',
    route: [
      [1.5, 12],
      [6, 12],
      [7.5, 10.5],
      [7.5, 8],
    ],
    stops: ['first-week', 'accounts', 'phish', 'git'],
  },
  {
    id: 'oncall',
    name: 'Ready for on-call',
    series: 2,
    owner: 'mara',
    blurb: 'The trunk line: from your first commit to holding the pager.',
    route: [
      [7.5, 8],
      [28, 8],
    ],
    stops: ['git', 'flags', 'store', 'sql', 'failure', 'rotate', 'night', 'postmortem', 'shadow'],
  },
  {
    id: 'data',
    name: 'Data literacy for builders',
    series: 4,
    owner: 'ana',
    blurb: 'From “what’s a median” to your own experiment readout.',
    route: [
      [2, 4],
      [10.5, 4],
      [14.5, 8],
      [16.5, 10],
      [19, 10],
    ],
    stops: ['question', 'medians', 'charts', 'sql', 'readout'],
    path: '/learn/course',
  },
  {
    id: 'design',
    name: 'Design craft',
    series: 3,
    owner: 'theo',
    blurb: 'Critique, research and the system behind every screen.',
    route: [
      [1.5, 1.5],
      [6.5, 1.5],
      [9, 4],
      [11.5, 1.5],
      [18.5, 1.5],
    ],
    stops: ['tokens', 'crit', 'charts', 'a11y', 'research', 'systems'],
  },
  {
    id: 'lead',
    name: 'Leading people',
    series: 5,
    owner: 'kwame',
    blurb: 'For new managers and anyone who leads without the title.',
    route: [
      [16.5, 13],
      [20, 13],
      [22, 11],
      [22, 6.5],
      [24.5, 4],
      [29.5, 4],
    ],
    stops: ['one-ones', 'feedback', 'night', 'proposal', 'hard-talks', 'decisions'],
  },
  {
    id: 'writing',
    name: 'Writing at Kestrel',
    series: 6,
    owner: 'sol',
    blurb: 'Messages, proposals and docs people actually read.',
    route: [
      [29, 1.5],
      [27, 1.5],
      [25, 3.5],
      [25, 10],
      [27, 12],
      [29.75, 12],
    ],
    stops: ['messages', 'proposal', 'postmortem', 'boring', 'launch'],
  },
]

export const LINE_BY_ID = Object.fromEntries(LINES.map((l) => [l.id, l])) as Record<string, Line>

/** Lines that call at a station, in LINES order. More than one = an interchange. */
export function linesAt(stationId: string): Line[] {
  return LINES.filter((l) => l.stops.includes(stationId))
}

export interface ServiceNotice {
  line: string
  tone: 'good' | 'works' | 'info'
  label: string
  text: string
}

/** The map's upkeep, told as a transit operator would. */
export const SERVICE: ServiceNotice[] = [
  { line: 'data', tone: 'works', label: 'Planned works', text: 'Module 5’s lab is being re-recorded. Readout lessons reopen Dec 9.' },
  { line: 'design', tone: 'info', label: 'New station', text: 'Accessible by default opens Dec 2, between Charts and Research.' },
  { line: 'oncall', tone: 'info', label: 'Rebuilt', text: 'Rotate a leaked key was rewritten Nov 12 for the new vault.' },
  { line: 'lead', tone: 'good', label: 'Good service', text: 'Next Hard conversations workshop: Dec 4, 8 seats left.' },
  { line: 'writing', tone: 'good', label: 'Good service', text: 'All stations reviewed this quarter.' },
  { line: 'start', tone: 'good', label: 'Good service', text: 'Updated Nov 10 for the new laptop setup.' },
]
