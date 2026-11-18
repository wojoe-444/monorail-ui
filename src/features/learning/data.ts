/*
 * Sample content for the Learning hub mockups: "Field School", the internal
 * learning hub of Kestrel, a fictional mid-size software company. Every
 * Learning hub page draws from here so titles, people and topics line up
 * across pages. Page-specific detail (steps, transcripts, questions) lives in
 * the page that needs it.
 */

export const HUB = {
  name: 'Field School',
  org: 'Kestrel',
  tagline: 'Learn the way we work, from the people who do it.',
  learner: { name: 'Priya Raman', first: 'Priya', role: 'Product engineer', team: 'Payments', initials: 'PR' },
}

export type TopicId = 'start' | 'engineering' | 'design' | 'data' | 'leadership' | 'writing' | 'security' | 'customers'

export interface Topic {
  id: TopicId
  name: string
  blurb: string
  /** 1–6: which chart series color the topic's cover art uses. */
  series: 1 | 2 | 3 | 4 | 5 | 6
  count: number
}

export const TOPICS: Topic[] = [
  { id: 'start', name: 'Getting started', blurb: 'Your first weeks: tools, rituals, who to ask.', series: 1, count: 24 },
  { id: 'engineering', name: 'Engineering', blurb: 'Shipping, reviewing, debugging and running what we build.', series: 2, count: 118 },
  { id: 'design', name: 'Design', blurb: 'Research, systems and the craft of interfaces.', series: 3, count: 57 },
  { id: 'data', name: 'Data literacy', blurb: 'Asking good questions of numbers, and not being fooled.', series: 4, count: 43 },
  { id: 'leadership', name: 'Leadership', blurb: 'Leading people, decisions and hard conversations.', series: 5, count: 39 },
  { id: 'writing', name: 'Writing', blurb: 'Docs, proposals and messages people actually read.', series: 6, count: 31 },
  { id: 'security', name: 'Security', blurb: 'Keeping customers and colleagues safe, every day.', series: 2, count: 28 },
  { id: 'customers', name: 'Customer craft', blurb: 'Support, discovery calls and listening well.', series: 1, count: 22 },
]

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, Topic>

export type Format = 'howto' | 'video' | 'article' | 'course' | 'path' | 'live' | 'podcast' | 'cheatsheet' | 'quiz' | 'lab' | 'guide'

export const FORMAT_LABELS: Record<Format, string> = {
  howto: 'How-to',
  video: 'Video series',
  article: 'Article',
  course: 'Course',
  path: 'Learning path',
  live: 'Live session',
  podcast: 'Podcast',
  cheatsheet: 'Cheat sheet',
  quiz: 'Quiz',
  lab: 'Hands-on lab',
  guide: 'Decision guide',
}

export interface Person {
  id: string
  name: string
  role: string
  initials: string
}

export const PEOPLE: Person[] = [
  { id: 'mara', name: 'Mara Okafor', role: 'Staff engineer, Platform', initials: 'MO' },
  { id: 'theo', name: 'Theo Lindqvist', role: 'Design systems lead', initials: 'TL' },
  { id: 'ana', name: 'Ana Ruiz', role: 'Head of Data', initials: 'AR' },
  { id: 'kwame', name: 'Kwame Mensah', role: 'Engineering manager, Payments', initials: 'KM' },
  { id: 'june', name: 'June Park', role: 'Security engineer', initials: 'JP' },
  { id: 'sol', name: 'Sol Haddad', role: 'Technical writer', initials: 'SH' },
  { id: 'iris', name: 'Iris Novak', role: 'Support lead', initials: 'IN' },
  { id: 'ben', name: 'Ben Achebe', role: 'VP Engineering', initials: 'BA' },
]

export const PERSON_BY_ID = Object.fromEntries(PEOPLE.map((p) => [p.id, p])) as Record<string, Person>

export interface Item {
  id: string
  title: string
  summary: string
  format: Format
  topic: TopicId
  author: string
  /** Minutes to finish (a whole series or course for those formats). */
  minutes: number
  level: 'Intro' | 'Intermediate' | 'Advanced'
  /** Parts: episodes, lessons, steps. */
  parts?: number
  /** 0–100, how far Priya (the sample learner) has got. Absent = not started. */
  progress?: number
  /** Learners who finished it in the last 90 days. */
  learners: number
  updated: string
  /** The Learning hub page that mocks this item up, when there is one. */
  path?: string
  tags?: string[]
}

