import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  MessageSquare,
  Play,
  Route,
  Share2,
  Signal,
  Sparkles,
  Users,
} from 'lucide-react'

import { EntityHeader } from '@/components/layout/EntityHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableCard } from '@/components/ui/table-card'
import { Textarea } from '@/components/ui/textarea'
import { FORMAT_ICONS, ItemCover, PersonChip } from '@/features/learning/components'
import { FORMAT_LABELS, HUB, ITEM_BY_ID, PERSON_BY_ID, formatMinutes, type Format } from '@/features/learning/data'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Page 4: a learning path. The commitment is large (five modules, six
 * hours), so the page leads with the one next step and how small it is.
 */

const COURSE = ITEM_BY_ID['data-path']

/** Mockup pages that show each lesson format. */
const FORMAT_PATH: Partial<Record<Format, string>> = {
  video: '/learn/video',
  article: '/learn/article',
  quiz: '/learn/quiz',
  lab: '/learn/lab',
  howto: '/learn/how-to',
  cheatsheet: '/learn/cheat-sheet',
  live: '/learn/live',
  podcast: '/learn/podcast',
}

interface Lesson {
  title: string
  format: Format
  minutes: number
  done?: boolean
  /** A note shown on done lessons, e.g. a quiz score. */
  note?: string
  path?: string
}

interface Module {
  title: string
  outcome: string
  lessons: Lesson[]
}

const MODULES: Module[] = [
  {
    title: 'Ask a good question',
    outcome: 'Turn “is it working?” into something a number can answer.',
    lessons: [
      { title: 'Why “is it working?” isn’t a question', format: 'video', minutes: 7, done: true },
      { title: 'From hunch to hypothesis', format: 'article', minutes: 9, done: true },
      { title: 'Write a question a number can answer', format: 'howto', minutes: 12, done: true },
      { title: 'Find the metric that already exists', format: 'lab', minutes: 21, done: true },
      { title: 'Good question or bad question?', format: 'quiz', minutes: 6, done: true, note: '5 of 6' },
    ],
  },
  {
    title: 'Medians and spread',
    outcome: 'Report the number that describes most people, not the one that sounds best.',
    lessons: [
      { title: 'The average checkout time lies', format: 'video', minutes: 8, done: true },
      { title: 'Medians, percentiles and the long tail', format: 'article', minutes: 14, done: true },
      { title: 'Reading a distribution at a glance', format: 'video', minutes: 9, done: true },
      { title: 'Plot p50 and p95 from real checkout data', format: 'lab', minutes: 25 },
      { title: 'Which number would you report?', format: 'quiz', minutes: 8 },
      { title: 'Summary statistics on one page', format: 'cheatsheet', minutes: 6, done: true, note: 'Saved' },
    ],
  },
  {
    title: 'How charts lie',
    outcome: 'Spot a misleading chart in seconds, and draw yours so it can’t mislead.',
    lessons: [
      { title: 'How charts lie (and how ours won’t)', format: 'article', minutes: 12 },
      { title: 'Redrawing five real dashboards', format: 'video', minutes: 18 },
      { title: 'Fix the misleading chart', format: 'lab', minutes: 25 },
      { title: 'Spot the trick', format: 'quiz', minutes: 10 },
    ],
  },
  {
    title: 'SQL you can trust',
    outcome: 'Read a query and say what it counts, including what it double-counts.',
    lessons: [
      { title: 'Joins, drawn', format: 'cheatsheet', minutes: 4, path: '/learn/cheat-sheet' },
      { title: 'Grouping without getting fooled', format: 'video', minutes: 16 },
      { title: 'Debug a double-counting query', format: 'lab', minutes: 40 },
      { title: 'Can you read this query?', format: 'quiz', minutes: 12, path: '/learn/quiz' },
      { title: 'Data Hour, ep. 6: The query that cost us a quarter', format: 'podcast', minutes: 28 },
    ],
  },
  {
    title: 'Run your own experiment readout',
    outcome: 'Take an A/B test from raw events to a one-page decision.',
    lessons: [
      { title: 'Anatomy of a readout', format: 'article', minutes: 10 },
      { title: 'Sample size, without the maths anxiety', format: 'video', minutes: 14 },
      { title: 'From raw events to a decision', format: 'lab', minutes: 31 },
      { title: 'The one-page readout template', format: 'cheatsheet', minutes: 5 },
      { title: 'Readout clinic with Ana', format: 'live', minutes: 30, path: '/learn/live' },
    ],
  },
]

