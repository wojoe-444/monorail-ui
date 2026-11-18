import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Captions, Check, ChevronLeft, ChevronRight, ListVideo, Play, Plus } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SearchField } from '@/components/ui/search-field'
import { Segmented } from '@/components/ui/segmented'
import { Cover, PersonChip } from '@/features/learning/components'
import { HUB, ITEM_BY_ID, PERSON_BY_ID, TOPIC_BY_ID, formatMinutes, type TopicId } from '@/features/learning/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/* ---------- Sample shelf content (local to this mockup) ---------- */

type Motif = 'rings' | 'bars' | 'grid' | 'waves' | 'arcs' | 'steps'

interface Clip {
  id: string
  title: string
  /** Series or kind, shown above the title. */
  kicker: string
  author: string
  topic: TopicId
  minutes: number
  motif?: Motif
  /** 0–100 watched. */
  progress?: number
  note?: string
  path?: string
}

const CONTINUE: Clip[] = [
  {
    id: 'fm-4',
    kicker: 'Failure Modes · Ep. 4',
    title: 'Retries all the way down',
    author: 'mara',
    topic: 'engineering',
    minutes: 14,
    progress: 44,
    note: '8 min left',
    path: '/learn/video',
  },
  {
    id: 'support-call',
    kicker: 'Single film',
    title: 'Shadowing a support call, annotated',
    author: 'iris',
    topic: 'customers',
    minutes: 33,
    motif: 'waves',
    progress: 61,
    note: '13 min left',
    path: '/learn/video',
  },
  {
    id: 'dl-2',
    kicker: 'Data literacy · Module 2',
    title: 'What a median hides',
    author: 'ana',
    topic: 'data',
    minutes: 11,
    motif: 'grid',
    progress: 20,
    note: '9 min left',
    path: '/learn/course',
  },
  {
    id: 'flags-walk',
    kicker: 'Lab walkthrough',
    title: 'Ship behind a feature flag, narrated',
    author: 'mara',
    topic: 'engineering',
    minutes: 9,
    motif: 'steps',
    progress: 72,
    note: '3 min left',
    path: '/learn/lab',
  },
  {
    id: 'crit-live',
    kicker: 'Recording',
    title: 'Design crit, live: the new checkout',
    author: 'theo',
    topic: 'design',
    minutes: 46,
    motif: 'rings',
    progress: 12,
    note: '40 min left',
    path: '/learn/video',
  },
]

const NEW_THIS_WEEK: Clip[] = [
  {
    id: 'tm-rec',
    kicker: 'Recording · Mon Nov 16',
    title: 'Threat modeling in 30 minutes',
    author: 'june',
    topic: 'security',
    minutes: 31,
    motif: 'rings',
    path: '/learn/live',
  },
  {
    id: 'key-screen',
    kicker: 'Screencast · Thu Nov 12',
    title: 'Rotating a leaked key, start to finish',
    author: 'june',
    topic: 'security',
    minutes: 6,
    motif: 'steps',
    path: '/learn/how-to',
  },
  {
    id: 'readout',
    kicker: 'Teardown · Fri Nov 13',
    title: 'An experiment readout, line by line',
    author: 'ana',
    topic: 'data',
    minutes: 18,
    motif: 'bars',
    path: '/learn/video',
  },
  {
    id: 'demo-q4',
    kicker: 'Demo day · Tue Nov 17',
    title: 'Platform, Q4: what shipped and why',
    author: 'ben',
    topic: 'engineering',
    minutes: 52,
    motif: 'arcs',
    path: '/learn/video',
  },
  {
    id: 'np-14',
    kicker: 'Night Shift · Video cut',
    title: 'The 3 a.m. rollback',
    author: 'kwame',
    topic: 'leadership',
    minutes: 38,
    motif: 'waves',
    path: '/learn/podcast',
  },
  {
    id: 'cust-q',
    kicker: 'Support desk · Wed Nov 18',
    title: 'The five questions we hear most this month',
    author: 'iris',
    topic: 'customers',
    minutes: 8,
    motif: 'grid',
    path: '/learn/video',
  },
]

interface Series {
  id: string
  title: string
  topic: TopicId
  author: string
  episodes: number
  minutes: number
  blurb: string
  motif: Motif
  watched?: number
  path?: string
}

