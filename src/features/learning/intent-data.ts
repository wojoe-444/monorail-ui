/*
 * Sample data for the "I need to…" home (HomeIntent): the jobs people come to
 * Field School with, each mapped to the shortest route through the catalog.
 * A route step can point at part of a longer item (one episode, one module),
 * because the shortest route rarely needs the whole thing.
 */

export type Verb = 'start' | 'ship' | 'fix' | 'decide' | 'lead' | 'write'

export const VERBS: { id: Verb; label: string; hint: string }[] = [
  { id: 'start', label: 'Get started', hint: 'New here, or new to a thing' },
  { id: 'ship', label: 'Ship', hint: 'Get a change out safely' },
  { id: 'fix', label: 'Fix', hint: 'Something is wrong right now' },
  { id: 'decide', label: 'Decide', hint: 'Pick between options' },
  { id: 'lead', label: 'Lead', hint: 'People, meetings, hard talks' },
  { id: 'write', label: 'Write', hint: 'Words other people will read' },
]

export interface RouteStep {
  item: string
  /** Only this part of the item, e.g. "Episode 3: The cache that lied". */
  part?: string
  /** Minutes for this step when it is a part of the item. */
  minutes?: number
  /** Why this, at this point in the route. One line. */
  why: string
}

export interface Job {
  id: string
  verb: Verb
  /** Completes the sentence "I need to …". */
  phrase: string
  /** Extra words people type for this job. */
  keywords: string[]
  route: RouteStep[]
  /** For when the route wasn't enough. */
  ask: { person: string; where: string }
  /** Times asked in the last 7 days. */
  asked: number
  urgent?: boolean
}

