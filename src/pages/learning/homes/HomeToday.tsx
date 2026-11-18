import { useState } from 'react'
import { ArrowRight, CalendarClock, Check, Clock, Coffee, Headphones, Play, RotateCcw, Sparkles, Sunrise, X } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { FormatBadge, ItemCover, PersonChip } from '@/features/learning/components'
import { HUB, ITEM_BY_ID, LEARNER_STATS, TOPIC_BY_ID, formatMinutes, type Item } from '@/features/learning/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/* ---------- Page-specific sample detail ---------- */

/** Exact resume points for the items Priya has in flight. */
const RESUME: Record<string, { where: string; detail: string; left: string; cta: string }> = {
  'failure-modes': {
    where: 'Episode 4, 12:40',
    detail: 'The cache that ate Tuesday: you stopped as Mara opens the first dashboard.',
    left: '18 min left in this episode',
    cta: 'Resume episode 4',
  },
  'flags-lab': {
    where: 'Step 3 of 5',
    detail: 'Roll the flag to 5% of traffic. Your sandbox is still running.',
    left: 'About 15 min left',
    cta: 'Back to the lab',
  },
  'data-path': {
    where: 'Module 2, lesson 3',
    detail: 'Medians, means and the outlier that fooled everyone.',
    left: '4 h 3 m left in the path',
    cta: 'Continue',
  },
}

/** Today's nudge, and the one behind it if she says "not today". */
const NUDGES = [
  {
    id: 'night-shift',
    minutes: 6,
    title: 'The first six minutes of Night Shift, ep. 14',
    why: 'Kwame and June on the moment they chose to roll back. It is the opening topic of your on-call path, and it fits before standup.',
    icon: Headphones,
    cta: 'Listen now',
    path: '/learn/podcast',
  },
  {
    id: 'which-store',
    minutes: 4,
    title: 'Which data store should I use?',
    why: 'Four questions. You asked about Postgres versus DynamoDB in #payments-eng on Monday; this is the answer the platform team gives.',
    icon: Sparkles,
    cta: 'Take the guide',
    path: '/learn/decision-guide',
  },
]

const WEEK = [
  { day: 'Thu', minutes: 22 },
  { day: 'Fri', minutes: 9 },
  { day: 'Sat', minutes: 0 },
  { day: 'Sun', minutes: 0 },
  { day: 'Mon', minutes: 31 },
  { day: 'Tue', minutes: 14 },
  { day: 'Wed', minutes: 0, today: true },
]

const STARTERS = ['first-week', 'git-sheet', 'proposal']

/* ---------- Page ---------- */

type View = 'returning' | 'first'

export function HomeToday() {
  const [view, setView] = useState<View>('returning')

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Wednesday, November 18"
        title={view === 'returning' ? `Good morning, ${HUB.learner.first}` : `Welcome to ${HUB.name}, ${HUB.learner.first}`}
        description={
          view === 'returning'
            ? 'You have 40 minutes clear before Payments standup at 10:30.'
            : 'Nothing in flight yet. Here is the shortest way in, picked for a product engineer on Payments.'
        }
        actions={
          <Segmented
            aria-label="Preview the page as"
            value={view}
            onChange={setView}
            options={[
              { value: 'returning', label: 'Returning' },
              { value: 'first', label: 'First visit' },
            ]}
          />
        }
      />
      {view === 'returning' ? <Returning /> : <FirstVisit />}
    </div>
  )
}

function Returning() {
  const inFlight = ['failure-modes', 'flags-lab', 'data-path'].map((id) => ITEM_BY_ID[id])
  const [lead, ...rest] = inFlight

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="resume-heading" className="flex flex-col gap-3">
          <SectionLabel id="resume-heading" icon={RotateCcw}>
            Pick up where you left off
          </SectionLabel>
          <LeadResume item={lead} />
          {/* On phones the nudge belongs near the top, not after everything else. */}
          <div className="lg:hidden">
            <Nudge />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rest.map((item) => (
              <SmallResume key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section aria-labelledby="due-heading" className="flex flex-col gap-3">
          <SectionLabel id="due-heading" icon={CalendarClock}>
            Due
          </SectionLabel>
          <DueCard />
        </section>
      </div>

      <aside className="flex min-w-0 flex-col gap-6">
        <div className="hidden lg:block">
          <Nudge />
        </div>
        <QuietWeek />
        <FromTeam />
      </aside>
    </div>
  )
}

function SectionLabel({ id, icon: Icon, children }: { id: string; icon: typeof Clock; children: string }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
      <Icon className="size-4" />
      {children}
    </h2>
  )
}