const SERIES: Series[] = [
  {
    id: 'failure-modes',
    title: 'Failure Modes',
    topic: 'engineering',
    author: 'mara',
    episodes: 6,
    minutes: 94,
    blurb: 'How real systems break, told by the people who were paged.',
    motif: 'bars',
    watched: 3,
    path: '/learn/video',
  },
  {
    id: 'tokens-series',
    title: 'Tokens all the way down',
    topic: 'design',
    author: 'theo',
    episodes: 4,
    minutes: 41,
    blurb: 'Design tokens from Figma to production.',
    motif: 'bars',
    watched: 4,
  },
  {
    id: 'ten-min-sql',
    title: 'Ten-minute SQL',
    topic: 'data',
    author: 'ana',
    episodes: 8,
    minutes: 80,
    blurb: 'One idea per episode, one query you can run after.',
    motif: 'grid',
  },
  {
    id: 'chart-crimes',
    title: 'Chart crimes',
    topic: 'data',
    author: 'ana',
    episodes: 5,
    minutes: 37,
    blurb: 'Real charts from real decks, and how to fix them.',
    motif: 'bars',
  },
  {
    id: 'first-90',
    title: 'Your first 90 days managing',
    topic: 'leadership',
    author: 'kwame',
    episodes: 6,
    minutes: 72,
    blurb: 'One-on-ones, the first hard call, and what to stop doing.',
    motif: 'arcs',
  },
  {
    id: 'paper-cuts',
    title: 'Paper cuts',
    topic: 'design',
    author: 'theo',
    episodes: 7,
    minutes: 49,
    blurb: 'Seven-minute fixes to small things that annoy customers.',
    motif: 'steps',
  },
  {
    id: 'the-queue',
    title: 'The queue',
    topic: 'customers',
    author: 'iris',
    episodes: 5,
    minutes: 55,
    blurb: 'A week on the support desk, one shift per episode.',
    motif: 'waves',
  },
  {
    id: 'secrets',
    title: 'Keys, tokens and other secrets',
    topic: 'security',
    author: 'june',
    episodes: 4,
    minutes: 34,
    blurb: 'Where secrets leak from, and how we keep them in.',
    motif: 'rings',
  },
  {
    id: 'plain-words',
    title: 'Plain words',
    topic: 'writing',
    author: 'sol',
    episodes: 6,
    minutes: 42,
    blurb: 'Rewriting real Kestrel docs, live, sentence by sentence.',
    motif: 'waves',
  },
]

const SHORTS: Clip[] = [
  {
    id: 's-revert',
    kicker: 'Short',
    title: 'git revert vs. git reset, in one picture',
    author: 'mara',
    topic: 'engineering',
    minutes: 4,
    motif: 'steps',
    path: '/learn/cheat-sheet',
  },
  { id: 's-median', kicker: 'Short', title: 'Why we report p95, not the average', author: 'ana', topic: 'data', minutes: 6, motif: 'bars' },
  {
    id: 's-phish',
    kicker: 'Short',
    title: 'The phishing email that almost worked',
    author: 'june',
    topic: 'security',
    minutes: 5,
    motif: 'rings',
    path: '/learn/quiz',
  },
  {
    id: 's-standup',
    kicker: 'Short',
    title: 'A stand-up in seven minutes flat',
    author: 'kwame',
    topic: 'leadership',
    minutes: 7,
    motif: 'arcs',
  },
  { id: 's-subject', kicker: 'Short', title: 'Subject lines people open', author: 'sol', topic: 'writing', minutes: 3, motif: 'waves' },
  {
    id: 's-store',
    kicker: 'Short',
    title: 'Postgres first: the four exceptions',
    author: 'mara',
    topic: 'engineering',
    minutes: 8,
    motif: 'grid',
    path: '/learn/decision-guide',
  },
  {
    id: 's-sorry',
    kicker: 'Short',
    title: 'Saying sorry to a customer, properly',
    author: 'iris',
    topic: 'customers',
    minutes: 5,
    motif: 'waves',
  },
]

const BECAUSE: Clip[] = [
  {
    id: 'b-dark',
    kicker: 'Paper cuts · Ep. 3',
    title: 'Dark mode is not “invert the colors”',
    author: 'theo',
    topic: 'design',
    minutes: 7,
    motif: 'steps',
  },
  {
    id: 'b-naming',
    kicker: 'Talk',
    title: 'Naming things in a design system',
    author: 'theo',
    topic: 'design',
    minutes: 24,
    motif: 'grid',
  },
  {
    id: 'b-contrast',
    kicker: 'Workshop recording',
    title: 'Accessible color, in practice',
    author: 'theo',
    topic: 'design',
    minutes: 38,
    motif: 'rings',
  },
  {
    id: 'b-crit',
    kicker: 'How-to, filmed',
    title: 'Running a design critique people look forward to',
    author: 'theo',
    topic: 'design',
    minutes: 11,
    motif: 'steps',
    path: '/learn/how-to',
  },
  {
    id: 'b-css',
    kicker: 'Pairing session',
    title: 'From token to CSS variable, live',
    author: 'mara',
    topic: 'engineering',
    minutes: 29,
    motif: 'bars',
  },
]