export const JOBS: Job[] = [
  {
    id: 'first-week',
    verb: 'start',
    phrase: 'get set up in my first week',
    keywords: ['onboarding', 'new', 'laptop', 'accounts'],
    route: [
      { item: 'first-week', part: 'Day 1–2: laptop, accounts, buddy', minutes: 35, why: 'The two days that unblock everything else.' },
      { item: 'git-sheet', why: 'Keep it open in a tab for your first pull requests.' },
    ],
    ask: { person: 'sol', where: '#new-at-kestrel' },
    asked: 12,
  },
  {
    id: 'support-call',
    verb: 'start',
    phrase: 'sit in on a customer call',
    keywords: ['support', 'customer', 'shadow', 'listening'],
    route: [{ item: 'support-calls', why: 'One real call, paused at each moment that matters.' }],
    ask: { person: 'iris', where: '#support-shadowing' },
    asked: 9,
  },
  {
    id: 'git-undo',
    verb: 'start',
    phrase: 'undo something in git',
    keywords: ['revert', 'reset', 'commit', 'rebase', 'mistake'],
    route: [{ item: 'git-sheet', part: 'The “Undo” column', minutes: 1, why: 'Find your situation in the left column, copy the line.' }],
    ask: { person: 'mara', where: '#eng-help' },
    asked: 61,
  },
  {
    id: 'flag-rollout',
    verb: 'ship',
    phrase: 'ship a risky change safely',
    keywords: ['feature flag', 'rollout', 'release', 'canary', 'deploy'],
    route: [
      { item: 'flags-lab', why: 'Do it once in a sandbox before you do it for real.' },
      {
        item: 'failure-modes',
        part: 'Episode 2: Ninety-nine percent',
        minutes: 15,
        why: 'Why the last 1% of a rollout is where things break.',
      },
    ],
    ask: { person: 'mara', where: '#release-help' },
    asked: 38,
  },
  {
    id: 'on-call',
    verb: 'ship',
    phrase: 'prepare for on-call',
    keywords: ['pager', 'rotation', 'incident', 'oncall'],
    route: [
      {
        item: 'oncall-path',
        part: 'Modules 1–3: alerts, runbooks, escalation',
        minutes: 95,
        why: 'The required part. The shadow shift books itself after.',
      },
      { item: 'night-shift', why: 'What the first bad night actually feels like.' },
      { item: 'rotate-keys', why: 'The one runbook you’re most likely to need cold.' },
    ],
    ask: { person: 'kwame', where: '#oncall-buddies' },
    asked: 44,
  },
  {
    id: 'leaked-secret',
    verb: 'fix',
    phrase: 'fix a leaked secret',
    keywords: ['api key', 'token', 'password', 'credential', 'rotate', 'github', 'security'],
    route: [
      { item: 'rotate-keys', why: 'Seven steps, in order. Start the clock now.' },
      { item: 'night-shift', part: '24:10 · Writing it up after', minutes: 9, why: 'Once it’s safe: the write-up, without blame.' },
    ],
    ask: { person: 'june', where: '/page sec-primary' },
    asked: 7,
    urgent: true,
  },
  {
    id: 'incident-now',
    verb: 'fix',
    phrase: 'handle an incident tonight',
    keywords: ['outage', 'down', 'paged', 'alert', 'rollback'],
    route: [
      {
        item: 'night-shift',
        part: '06:30 · Deciding with half the facts',
        minutes: 12,
        why: 'Roll back first, understand later. Here’s how to say so.',
      },
      { item: 'failure-modes', part: 'Episode 3: The cache that lied', minutes: 16, why: 'The most common shape of a Kestrel outage.' },
    ],
    ask: { person: 'kwame', where: '#incident-commanders' },
    asked: 19,
    urgent: true,
  },
  {
    id: 'phish',
    verb: 'fix',
    phrase: 'check if an email is phishing',
    keywords: ['email', 'suspicious', 'link', 'scam'],
    route: [{ item: 'phishing', why: 'Ten real ones. You’ll know the tells in six minutes.' }],
    ask: { person: 'june', where: 'Forward to phish@kestrel.dev' },
    asked: 27,
  },
  {
    id: 'database',
    verb: 'decide',
    phrase: 'pick a database',
    keywords: ['data store', 'postgres', 'redis', 'storage', 'architecture'],
    route: [
      { item: 'which-store', why: 'Four questions get you the house answer.' },
      { item: 'boring-tech', why: 'If you want to argue with the answer, read this first.' },
    ],
    ask: { person: 'mara', where: '#architecture' },
    asked: 23,
  },
  {
    id: 'experiment',
    verb: 'decide',
    phrase: 'read an experiment result',
    keywords: ['ab test', 'significance', 'statistics', 'metrics', 'readout'],
    route: [
      { item: 'data-path', part: 'Module 4: Reading a readout', minutes: 50, why: 'Confidence intervals without the textbook.' },
      { item: 'charts-lie', why: 'Before you put the result in a slide.' },
    ],
    ask: { person: 'ana', where: '#data-office-hours' },
    asked: 31,
  },
  {
    id: 'sql',
    verb: 'decide',
    phrase: 'trust a SQL query someone sent me',
    keywords: ['sql', 'join', 'query', 'numbers'],
    route: [{ item: 'sql-check', why: 'Twelve questions on exactly the traps that bite.' }],
    ask: { person: 'ana', where: '#data-office-hours' },
    asked: 14,
  },
  {
    id: 'feedback',
    verb: 'lead',
    phrase: 'give hard feedback',
    keywords: ['manager', 'difficult conversation', 'performance', 'review'],
    route: [
      {
        item: 'feedback-course',
        part: 'Lesson 2: The first two sentences',
        minutes: 20,
        why: 'Most of it is how you open. Rehearse this.',
      },
      { item: 'night-shift', part: '18:40 · Saying “I don’t know”', minutes: 7, why: 'Candor that doesn’t cost trust.' },
    ],
    ask: { person: 'kwame', where: 'Book 20 min with Kwame' },
    asked: 33,
  },
  {
    id: 'critique',
    verb: 'lead',
    phrase: 'run a design critique',
    keywords: ['crit', 'review', 'design', 'meeting'],
    route: [{ item: 'design-crit', why: 'A format and a script you can use this afternoon.' }],
    ask: { person: 'theo', where: '#design-crit' },
    asked: 11,
  },
  {
    id: 'threat-model',
    verb: 'lead',
    phrase: 'run a threat model before launch',
    keywords: ['security review', 'launch', 'risk', 'workshop'],
    route: [
      { item: 'threat-model', why: 'Thirty minutes, any team. Grab a seat in the next one.' },
      { item: 'rotate-keys', why: 'So your team knows the plan if a secret does leak.' },
    ],
    ask: { person: 'june', where: '#security' },
    asked: 8,
  },
  {
    id: 'proposal',
    verb: 'write',
    phrase: 'write a proposal',
    keywords: ['rfc', 'design doc', 'decision', 'pitch'],
    route: [
      { item: 'proposal', why: 'Structure, length and the paragraph every reader skips to.' },
      { item: 'charts-lie', part: 'Section 3: Honest axes', minutes: 4, why: 'If your proposal has a chart in it.' },
    ],
    ask: { person: 'sol', where: 'Send a draft to Sol' },
    asked: 29,
  },
  {
    id: 'chart',
    verb: 'write',
    phrase: 'make a chart that doesn’t mislead',
    keywords: ['graph', 'visualization', 'dashboard', 'slide'],
    route: [{ item: 'charts-lie', why: 'Truncated axes, dual scales, cherry-picked windows, and fixes.' }],
    ask: { person: 'ana', where: '#data-office-hours' },
    asked: 16,
  },
  {
    id: 'postmortem',
    verb: 'write',
    phrase: 'write up an incident',
    keywords: ['postmortem', 'retro', 'blameless', 'review'],
    route: [
      { item: 'night-shift', part: '24:10 · Writing it up after', minutes: 9, why: 'What a useful write-up has, and what it leaves out.' },
      { item: 'proposal', part: 'The decision paragraph', minutes: 3, why: 'The follow-ups are a decision. Write them like one.' },
    ],
    ask: { person: 'sol', where: '#writing-help' },
    asked: 13,
  },
]

/** More of the catalog for the A–Z index, beyond the items the mockups use. */
export const MORE_TITLES: string[] = [
  'Accessibility checks before you merge',
  'Alert fatigue, and how to end it',
  'An hour with the design system',
  'Asking for help without apologising',
  'Budgets for error, and spending them',
  'Code review that teaches',
  'Cohort analysis in one afternoon',
  'Delegation for people who hate delegating',
  'Dependency upgrades without fear',
  'Estimates, honestly',
  'Expense policy in two minutes',
  'Figma to production: a walkthrough',
  'Giving a demo that lands',
  'Hiring loops: being a good interviewer',
  'How payments move through Kestrel',
  'Interview notes that help the debrief',
  'Join, group, window: SQL beyond basics',
  'Keyboard shortcuts for the whole stack',
  'Leading your first retro',
  'Logs, metrics, traces: which to reach for',
  'Meeting notes people read',
  'Naming things (seriously)',
  'One-on-ones that aren’t status updates',
  'Pairing, remote edition',
  'Privacy reviews: when and how',
  'Quarterly planning without the theatre',
  'Release notes customers read',
  'Running user interviews',
  'Saying no to a stakeholder',
  'Style guide: the short version',
  'Testing the parts that break',
  'Time zones and async work',
  'Understanding our pricing',
  'Version control for designers',
  'What good looks like: engineering ladder',
  'Writing error messages',
  'Your laptop, secured',
  'Zero to dashboard in Looker',
]