function LeadResume({ item }: { item: Item }) {
  const r = RESUME[item.id]
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <ItemCover item={item} className="aspect-video rounded-none sm:aspect-auto sm:h-full">
          <div className="flex size-full items-end p-3">
            <span className="rounded-md bg-background/85 px-2 py-1 font-mono text-xs tabular-nums">{r.where}</span>
          </div>
        </ItemCover>
        <div className="flex min-w-0 flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <FormatBadge format={item.format} />
            <span className="text-xs text-muted-foreground">
              {TOPIC_BY_ID[item.topic].name} · {item.parts} episodes
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{r.detail}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <EpisodeTicks done={3} current={4} total={item.parts ?? 6} />
            <span className="text-xs text-muted-foreground tabular-nums">3 of 6 watched · {r.left}</span>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-3">
            <Button asChild>
              <a href={href(item.path ?? '/learn/video')}>
                <Play />
                {r.cta}
              </a>
            </Button>
            <PersonChip id={item.author} />
          </div>
        </div>
      </div>
    </Card>
  )
}

function EpisodeTicks({ done, current, total }: { done: number; current: number; total: number }) {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn('h-1.5 flex-1 rounded-full', i < done ? 'bg-primary' : i === current - 1 ? 'bg-primary/40' : 'bg-muted')}
        />
      ))}
    </div>
  )
}