const TOPIC_FILTERS: { value: 'all' | TopicId; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'design', label: 'Design' },
  { value: 'data', label: 'Data' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'customers', label: 'Customers' },
]

/* ---------- Page ---------- */

export function HomeShelf() {
  const [topic, setTopic] = useState<'all' | TopicId>('all')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const match = (c: { title: string }) => !q || c.title.toLowerCase().includes(q)
  const series = SERIES.filter((s) => (topic === 'all' || s.topic === topic) && match(s))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Screening room"
        description={`Talks, series and recordings from across ${HUB.org}. Every video has a transcript and chapters.`}
        actions={
          <SearchField
            size="sm"
            placeholder="Search videos"
            aria-label="Search videos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-64"
          />
        }
      />

      <FeaturedHero />

      <Shelf title="Continue watching" description={`Pick up where you left off, ${HUB.learner.first}.`}>
        {CONTINUE.filter(match).map((c) => (
          <ClipCard key={c.id} clip={c} />
        ))}
      </Shelf>

      <Shelf title="New this week" description="Recorded or published Nov 12 – 18.">
        {NEW_THIS_WEEK.filter(match).map((c) => (
          <ClipCard key={c.id} clip={c} />
        ))}
      </Shelf>

      <Shelf
        title="Series by topic"
        description="Watch in order. Most episodes stand on their own too."
        controls={<Segmented aria-label="Series topic" value={topic} onChange={setTopic} options={TOPIC_FILTERS} />}
      >
        {series.length === 0 && <p className="py-10 text-sm text-muted-foreground">No series match.</p>}
        {series.map((s) => (
          <SeriesCard key={s.id} series={s} />
        ))}
      </Shelf>

      <Shelf title="Under 10 minutes" description="For the gap between meetings.">
        {SHORTS.filter(match).map((c) => (
          <ClipCard key={c.id} clip={c} size="sm" />
        ))}
      </Shelf>

      <Shelf
        title="Because you watched Tokens all the way down"
        description="You finished it on Oct 14. These pick up the same threads: theming, naming and handing design to code."
      >
        {BECAUSE.filter(match).map((c) => (
          <ClipCard key={c.id} clip={c} />
        ))}
      </Shelf>

      <p className="flex items-center gap-2 border-t pt-6 text-sm text-muted-foreground">
        <Captions className="size-4 shrink-0" />
        <span>
          Rather read? Every video here has a searchable transcript, or browse{' '}
          <a href={href('/learn/article')} className="font-medium text-foreground underline-offset-4 hover:underline">
            articles
          </a>{' '}
          and{' '}
          <a href={href('/learn/how-to')} className="font-medium text-foreground underline-offset-4 hover:underline">
            how-tos
          </a>
          .
        </span>
      </p>
    </div>
  )
}

/* ---------- Hero ---------- */

const HERO_EPISODES = [
  { n: 1, title: 'The cache that ate Tuesday', state: 'watched' },
  { n: 2, title: 'Clocks lie', state: 'watched' },
  { n: 3, title: 'The thundering herd', state: 'watched' },
  { n: 4, title: 'Retries all the way down', state: 'progress' },
  { n: 5, title: 'The config push', state: 'next' },
  { n: 6, title: 'Writing it up', state: 'new' },
] as const