const ALL_LESSONS = MODULES.flatMap((m, mi) => m.lessons.map((l, li) => ({ ...l, module: mi, index: li })))
const DONE = ALL_LESSONS.filter((l) => l.done).length
const PERCENT = Math.round((DONE / ALL_LESSONS.length) * 100)
const NEXT = ALL_LESSONS.find((l) => !l.done)!
const FIRST = ALL_LESSONS[0]
const LEFT = ALL_LESSONS.filter((l) => !l.done).reduce((n, l) => n + l.minutes, 0)

const lessonPath = (l: Lesson) => l.path ?? FORMAT_PATH[l.format] ?? '/learn/course'

const OUTCOMES = [
  'Write a question a dashboard can actually answer',
  'Choose between mean, median and p95, and say why',
  'Catch a truncated axis or a cherry-picked window before it ships',
  'Read a SQL query and know what it counts',
  'Present an experiment result your team can decide on',
]

const TABS: PageTab[] = [
  { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
  { id: 'discussion', label: 'Discussion', icon: MessageSquare, count: 24 },
  { id: 'people', label: 'People', icon: Users, count: 86 },
]

export function CoursePage() {
  const [tab] = usePageTab(TABS)
  const [saved, setSaved] = useState(true)

  return (
    <div className="flex flex-col gap-8">
      <EntityHeader
        back={{ label: 'Curriculum map', path: '/learn/home/map' }}
        media={<ItemCover item={COURSE} className="size-12 shrink-0 rounded-xl" />}
        title={COURSE.title}
        badges={<Badge variant="primary">Learning path</Badge>}
        meta={[
          { label: <PersonChip id={COURSE.author} /> },
          { icon: Route, label: `${MODULES.length} modules · ${ALL_LESSONS.length} lessons` },
          { icon: Clock, label: formatMinutes(COURSE.minutes) },
          { icon: Signal, label: COURSE.level },
          { icon: CircleCheck, label: `${COURSE.learners} finished in 90 days` },
        ]}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={saved ? 'Remove from saved' : 'Save for later'}
              aria-pressed={saved}
              onClick={() => setSaved(!saved)}
            >
              <Bookmark className={cn(saved && 'fill-current')} />
            </Button>
            <Button variant="outline">
              <Share2 />
              Share
            </Button>
          </>
        }
        tabs={TABS}
        tabsLabel="Path sections"
      >
        <div className="mt-4 flex max-w-md items-center gap-3">
          <Progress value={PERCENT} aria-label={`${PERCENT}% complete`} />
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {PERCENT}% · {formatMinutes(LEFT)} left
          </span>
        </div>
      </EntityHeader>

      {tab === 'syllabus' && <Syllabus />}
      {tab === 'discussion' && <Discussion />}
      {tab === 'people' && <People />}
    </div>
  )
}

/* ---------- Syllabus ---------- */

function NextStep({ fresh }: { fresh: boolean }) {
  const lesson = fresh ? FIRST : NEXT
  const Icon = FORMAT_ICONS[lesson.format]
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
          <Icon className="size-6" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">{fresh ? 'Start here' : 'Your next step'}</span>
          <h2 className="text-lg font-semibold tracking-tight">{lesson.title}</h2>
          <p className="text-sm text-muted-foreground">
            Module {lesson.module + 1}, lesson {lesson.index + 1} · {FORMAT_LABELS[lesson.format]} · {formatMinutes(lesson.minutes)}
          </p>
        </div>
        <Button size="lg" asChild className="shrink-0">
          <a href={href(lessonPath(lesson))}>
            <Play />
            {fresh ? 'Start the first lesson' : 'Continue'}
          </a>
        </Button>
      </div>
      <div className="border-t bg-muted/50 px-6 py-3 text-sm text-muted-foreground">
        {fresh ? (
          <>
            <span className="font-medium text-foreground">Seven minutes, no sign-up.</span> Watch one short video and decide then. Progress
            saves itself, and every module stands on its own.
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">You’re {PERCENT}% through.</span> Finish this lab and Module 2 is one short quiz
            from done. At your pace of about 40 minutes a week, you’ll finish in early January.
          </>
        )}
      </div>
    </Card>
  )
}

