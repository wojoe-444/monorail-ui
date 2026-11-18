import { useState, type ReactNode } from 'react'
import { ArrowRight, BellRing, Check, Clock, MessageSquare, Plus, Quote } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { TableCard } from '@/components/ui/table-card'
import { Cover, FORMAT_ICONS, FormatBadge, ItemCover, PersonChip } from '@/features/learning/components'
import {
  FORMAT_LABELS,
  ITEM_BY_ID,
  PERSON_BY_ID,
  TOPIC_BY_ID,
  formatMinutes,
  type Format,
  type Item,
  type TopicId,
} from '@/features/learning/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Page 11, "Topic": everything on Data literacy, in the order the topic's
 * owner would hand it to you. One thing to start with, a short numbered run
 * for going deeper (each with why it comes next), then reference to look up
 * rather than read. The other 30-odd items are one click away, not on the page.
 */

const TOPIC = TOPIC_BY_ID.data
const START = ITEM_BY_ID['data-path']
const SHORT_START = ITEM_BY_ID['charts-lie']

interface Step {
  item: Item
  /** Why this comes at this point in the order. */
  why: string
}

/** Extra items for this page only, in the same shape as ITEMS. */
const extra = (i: Omit<Item, 'topic' | 'learners' | 'updated'> & Partial<Pick<Item, 'learners' | 'updated'>>): Item => ({
  topic: 'data',
  learners: 0,
  updated: 'Oct 01',
  ...i,
})

const DEEPER: Step[] = [
  {
    item: ITEM_BY_ID['sql-check'],
    why: 'Check yourself before you go on. If you miss more than three, do module 3 of the path again.',
  },
  {
    item: extra({
      id: 'readout',
      title: 'Reading an experiment readout without fooling yourself',
      summary: 'Confidence intervals, guardrail metrics and the one number people misquote.',
      format: 'article',
      author: 'ana',
      minutes: 16,
      level: 'Intermediate',
      learners: 498,
    }),
    why: 'Most of what you’ll do with data here is read someone else’s result. Learn that before running your own.',
  },
  {
    item: extra({
      id: 'sample-size',
      title: 'Sample size, without the maths',
      summary: 'Three short videos: why small tests lie, how long to run, when to stop.',
      format: 'video',
      author: 'dev',
      minutes: 27,
      level: 'Intermediate',
      parts: 3,
      learners: 361,
    }),
    why: 'The question you’ll be asked in every launch review: “Is that enough users?”',
  },
  {
    item: extra({
      id: 'cohort-lab',
      title: 'Build a retention cohort from raw events',
      summary: 'In a sandbox warehouse: events to weekly cohorts to the chart we use in QBRs.',
      format: 'lab',
      author: 'lena',
      minutes: 40,
      level: 'Intermediate',
      parts: 6,
      learners: 214,
    }),
    why: 'Doing it once by hand is how cohort charts stop being magic.',
  },
  {
    item: extra({
      id: 'when-tests-lie',
      title: 'When the A/B test lies: novelty, peeking and Simpson',
      summary: 'Five real Kestrel experiments that looked like wins, and why they weren’t.',
      format: 'article',
      author: 'dev',
      minutes: 22,
      level: 'Advanced',
      learners: 187,
    }),
    why: 'Last, because it only lands once you’ve trusted a result that turned out wrong.',
  },
]

interface Ref {
  title: string
  kind: string
  format: Format
  note: string
  owner: string
}

const REFERENCE: Ref[] = [
  {
    title: 'Metric definitions',
    kind: 'Glossary',
    format: 'cheatsheet',
    note: 'Active user, churn, ARR: the one definition each.',
    owner: 'Ana Ruiz',
  },
  {
    title: 'Which statistical test?',
    kind: 'Decision guide',
    format: 'guide',
    note: 'Four questions to the right test, or to “ask Dev”.',
    owner: 'Dev Malhotra',
  },
  {
    title: 'SQL style guide',
    kind: 'Reference',
    format: 'cheatsheet',
    note: 'CTEs over subqueries, naming, how we comment.',
    owner: 'Lena Fischer',
  },
  {
    title: 'Chart checklist',
    kind: 'Cheat sheet',
    format: 'cheatsheet',
    note: 'Ten checks before a chart goes in a doc.',
    owner: 'Ana Ruiz',
  },
  {
    title: 'Experiment readout template',
    kind: 'Template',
    format: 'howto',
    note: 'The doc every experiment ends with.',
    owner: 'Dev Malhotra',
  },
  {
    title: 'Where the data lives',
    kind: 'Map',
    format: 'article',
    note: 'Warehouse schemas, owners and freshness.',
    owner: 'Lena Fischer',
  },
]

interface Expert {
  name: string
  role: string
  initials: string
  asks: string[]
  availability: string
}