function FeaturedHero() {
  const item = ITEM_BY_ID['failure-modes']
  const [listed, setListed] = useState(true)
  return (
    <section aria-labelledby="featured-title" className="relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {/* Art: on top on phones, behind the text from md up. */}
      <Cover
        seed="failure-modes-hero"
        series={TOPIC_BY_ID[item.topic].series}
        motif="bars"
        className="aspect-video rounded-none md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:w-2/3"
      />
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 hidden w-2/3 bg-linear-to-r from-card from-45% via-card/90 to-transparent md:block"
      />

      <div className="relative flex flex-col gap-5 p-6 md:max-w-xl md:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.08em] text-primary uppercase">
          Featured series
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{TOPIC_BY_ID[item.topic].name}</span>
        </div>
        <div className="flex flex-col gap-3">
          <h2 id="featured-title" className="text-3xl font-semibold tracking-tight md:text-4xl">
            {item.title}
          </h2>
          <p className="text-base text-muted-foreground">{item.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <PersonChip id={item.author} />
          <span className="tabular-nums">{item.parts} episodes</span>
          <span className="tabular-nums">{formatMinutes(item.minutes)}</span>
          <span>{item.level}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" asChild>
            <a href={href('/learn/video')}>
              <Play className="fill-current" /> Resume ep. 4
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={href('/learn/video')}>
              <ListVideo /> Episodes
            </a>
          </Button>
          <Button size="lg" variant="ghost" aria-pressed={listed} onClick={() => setListed((l) => !l)}>
            {listed ? <Check /> : <Plus />}
            {listed ? 'In my list' : 'My list'}
          </Button>
        </div>

        <ol aria-label="Episodes" className="grid grid-cols-6 gap-1.5 pt-1">
          {HERO_EPISODES.map((e) => (
            <li key={e.n} title={`Ep. ${e.n}: ${e.title}`} className="flex flex-col gap-1.5">
              <span
                className={cn(
                  'h-1 rounded-full',
                  e.state === 'watched' && 'bg-primary',
                  e.state === 'progress' && 'bg-linear-to-r from-primary from-44% to-muted to-44%',
                  (e.state === 'next' || e.state === 'new') && 'bg-muted',
                )}
              />
              <span
                className={cn('text-xs tabular-nums', e.state === 'progress' ? 'font-semibold text-foreground' : 'text-muted-foreground')}
              >
                {e.state === 'progress' ? `Ep. ${e.n}` : e.n}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------- Shelf ---------- */

function Shelf({
  title,
  description,
  controls,
  children,
}: {
  title: string
  description?: string
  controls?: ReactNode
  children: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  function update() {
    const el = scroller.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  })

  function page(dir: 1 | -1) {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const id = title.toLowerCase().replace(/[^a-z]+/g, '-')
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex min-w-0 max-w-full items-center gap-2">
          {controls}
          <div className="hidden items-center gap-1 md:flex">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              aria-label={`Scroll ${title} back`}
              disabled={edges.start}
              onClick={() => page(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              aria-label={`Scroll ${title} forward`}
              disabled={edges.end}
              onClick={() => page(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
      <div
        ref={scroller}
        onScroll={update}
        className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  )
}

/* ---------- Cards ---------- */

function ClipCard({ clip, size = 'md' }: { clip: Clip; size?: 'sm' | 'md' }) {
  const topic = TOPIC_BY_ID[clip.topic]
  return (
    <a
      href={href(clip.path ?? '/learn/video')}
      className={cn(
        'group flex shrink-0 snap-start flex-col gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'sm' ? 'w-52' : 'w-64 lg:w-72',
      )}
    >
      <Cover
        seed={clip.id}
        series={topic.series}
        motif={clip.motif ?? 'bars'}
        className="aspect-video ring-1 ring-foreground/5 transition-shadow group-hover:shadow-elevation-2"
      >
        <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevation-2">
            <Play className="size-5 translate-x-px fill-current" />
          </span>
        </span>
        <span className="absolute right-2 bottom-2 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[11px] text-foreground tabular-nums">
          {clip.progress !== undefined ? clip.note : formatMinutes(clip.minutes)}
        </span>
        {clip.progress !== undefined && (
          <Progress
            value={clip.progress}
            className="absolute inset-x-0 bottom-0 h-1 rounded-none bg-background/60"
            aria-label={`${clip.title}: ${clip.progress}% watched`}
          />
        )}
      </Cover>
      <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
        <span className="truncate text-xs text-muted-foreground">{clip.kicker}</span>
        <span className="line-clamp-2 text-sm leading-snug font-medium group-hover:underline group-hover:underline-offset-4">
          {clip.title}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {PERSON_BY_ID[clip.author].name} · {topic.name}
        </span>
      </div>
    </a>
  )
}

function SeriesCard({ series }: { series: Series }) {
  const topic = TOPIC_BY_ID[series.topic]
  const done = series.watched === series.episodes
  return (
    <a
      href={href(series.path ?? '/learn/video')}
      className="group flex w-60 shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 outline-none transition-shadow hover:shadow-elevation-2 focus-visible:ring-2 focus-visible:ring-ring lg:w-64"
    >
      <Cover seed={series.id} series={topic.series} motif={series.motif} className="aspect-[4/3] rounded-none">
        <span className="absolute top-2 left-2 flex gap-1">
          {done && (
            <Badge variant="success">
              <Check /> Watched
            </Badge>
          )}
          {!done && series.watched !== undefined && (
            <Badge variant="primary">
              {series.watched} of {series.episodes} watched
            </Badge>
          )}
        </span>
        <span className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-linear-to-t from-card to-transparent p-3 pt-10">
          <span className="text-lg leading-tight font-semibold text-balance">{series.title}</span>
        </span>
      </Cover>
      <div className="flex flex-1 flex-col gap-2 p-3 pt-1">
        <p className="line-clamp-2 text-sm text-muted-foreground">{series.blurb}</p>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{PERSON_BY_ID[series.author].name}</span>
          <span className="shrink-0 tabular-nums">
            {series.episodes} eps · {formatMinutes(series.minutes)}
          </span>
        </div>
      </div>
    </a>
  )
}