function ModuleMark({ done, total, index }: { done: number; total: number; index: number }) {
  const complete = done === total
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--muted)" strokeWidth="3" />
        {done > 0 && (
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke={complete ? 'var(--success)' : 'var(--primary)'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(done / total) * c} ${c}`}
          />
        )}
      </svg>
      {complete ? <Check className="size-4 text-success" /> : <span className="text-sm font-semibold tabular-nums">{index + 1}</span>}
    </span>
  )
}

function ModuleRow({ m, index, fresh, defaultOpen }: { m: Module; index: number; fresh: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const done = fresh ? 0 : m.lessons.filter((l) => l.done).length
  const minutes = m.lessons.reduce((n, l) => n + l.minutes, 0)
  const bodyId = `module-${index}`
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-6 py-4 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <ModuleMark done={done} total={m.lessons.length} index={index} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">
            <span className="text-muted-foreground">Module {index + 1} · </span>
            {m.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">{m.outcome}</span>
        </span>
        <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block">
          {done > 0 ? `${done}/${m.lessons.length} lessons` : `${m.lessons.length} lessons`} · {formatMinutes(minutes)}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ol id={bodyId} className="pb-3">
          {m.lessons.map((l, li) => {
            const Icon = FORMAT_ICONS[l.format]
            const isDone = !fresh && l.done
            const isNext = fresh ? index === 0 && li === 0 : index === NEXT.module && li === NEXT.index
            return (
              <li key={l.title}>
                <a
                  href={href(lessonPath(l))}
                  className={cn(
                    'mx-3 flex items-center gap-3 rounded-lg py-2 pr-3 pl-3 text-sm sm:pl-[3.25rem] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
                    isNext && 'bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', !isNext && 'text-muted-foreground')} aria-hidden />
                  <span className={cn('min-w-0 flex-1 sm:truncate', isDone && 'text-muted-foreground')}>{l.title}</span>
                  {isNext && (
                    <Badge variant="default" className="max-sm:hidden">
                      Up next
                    </Badge>
                  )}
                  {isDone && l.note && <span className="hidden text-xs text-muted-foreground sm:inline">{l.note}</span>}
                  <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{l.minutes} min</span>
                  <span className="flex w-4 shrink-0 justify-center">
                    {isDone ? (
                      <Check className="size-4 text-success" aria-label="Done" />
                    ) : (
                      <span className="size-2 rounded-full border border-muted-foreground/50" aria-hidden />
                    )}
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
      )}
    </li>
  )
}

function Syllabus() {
  const [view, setView] = useState<'me' | 'new'>('me')
  const fresh = view === 'new'
  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted-foreground">{COURSE.summary}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Preview as</span>
            <Segmented
              aria-label="Preview the page as"
              value={view}
              onChange={setView}
              options={[
                { value: 'me', label: HUB.learner.first },
                { value: 'new', label: 'Someone new' },
              ]}
            />
          </div>
        </div>

        <NextStep fresh={fresh} />

        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Syllabus</CardTitle>
            <CardDescription>Take the modules in order, or skip to the one you need. Nothing is locked.</CardDescription>
          </CardHeader>
          <ol className="divide-y border-t">
            {MODULES.map((m, i) => (
              <ModuleRow key={`${m.title}-${view}`} m={m} index={i} fresh={fresh} defaultOpen={fresh ? i === 0 : i === NEXT.module} />
            ))}
          </ol>
        </Card>
      </div>

      <aside className="flex flex-col gap-4">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>You’ll be able to</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3 text-sm">
              {OUTCOMES.map((o) => (
                <li key={o} className="flex gap-2.5">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {o}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Before you start</CardTitle>
            <CardDescription>Nothing is required. These help.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="You have this" />
              <span>Comfortable with a spreadsheet and percentages. No algebra.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Done" />
              <span>
                Read access to the analytics warehouse <span className="text-muted-foreground">(requested in your first week)</span>
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="mt-1.5 size-2 shrink-0 rounded-full border border-muted-foreground/60" aria-hidden />
              <span>
                <a className="font-medium text-primary hover:underline" href={href('/learn/cheat-sheet')}>
                  Git, the parts you’ll use
                </a>{' '}
                <span className="text-muted-foreground">for the labs in Module 4</span>
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-t">
            <p className="text-xs text-muted-foreground">
              Module 4 also counts toward{' '}
              <a className="font-medium text-foreground hover:underline" href={href('/learn/home/map')}>
                Ready for on-call
              </a>
              .
            </p>
          </CardFooter>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Winter cohort</CardTitle>
            <CardDescription>Same lessons, plus a 30-minute call each Tuesday with Ana.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden />
                Starts Dec 2
              </span>
              <span className="tabular-nums text-muted-foreground">14 of 20 seats</span>
            </div>
            <Progress value={70} aria-label="14 of 20 seats taken" />
            <AvatarStack ids={['kwame', 'iris', 'theo', 'june', 'sol']} more={9} />
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Join the cohort
            </Button>
          </CardFooter>
        </Card>
      </aside>
    </div>
  )
}

function AvatarStack({ ids, more }: { ids: string[]; more: number }) {
  return (
    <div className="flex -space-x-1.5">
      {ids.map((id) => (
        <Avatar key={id} className="size-7 ring-2 ring-card">
          <AvatarFallback className="text-[10px]">{PERSON_BY_ID[id].initials}</AvatarFallback>
        </Avatar>
      ))}
      <Avatar className="size-7 ring-2 ring-card">
        <AvatarFallback className="text-[10px] text-muted-foreground">+{more}</AvatarFallback>
      </Avatar>
    </div>
  )
}

/* ---------- Discussion ---------- */

interface Thread {
  id: number
  author: string
  initials: string
  module: number
  title: string
  body: string
  replies: number
  when: string
  answeredBy?: string
}

const THREADS: Thread[] = [
  {
    id: 1,
    author: 'Lena Fischer',
    initials: 'LF',
    module: 1,
    title: 'Is p95 ever the wrong number to put on a dashboard?',
    body: 'Our checkout p95 jumps every Monday because of batch jobs. Should we report p90, or explain the jump?',
    replies: 7,
    when: '2 h ago',
    answeredBy: 'ana',
  },
  {
    id: 2,
    author: 'Omar Qureshi',
    initials: 'OQ',
    module: 3,
    title: 'The double-counting lab: LEFT JOIN or a subquery?',
    body: 'Both give the right count. Is one easier to read in review?',
    replies: 4,
    when: 'Yesterday',
  },
  {
    id: 3,
    author: 'Priya Raman',
    initials: 'PR',
    module: 0,
    title: 'Sharing my rewritten question for the refunds dashboard',
    body: 'Before: “Are refunds getting worse?” After: “What share of orders placed in a week are refunded within 30 days?”',
    replies: 12,
    when: 'Nov 9',
    answeredBy: 'ana',
  },
  {
    id: 4,
    author: 'Dev Patel',
    initials: 'DP',
    module: 2,
    title: 'Dual axes: ever OK?',
    body: 'Finance loves them. Is there a version that doesn’t mislead?',
    replies: 9,
    when: 'Nov 7',
  },
]

function Discussion() {
  const [threads, setThreads] = useState(THREADS)
  const [draft, setDraft] = useState('')
  const post = () => {
    if (!draft.trim()) return
    setThreads([
      {
        id: Date.now(),
        author: HUB.learner.name,
        initials: HUB.learner.initials,
        module: NEXT.module,
        title: draft.trim(),
        body: '',
        replies: 0,
        when: 'Just now',
      },
      ...threads,
    ])
    setDraft('')
  }
  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="gap-3">
          <CardContent className="flex flex-col gap-3">
            <Label htmlFor="new-thread">Ask the cohort</Label>
            <Textarea
              id="new-thread"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`A question about Module ${NEXT.module + 1}, a chart you’re unsure of, a query that looks off…`}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Ana or a TA answers within a working day.</span>
              <Button variant="secondary" onClick={post} disabled={!draft.trim()}>
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
        <ul className="flex flex-col gap-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Card className="gap-3 py-5">
                <CardContent className="flex gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{t.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t.author}</span>
                      <span>{t.when}</span>
                      <Badge variant="outline">Module {t.module + 1}</Badge>
                      {t.answeredBy && (
                        <Badge variant="success">
                          <Check />
                          Answered by {PERSON_BY_ID[t.answeredBy].name.split(' ')[0]}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold">{t.title}</h3>
                    {t.body && <p className="text-sm text-muted-foreground">{t.body}</p>}
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquare className="size-3.5" aria-hidden />
                      {t.replies === 0 ? 'No replies yet' : `${t.replies} replies`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>House rules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>Paste the chart or query, not a screenshot of it, so others can try it.</p>
          <p>No customer data in posts. Use the anonymised sample warehouse.</p>
          <p>“I don’t get it” is a fine question. Most people here didn’t either.</p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- People ---------- */

const LEARNERS = [
  { name: 'Priya Raman', team: 'Payments', module: 1, pct: 36, active: 'Today' },
  { name: 'Lena Fischer', team: 'Growth', module: 3, pct: 71, active: 'Today' },
  { name: 'Omar Qureshi', team: 'Platform', module: 3, pct: 64, active: 'Yesterday' },
  { name: 'Dev Patel', team: 'Finance tools', module: 2, pct: 48, active: 'Nov 16' },
  { name: 'Hana Sato', team: 'Support tooling', module: 1, pct: 30, active: 'Nov 15' },
  { name: 'Marco Bellini', team: 'Payments', module: 0, pct: 12, active: 'Nov 12' },
]

function People() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <TableCard
        title="Taking it now"
        count={86}
        description="People who opened a lesson in the last 30 days. Only names and progress are shown."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="max-sm:hidden">Team</TableHead>
              <TableHead>Module</TableHead>
              <TableHead numeric className="max-sm:hidden">
                Last active
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LEARNERS.map((p) => (
              <TableRow key={p.name}>
                <TableCell fill>
                  <span className={cn(p.name === HUB.learner.name && 'font-medium')}>
                    {p.name}
                    {p.name === HUB.learner.name && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground max-sm:hidden">{p.team}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-xs tabular-nums">{p.module + 1}</span>
                    <Progress value={p.pct} className="w-20" aria-label={`${p.pct}% complete`} />
                  </span>
                </TableCell>
                <TableCell numeric className="text-muted-foreground max-sm:hidden">
                  {p.active}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      <div className="flex flex-col gap-4">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Teaching it</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PersonChip id="ana" showRole size="md" />
            <p className="text-sm text-muted-foreground">
              “I wrote this for the engineer who has been handed a dashboard and asked what it means. You don’t need maths. You need better
              questions.”
            </p>
            <div className="flex flex-col gap-3 border-t pt-4">
              <span className="text-xs font-medium text-muted-foreground">Teaching assistants</span>
              <PersonChip id="mara" showRole />
              <PersonChip id="theo" showRole />
            </div>
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Finished recently</CardTitle>
            <CardDescription>Ask them how they used it.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <PersonChip id="kwame" showRole />
            <PersonChip id="iris" showRole />
            <a href={href('/learn/progress')} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Your own record
              <ArrowRight className="size-4" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