const EXPERTS: Expert[] = [
  {
    name: 'Ana Ruiz',
    role: 'Head of Data',
    initials: 'AR',
    asks: ['metric definitions', 'what to measure'],
    availability: 'Office hours Thu 15:00',
  },
  {
    name: 'Dev Malhotra',
    role: 'Data scientist, Experiments',
    initials: 'DM',
    asks: ['A/B tests', 'sample size'],
    availability: 'Usually replies within a day',
  },
  {
    name: 'Lena Fischer',
    role: 'Analytics engineer',
    initials: 'LF',
    asks: ['SQL', 'where a table lives'],
    availability: 'In #ask-data most mornings',
  },
]

const AUTHORS: Record<string, string> = { dev: 'Dev Malhotra', lena: 'Lena Fischer' }

const RELATED: { id: TopicId; why: string }[] = [
  { id: 'writing', why: 'Putting numbers in a doc people trust' },
  { id: 'engineering', why: 'Instrumentation, events and flags' },
  { id: 'customers', why: 'When the numbers and the calls disagree' },
]

/* ---------- Pieces ---------- */

function Author({ id }: { id: string }) {
  return <span className="text-xs text-muted-foreground">By {AUTHORS[id] ?? PERSON_BY_ID[id]?.name}</span>
}

function Shelf({ n, title, description, children }: { n: number; title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`shelf-${n}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground tabular-nums">
          {n}
        </span>
        <div className="min-w-0">
          <h2 id={`shelf-${n}`} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function StartHere() {
  const p = START.progress ?? 0
  const modules = START.parts ?? 5
  const done = Math.floor((p / 100) * modules)
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card className="gap-0 overflow-hidden py-0 sm:flex-row">
        <ItemCover item={START} className="aspect-[16/9] shrink-0 rounded-none sm:aspect-auto sm:w-48" />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <FormatBadge format={START.format} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {modules} modules · {formatMinutes(START.minutes)} · {START.level}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-balance">{START.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{START.summary}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>
                {done} of {modules} modules done
              </span>
              <span>{p}%</span>
            </div>
            <Progress value={p} aria-label="Path progress" />
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button asChild>
              <a href={href('/learn/course')}>
                Continue module {done + 1}
                <ArrowRight />
              </a>
            </Button>
            <span className="text-xs text-muted-foreground">Module {done + 1}: Distributions, and why the mean misleads</span>
          </div>
        </div>
      </Card>
      <div className="flex flex-col gap-4">
        <Card className="gap-3 py-5">
          <CardContent className="flex gap-3">
            <Quote className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Do the path even if you think you know what a median is. Module 2 is where most of us, me included, turned out to be wrong.
              </p>
              <PersonChip id="ana" showRole />
            </div>
          </CardContent>
        </Card>
        <a href={href('/learn/article')} className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="flex-row items-center gap-3 p-4 transition-shadow group-hover:shadow-elevation-2">
            <ItemCover item={SHORT_START} className="size-12 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                Only have {SHORT_START.minutes} minutes?
              </div>
              <div className="truncate text-sm font-medium group-hover:underline">{SHORT_START.title}</div>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Card>
        </a>
      </div>
    </div>
  )
}

function GoingDeeper() {
  const [done, setDone] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const total = DEEPER.reduce((m, s) => m + s.item.minutes, 0)

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-xs text-muted-foreground">
        <span>
          In this order. {DEEPER.length} pieces, about {formatMinutes(total)} in all.
        </span>
        <span className="tabular-nums">
          {done.size} of {DEEPER.length} done
        </span>
      </div>
      <ol>
        {DEEPER.map((s, n) => {
          const isDone = done.has(s.item.id)
          const Icon = FORMAT_ICONS[s.item.format]
          const last = n === DEEPER.length - 1
          const to = s.item.path
          return (
            <li key={s.item.id} className="relative flex gap-4 px-5 py-4">
              {!last && <span aria-hidden className="absolute top-12 bottom-0 left-[2.15rem] w-px bg-border" />}
              <button
                type="button"
                onClick={() => toggle(s.item.id)}
                aria-pressed={isDone}
                aria-label={isDone ? `Mark “${s.item.title}” not done` : `Mark “${s.item.title}” done`}
                className={cn(
                  'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  isDone ? 'border-success bg-success text-success-foreground' : 'bg-card hover:bg-accent',
                )}
              >
                {isDone ? <Check className="size-4" /> : n + 1}
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Icon className="size-3.5" aria-hidden />
                    {FORMAT_LABELS[s.item.format]}
                  </span>
                  <span className="tabular-nums">{formatMinutes(s.item.minutes)}</span>
                  <Badge variant={s.item.level === 'Advanced' ? 'secondary' : 'outline'}>{s.item.level}</Badge>
                </div>
                {to ? (
                  <a
                    href={href(to)}
                    className={cn(
                      'rounded-sm text-sm font-semibold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
                      isDone && 'text-muted-foreground line-through',
                    )}
                  >
                    {s.item.title}
                  </a>
                ) : (
                  <span className={cn('text-sm font-semibold', isDone && 'text-muted-foreground line-through')}>{s.item.title}</span>
                )}
                <p className="text-sm text-muted-foreground">{s.item.summary}</p>
                <p className="text-sm">
                  <span className="font-medium text-primary">Why now: </span>
                  {s.why}
                </p>
                <div className="pt-1">
                  <Author id={s.item.author} />
                </div>
              </div>
              <ItemCover item={s.item} className="hidden h-16 w-24 shrink-0 md:block" />
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

function Reference() {
  return (
    <TableCard title="Look it up" count={REFERENCE.length} description="Not for reading start to finish. Bookmark the ones you use.">
      <Table>
        <TableBody>
          {REFERENCE.map((r) => {
            const Icon = FORMAT_ICONS[r.format]
            return (
              <TableRow key={r.title}>
                <TableCell className="w-8 pr-0">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </TableCell>
                <TableCell className="font-medium sm:whitespace-nowrap">{r.title}</TableCell>
                <TableCell fill className="hidden text-muted-foreground sm:table-cell">
                  <span>{r.note}</span>
                </TableCell>
                <TableCell className="hidden text-xs whitespace-nowrap text-muted-foreground md:table-cell">{r.kind}</TableCell>
                <TableCell className="hidden text-xs whitespace-nowrap text-muted-foreground lg:table-cell">{r.owner}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableCard>
  )
}

/* ---------- Rail ---------- */

function Experts() {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">People to ask</CardTitle>
        <CardDescription className="text-xs">They’d rather you asked than guessed.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        {EXPERTS.map((e) => (
          <div key={e.name} className="flex gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary-soft-foreground">{e.initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="leading-tight">
                <div className="truncate text-sm font-medium">{e.name}</div>
                <div className="truncate text-xs text-muted-foreground">{e.role}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {e.asks.map((a) => (
                  <Badge key={a} variant="secondary" className="font-normal">
                    {a}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">{e.availability}</div>
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-2 border-t pt-4">
          <Button variant="outline" size="sm" className="justify-start">
            <MessageSquare />
            Ask in <span className="font-mono text-xs">#ask-data</span>
          </Button>
          <Button variant="ghost" size="sm" className="justify-start" asChild>
            <a href={href('/learn/live')}>
              <Clock />
              Data office hours, Thursdays
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Related() {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">Related topics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-3">
        {RELATED.map((r) => {
          const t = TOPIC_BY_ID[r.id]
          return (
            <a
              key={r.id}
              href={href('/learn/home/portal')}
              className="flex items-center gap-3 rounded-md p-2 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Cover seed={`topic-${t.id}`} series={t.series} motif="grid" className="size-9 shrink-0 rounded-md" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{t.count}</span>
                </span>
                <span className="truncate text-xs text-muted-foreground">{r.why}</span>
              </span>
            </a>
          )
        })}
      </CardContent>
    </Card>
  )
}

function NotHere() {
  return (
    <div className="rounded-xl border border-dashed p-5 text-sm">
      <h2 className="font-semibold">Not covered here</h2>
      <p className="mt-1 text-muted-foreground">
        Machine learning and model building live under Engineering › ML platform. Dashboards in Looker have their own course from IT.
      </p>
    </div>
  )
}

/* ---------- Page ---------- */

export function TopicPage() {
  const [following, setFollowing] = useState(false)
  const shown = 2 + DEEPER.length + REFERENCE.length

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Cover seed="topic-data-hero" series={TOPIC.series} motif="bars" className="hidden h-24 w-36 shrink-0 sm:block" />
        <div className="min-w-0 flex-1">
          <PageHeader
            eyebrow="Topic"
            title={TOPIC.name}
            description={`${TOPIC.blurb} Curated by Ana Ruiz: ${shown} of ${TOPIC.count} pieces, in the order we’d hand them to you.`}
            actions={
              <>
                <Button variant="outline" onClick={() => setFollowing((f) => !f)} aria-pressed={following}>
                  {following ? <BellRing /> : <Plus />}
                  {following ? 'Following' : 'Follow topic'}
                </Button>
                <Button variant="ghost" asChild>
                  <a href={href('/learn/home/portal')}>
                    All {TOPIC.count} items
                    <ArrowRight />
                  </a>
                </Button>
              </>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <Shelf n={1} title="Start here" description="One thing, not five. If you do nothing else on this page, do this.">
            <StartHere />
          </Shelf>
          <Shelf n={2} title="Then go deeper" description="A short run in a deliberate order. Each step says why it comes where it does.">
            <GoingDeeper />
          </Shelf>
          <Shelf n={3} title="Keep for reference" description="For when you’re in the middle of something and need the answer.">
            <Reference />
          </Shelf>
        </div>
        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-20">
          <Experts />
          <Related />
          <NotHere />
        </aside>
      </div>
    </div>
  )
}