function SmallResume({ item }: { item: Item }) {
  const r = RESUME[item.id]
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <div className="flex items-center gap-2">
          <FormatBadge format={item.format} />
          <span className="min-w-0 truncate font-mono text-xs text-muted-foreground tabular-nums">{r.where}</span>
        </div>
        <CardTitle className="mt-2 leading-snug">{item.title}</CardTitle>
        <CardDescription>{r.detail}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5">
        <div className="flex items-center gap-3">
          <Progress value={item.progress} aria-label={`${item.title} progress`} />
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.progress}%</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-muted-foreground">{r.left}</span>
          <Button asChild variant="outline" size="sm">
            <a href={href(item.path ?? '/learn')}>
              {r.cta}
              <ArrowRight />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DueCard() {
  const oncall = ITEM_BY_ID['oncall-path']
  const phishing = ITEM_BY_ID['phishing']
  const due = LEARNER_STATS.assignedDue.find((a) => a.id === 'oncall-path')?.due
  const parts = [
    'How paging works here',
    'Reading a runbook',
    'Deciding under pressure',
    'Talking during an incident',
    'Writing the review',
    'Tools tour',
    'Shadow shift',
  ]

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {oncall.title}
          <Badge variant="warning">Required · due {due}</Badge>
        </CardTitle>
        <CardDescription>
          Assigned by Kwame Mensah before your first rotation on Dec 07. {oncall.parts} parts, {formatMinutes(oncall.minutes)} in all.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ol className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-4">
          {parts.map((p, i) => (
            <li key={p} className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="truncate">{p}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3 rounded-lg bg-muted px-3 py-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Not started. About <span className="font-medium text-foreground">25 minutes a weekday</span> gets you there by Nov 30 with a day
            to spare; the shadow shift is booked separately.
          </p>
          <Button asChild variant="soft" size="sm" className="w-fit">
            <a href={href('/learn/course')}>
              Start part 1
              <ArrowRight />
            </a>
          </Button>
        </div>
        <div className="flex items-center gap-2 border-t pt-4 text-sm">
          <Check className="size-4 text-success" />
          <span className="min-w-0 flex-1 truncate">{phishing.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">Done Oct 30</span>
        </div>
      </CardContent>
    </Card>
  )
}

function Nudge() {
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<'open' | 'later'>('open')
  const nudge = NUDGES[index]
  const Icon = nudge.icon

  if (state === 'later') {
    return (
      <Card className="gap-3 py-5">
        <CardContent className="flex items-start gap-3 px-5">
          <Coffee className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm">Fair enough. Nothing else today; enjoy the gap.</p>
            <button
              type="button"
              className="w-fit text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setIndex(0)
                setState('open')
              }}
            >
              Undo
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gap-4 bg-primary-soft/40 py-5 ring-primary/20">
      <CardHeader className="px-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary-soft-foreground">
          <Sunrise className="size-4" />
          One thing for today
        </div>
        <CardTitle className="mt-2 leading-snug">{nudge.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        <p className="text-sm text-muted-foreground">{nudge.why}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="tabular-nums">{nudge.minutes} min</span>
          <span aria-hidden>·</span>
          <span>Ends by 10:15</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={href(nudge.path)}>
              <Play />
              {nudge.cta}
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => (index < NUDGES.length - 1 ? setIndex(index + 1) : setState('later'))}
          >
            <X />
            Not today
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function QuietWeek() {
  const max = Math.max(...WEEK.map((d) => d.minutes))
  const total = WEEK.reduce((s, d) => s + d.minutes, 0)
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">This week</CardTitle>
        <CardDescription className="text-xs">
          {formatMinutes(total)} over four days. {LEARNER_STATS.streakDays} of the last 14 days had some learning in them.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <ul className="grid grid-cols-7 items-end gap-2" aria-label="Minutes learned per day this week">
          {WEEK.map((d) => (
            <li key={d.day} className="flex flex-col items-center gap-1.5" title={`${d.day}: ${d.minutes} min`}>
              <span className="flex h-12 w-full items-end justify-center">
                <span
                  className={cn('w-2 rounded-full', d.minutes ? 'bg-primary/70' : 'bg-muted', d.today && 'bg-primary/25')}
                  style={{ height: d.minutes ? `${Math.max(18, (d.minutes / max) * 100)}%` : '4px' }}
                />
              </span>
              <span className={cn('text-[11px] text-muted-foreground', d.today && 'font-semibold text-foreground')}>{d.day}</span>
              <span className="sr-only">{d.minutes} minutes</span>
            </li>
          ))}
        </ul>
        <a href={href('/learn/progress')} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Your full record
          <ArrowRight className="size-3" />
        </a>
      </CardContent>
    </Card>
  )
}

function FromTeam() {
  const [saved, setSaved] = useState(false)
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">From your team</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5">
        <PersonChip id="kwame" />
        <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground">
          “Worth doing before the refunds launch. June runs it Thursday.”
        </blockquote>
        <a href={href('/learn/live')} className="flex min-w-0 flex-col gap-0.5 rounded-lg border p-3 hover:bg-accent">
          <span className="truncate text-sm font-medium">{ITEM_BY_ID['threat-model'].title}</span>
          <span className="text-xs text-muted-foreground">Thu, Nov 19 · 14:00 · 6 seats left</span>
        </a>
        <Button variant={saved ? 'secondary' : 'ghost'} size="sm" className="w-fit" onClick={() => setSaved(!saved)}>
          {saved ? <Check /> : <CalendarClock />}
          {saved ? 'Seat claimed' : 'Claim a seat'}
        </Button>
      </CardContent>
    </Card>
  )
}

function FirstVisit() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-3">
        <SectionLabel id="start-heading" icon={Sunrise}>
          Start here
        </SectionLabel>
        {STARTERS.map((id, i) => {
          const item = ITEM_BY_ID[id]
          return (
            <Card key={id} className="gap-0 overflow-hidden py-0">
              <div className="flex min-w-0 items-stretch">
                <ItemCover item={item} className="w-24 shrink-0 rounded-none sm:w-36" />
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                    <FormatBadge format={item.format} />
                    <span className="text-xs text-muted-foreground">{formatMinutes(item.minutes)}</span>
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      <aside className="flex min-w-0 flex-col gap-6">
        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">How this page works</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 px-5 text-sm text-muted-foreground">
            <p>Once you start something, it waits here with the exact spot you left it.</p>
            <p>Anything your manager assigns shows up under Due, with a date and a plan.</p>
            <p>No points, no leaderboard. Your record is yours.</p>
          </CardContent>
        </Card>
        <Button asChild variant="outline">
          <a href={href('/learn/home/portal')}>Browse everything</a>
        </Button>
      </aside>
    </div>
  )
}
