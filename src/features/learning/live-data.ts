/*
 * Sample content for the Live sessions mockup (/learn/live): Field School's
 * workshops, office hours, reading groups and talks for Nov–Dec 2026. Times
 * are stored in UTC and shown in the time zone the person picks.
 */

export type SessionKind = 'workshop' | 'office' | 'reading' | 'talk'

export const KIND_LABELS: Record<SessionKind, string> = {
  workshop: 'Workshop',
  office: 'Office hours',
  reading: 'Reading group',
  talk: 'Talk',
}

export interface Session {
  id: string
  title: string
  kind: SessionKind
  host: string
  /** ISO time in UTC. */
  start: string
  minutes: number
  seats: number
  /** Seats taken by other people. */
  taken: number
  /** People waiting, not counting Priya. */
  waitlist?: number
  where: string
  blurb: string
  /** Minutes of recording, for sessions that were recorded. */
  recording?: number
  /** Set for sessions that are part of something Priya is assigned. */
  note?: string
}

/** The mockup's "now": Wed Nov 18 2026, 13:30 UTC. */
export const NOW = Date.parse('2026-11-18T13:30:00Z')

export const SESSIONS: Session[] = [
  {
    id: 'inc-tabletop',
    title: 'Incident command: a tabletop exercise',
    kind: 'workshop',
    host: 'mara',
    start: '2026-11-04T15:00:00Z',
    minutes: 90,
    seats: 20,
    taken: 20,
    where: 'Zoom',
    blurb: 'A simulated outage, played out in real time. You take a role; the scenario fights back.',
    recording: 84,
  },
  {
    id: 'reading-1',
    title: 'Reading group: Thinking in Systems, ch. 1–2',
    kind: 'reading',
    host: 'sol',
    start: '2026-11-10T12:00:00Z',
    minutes: 60,
    seats: 10,
    taken: 9,
    where: 'Zoom',
    blurb: 'Stocks, flows and why the obvious fix often makes things worse.',
  },
  {
    id: 'oncall-oh',
    title: 'Office hours: your on-call questions',
    kind: 'office',
    host: 'mara',
    start: '2026-11-12T16:00:00Z',
    minutes: 60,
    seats: 30,
    taken: 22,
    where: 'Zoom',
    blurb: 'Anything about pages, runbooks, escalation or sleeping through the night.',
    recording: 57,
  },
  {
    id: 'threat-1',
    title: 'Threat modeling in 30 minutes',
    kind: 'workshop',
    host: 'june',
    start: '2026-11-16T14:00:00Z',
    minutes: 45,
    seats: 24,
    taken: 24,
    where: 'Zoom + Harbor room, London',
    blurb: 'A lightweight format any team can run before a launch. Bring a feature you’re building.',
    recording: 31,
  },
  {
    id: 'tokens-oh',
    title: 'Office hours: design tokens and theming',
    kind: 'office',
    host: 'theo',
    start: '2026-11-18T16:00:00Z',
    minutes: 45,
    seats: 12,
    taken: 9,
    where: 'Zoom',
    blurb: 'Stuck on a token name, a dark-mode bug or a component that won’t theme? Bring it.',
  },
  {
    id: 'feedback-lab',
    title: 'Feedback that lands: practice lab',
    kind: 'workshop',
    host: 'kwame',
    start: '2026-11-19T14:00:00Z',
    minutes: 90,
    seats: 16,
    taken: 16,
    waitlist: 4,
    where: 'Harbor room, London',
    blurb: 'Pairs, real scenarios and a timer. You will give feedback out loud, three times.',
  },
  {
    id: 'sql-clinic',
    title: 'SQL clinic: bring a query',
    kind: 'office',
    host: 'ana',
    start: '2026-11-20T11:00:00Z',
    minutes: 60,
    seats: 20,
    taken: 9,
    where: 'Zoom',
    blurb: 'Slow, wrong or just confusing: we’ll read it together and fix it on screen.',
  },
  {
    id: 'threat-2',
    title: 'Threat modeling in 30 minutes (second run)',
    kind: 'workshop',
    host: 'june',
    start: '2026-11-24T15:00:00Z',
    minutes: 45,
    seats: 24,
    taken: 22,
    where: 'Zoom',
    blurb: 'The same session again, for everyone who missed the first. Same format, new example.',
  },
  {
    id: 'reading-2',
    title: 'Reading group: Thinking in Systems, ch. 3–4',
    kind: 'reading',
    host: 'sol',
    start: '2026-11-25T12:00:00Z',
    minutes: 60,
    seats: 10,
    taken: 6,
    where: 'Zoom',
    blurb: 'Resilience, self-organization and hierarchy. Read before you come; one page of notes is plenty.',
  },
  {
    id: 'oncall-brief',
    title: 'Before your first shift: on-call briefing',
    kind: 'workshop',
    host: 'mara',
    start: '2026-12-01T15:00:00Z',
    minutes: 60,
    seats: 25,
    taken: 12,
    where: 'Zoom',
    blurb: 'Tools, rota, handover and what “good” looks like on your first week holding the pager.',
    note: 'Part of Ready for on-call, due Dec 01',
  },
  {
    id: 'proposal-live',
    title: 'Live edit: a proposal, start to finish',
    kind: 'workshop',
    host: 'sol',
    start: '2026-12-02T16:00:00Z',
    minutes: 75,
    seats: 30,
    taken: 12,
    where: 'Zoom',
    blurb: 'Sol rewrites a real (volunteered) proposal while you watch and heckle.',
  },
  {
    id: 'payments-oh',
    title: 'Office hours: payments architecture',
    kind: 'office',
    host: 'kwame',
    start: '2026-12-03T10:00:00Z',
    minutes: 45,
    seats: 15,
    taken: 15,
    waitlist: 2,
    where: 'Zoom',
    blurb: 'Ledger, idempotency, retries and settlement. Questions of any size.',
  },
  {
    id: 'crit-open',
    title: 'Open design crit',
    kind: 'workshop',
    host: 'theo',
    start: '2026-12-08T14:00:00Z',
    minutes: 60,
    seats: 20,
    taken: 13,
    where: 'Zoom + Loft, Lisbon',
    blurb: 'Three pieces of work in progress, ten minutes each, in the format from the how-to.',
  },
  {
    id: 'readouts',
    title: 'Experiment readouts that don’t lie',
    kind: 'workshop',
    host: 'ana',
    start: '2026-12-09T15:00:00Z',
    minutes: 90,
    seats: 25,
    taken: 24,
    where: 'Zoom',
    blurb: 'Write a readout from raw results, then trade with a partner and find what they hid.',
  },
  {
    id: 'shadow-debrief',
    title: 'Support shadowing: debrief and Q&A',
    kind: 'office',
    host: 'iris',
    start: '2026-12-10T13:00:00Z',
    minutes: 45,
    seats: 12,
    taken: 3,
    where: 'Zoom',
    blurb: 'For everyone who sat in on a support shift this quarter. What surprised you?',
  },
  {
    id: 'fireside',
    title: 'Fireside: 2026 in incidents',
    kind: 'talk',
    host: 'ben',
    start: '2026-12-15T16:00:00Z',
    minutes: 60,
    seats: 150,
    taken: 86,
    where: 'Zoom + Atrium, London',
    blurb: 'Ben walks through the year’s five biggest incidents and what each one changed.',
  },
  {
    id: 'reading-3',
    title: 'Reading group: Thinking in Systems, ch. 5–7',
    kind: 'reading',
    host: 'sol',
    start: '2026-12-16T12:00:00Z',
    minutes: 60,
    seats: 10,
    taken: 4,
    where: 'Zoom',
    blurb: 'System traps and leverage points. The last session before the break.',
  },
  {
    id: 'sec-oh',
    title: 'Office hours: security questions, any size',
    kind: 'office',
    host: 'june',
    start: '2026-12-17T10:00:00Z',
    minutes: 60,
    seats: 20,
    taken: 5,
    where: 'Zoom',
    blurb: 'Secrets, dependencies, that odd email. No question is too small.',
  },
]

export interface Zone {
  id: string
  label: string
  abbr: string
  /** Minutes from UTC (no daylight saving in Nov–Dec for these). */
  offset: number
}

export const ZONES: Zone[] = [
  { id: 'london', label: 'London', abbr: 'GMT', offset: 0 },
  { id: 'lisbon', label: 'Lisbon', abbr: 'WET', offset: 0 },
  { id: 'berlin', label: 'Berlin', abbr: 'CET', offset: 60 },
  { id: 'new-york', label: 'New York', abbr: 'ET', offset: -300 },
  { id: 'bengaluru', label: 'Bengaluru', abbr: 'IST', offset: 330 },
]