export const ITEMS: Item[] = [
  {
    id: 'rotate-keys',
    title: 'Rotate a leaked API key in under ten minutes',
    summary: 'The exact steps, in order, when a secret ends up somewhere it shouldn’t.',
    format: 'howto',
    topic: 'security',
    author: 'june',
    minutes: 9,
    level: 'Intro',
    parts: 7,
    learners: 412,
    updated: 'Nov 12',
    path: '/learn/how-to',
    tags: ['incident', 'secrets'],
  },
  {
    id: 'failure-modes',
    title: 'Failure Modes',
    summary: 'Six episodes on how real systems break, told by the engineers who were paged.',
    format: 'video',
    topic: 'engineering',
    author: 'mara',
    minutes: 94,
    level: 'Intermediate',
    parts: 6,
    progress: 50,
    learners: 1288,
    updated: 'Nov 03',
    path: '/learn/video',
    tags: ['reliability', 'incidents'],
  },
  {
    id: 'boring-tech',
    title: 'The case for boring technology, revisited',
    summary: 'Ten years on, what the “innovation tokens” idea got right and what it missed.',
    format: 'article',
    topic: 'engineering',
    author: 'ben',
    minutes: 14,
    level: 'Intermediate',
    learners: 2034,
    updated: 'Oct 28',
    path: '/learn/article',
    tags: ['architecture', 'judgement'],
  },
  {
    id: 'data-path',
    title: 'Data literacy for builders',
    summary: 'From “what’s a median” to running your own experiment readout, in five modules.',
    format: 'path',
    topic: 'data',
    author: 'ana',
    minutes: 380,
    level: 'Intro',
    parts: 5,
    progress: 36,
    learners: 640,
    updated: 'Nov 15',
    path: '/learn/course',
    tags: ['statistics', 'experiments'],
  },
  {
    id: 'sql-check',
    title: 'Can you read this query?',
    summary: 'Twelve questions on joins, grouping and the traps in between.',
    format: 'quiz',
    topic: 'data',
    author: 'ana',
    minutes: 12,
    level: 'Intermediate',
    parts: 12,
    learners: 877,
    updated: 'Nov 09',
    path: '/learn/quiz',
    tags: ['sql'],
  },
  {
    id: 'git-sheet',
    title: 'Git, the parts you’ll actually use',
    summary: 'One page: undo, rewrite, rescue, compare. Printable.',
    format: 'cheatsheet',
    topic: 'engineering',
    author: 'mara',
    minutes: 3,
    level: 'Intro',
    learners: 3902,
    updated: 'Sep 30',
    path: '/learn/cheat-sheet',
    tags: ['git', 'reference'],
  },
  {
    id: 'live-calendar',
    title: 'Live sessions this month',
    summary: 'Workshops, office hours and reading groups, with seats you can claim.',
    format: 'live',
    topic: 'leadership',
    author: 'kwame',
    minutes: 60,
    level: 'Intro',
    learners: 310,
    updated: 'Nov 17',
    path: '/learn/live',
    tags: ['workshop'],
  },
  {
    id: 'night-shift',
    title: 'Night Shift, ep. 14: The 3 a.m. rollback',
    summary: 'Kwame and June on deciding fast, saying “I don’t know” and writing it up after.',
    format: 'podcast',
    topic: 'leadership',
    author: 'kwame',
    minutes: 38,
    level: 'Intro',
    learners: 955,
    updated: 'Nov 14',
    path: '/learn/podcast',
    tags: ['incidents', 'decisions'],
  },
  {
    id: 'flags-lab',
    title: 'Ship behind a feature flag',
    summary: 'Hands-on: wrap a change, roll it to 5%, watch the graphs, roll back.',
    format: 'lab',
    topic: 'engineering',
    author: 'mara',
    minutes: 25,
    level: 'Intermediate',
    parts: 5,
    progress: 40,
    learners: 521,
    updated: 'Nov 06',
    path: '/learn/lab',
    tags: ['release', 'flags'],
  },
  {
    id: 'which-store',
    title: 'Which data store should I use?',
    summary: 'Answer four questions, get a recommendation and the reasons behind it.',
    format: 'guide',
    topic: 'engineering',
    author: 'mara',
    minutes: 4,
    level: 'Intermediate',
    learners: 1170,
    updated: 'Oct 21',
    path: '/learn/decision-guide',
    tags: ['architecture', 'databases'],
  },
  {
    id: 'design-crit',
    title: 'Running a design critique people look forward to',
    summary: 'A format, a script and the phrases that keep it kind and useful.',
    format: 'howto',
    topic: 'design',
    author: 'theo',
    minutes: 11,
    level: 'Intro',
    parts: 5,
    learners: 388,
    updated: 'Nov 01',
    tags: ['critique', 'feedback'],
  },
  {
    id: 'tokens-series',
    title: 'Tokens all the way down',
    summary: 'Four short videos on how our design tokens flow from Figma to production.',
    format: 'video',
    topic: 'design',
    author: 'theo',
    minutes: 41,
    level: 'Intermediate',
    parts: 4,
    progress: 100,
    learners: 603,
    updated: 'Oct 12',
    tags: ['design systems'],
  },
  {
    id: 'proposal',
    title: 'Write a proposal that gets a decision',
    summary: 'Structure, length and the one paragraph every reader skips to.',
    format: 'article',
    topic: 'writing',
    author: 'sol',
    minutes: 9,
    level: 'Intro',
    progress: 100,
    learners: 1520,
    updated: 'Sep 18',
    tags: ['docs', 'decisions'],
  },
  {
    id: 'first-week',
    title: 'Your first week at Kestrel',
    summary: 'Laptop, accounts, buddies and the five meetings worth going to.',
    format: 'path',
    topic: 'start',
    author: 'sol',
    minutes: 140,
    level: 'Intro',
    parts: 8,
    progress: 100,
    learners: 214,
    updated: 'Nov 10',
    tags: ['onboarding'],
  },
  {
    id: 'feedback-course',
    title: 'Feedback that lands',
    summary: 'A three-week course for new managers, with practice partners.',
    format: 'course',
    topic: 'leadership',
    author: 'kwame',
    minutes: 210,
    level: 'Intermediate',
    parts: 9,
    learners: 176,
    updated: 'Nov 02',
    tags: ['management', 'feedback'],
  },
  {
    id: 'phishing',
    title: 'Spot the phish',
    summary: 'Ten real emails we received. Which ones would you have clicked?',
    format: 'quiz',
    topic: 'security',
    author: 'june',
    minutes: 6,
    level: 'Intro',
    parts: 10,
    progress: 100,
    learners: 2410,
    updated: 'Oct 30',
    tags: ['phishing', 'required'],
  },
  {
    id: 'support-calls',
    title: 'Shadowing a support call, annotated',
    summary: 'A real call (with consent), paused at every moment worth learning from.',
    format: 'video',
    topic: 'customers',
    author: 'iris',
    minutes: 33,
    level: 'Intro',
    parts: 1,
    learners: 288,
    updated: 'Nov 08',
    tags: ['support', 'listening'],
  },
  {
    id: 'charts-lie',
    title: 'How charts lie (and how ours won’t)',
    summary: 'Truncated axes, dual scales, cherry-picked windows. With fixes.',
    format: 'article',
    topic: 'data',
    author: 'ana',
    minutes: 12,
    level: 'Intro',
    learners: 1102,
    updated: 'Oct 05',
    tags: ['charts'],
  },
  {
    id: 'oncall-path',
    title: 'Ready for on-call',
    summary: 'Everything to learn before your first rotation, with a shadow shift.',
    format: 'path',
    topic: 'engineering',
    author: 'mara',
    minutes: 300,
    level: 'Intermediate',
    parts: 7,
    learners: 205,
    updated: 'Nov 11',
    tags: ['on-call', 'required'],
  },
  {
    id: 'threat-model',
    title: 'Threat modeling in 30 minutes',
    summary: 'A lightweight workshop format any team can run before a launch.',
    format: 'live',
    topic: 'security',
    author: 'june',
    minutes: 30,
    level: 'Intermediate',
    learners: 142,
    updated: 'Nov 16',
    tags: ['workshop'],
  },
]

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, Item>

/** "1 h 34 m" / "9 min". */
export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} m` : `${h} h`
}

/** Priya's learning record, for pages that show progress. */
export const LEARNER_STATS = {
  streakDays: 11,
  minutesThisMonth: 312,
  finishedThisYear: 27,
  assignedDue: [
    { id: 'oncall-path', due: 'Dec 01' },
    { id: 'phishing', due: 'Done' },
  ],
}
