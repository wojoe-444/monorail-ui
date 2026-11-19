import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  Captions,
  Download,
  FileText,
  ListMusic,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Share2,
} from 'lucide-react'

import { EntityHeader } from '@/components/layout/EntityHeader'
import { PageTabs } from '@/components/layout/PageTabs'
import { TopBarPortal } from '@/components/layout/TopBarSlot'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Cover, FormatBadge, ItemCover, PersonChip } from '@/features/learning/components'
import { ITEM_BY_ID, PERSON_BY_ID } from '@/features/learning/data'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Page 8 · Podcast. An episode page for people who won't press play as well
 * as those who will: the notes up top carry the episode for skimmers
 * (takeaways with timestamps, links mentioned), the transcript is clickable
 * and follows the player, and the scrubber is cut into chapters.
 */

const ITEM = ITEM_BY_ID['night-shift']
const DURATION = 38 * 60 + 12

interface Chapter {
  at: number
  title: string
}

const CHAPTERS: Chapter[] = [
  { at: 0, title: 'Cold open: the page' },
  { at: 108, title: 'Roll back before you understand' },
  { at: 450, title: '“I don’t know” is a status update' },
  { at: 845, title: 'The rollback that didn’t roll back' },
  { at: 1300, title: 'Who decides, and how fast' },
  { at: 1695, title: 'Writing it up the next morning' },
  { at: 2060, title: 'What we changed' },
]

type Speaker = 'kwame' | 'june'

const TRANSCRIPT: { at: number; who: Speaker; text: string }[] = [
  {
    at: 0,
    who: 'june',
    text: 'The page came in at 2:51. I remember because I’d set an alarm for 3 to check a deploy, and the page beat it.',
  },
  { at: 14, who: 'kwame', text: 'And the deploy was the problem.' },
  {
    at: 17,
    who: 'june',
    text: 'The deploy was the problem. Card authorisations in Europe dropping, maybe one in twelve failing. Not a cliff. A slope.',
  },
  { at: 31, who: 'kwame', text: 'Welcome to Night Shift. I’m Kwame Mensah, I run the Payments engineering team.' },
  {
    at: 37,
    who: 'june',
    text: 'I’m June Park, I work in security, and on that night I was the incident commander, which I had done exactly once before.',
  },
  {
    at: 108,
    who: 'kwame',
    text: 'So the thing I want to start with is the decision itself. You rolled back about nine minutes in. Before anyone knew why.',
  },
  {
    at: 121,
    who: 'june',
    text: 'Right. And I want to be honest that it felt wrong. Every instinct says find the cause first, because what if the rollback makes it worse?',
  },
  { at: 138, who: 'kwame', text: 'What changed your mind?' },
  {
    at: 141,
    who: 'june',
    text: 'Mara had told me something on my shadow shift: a rollback is a question you ask the system. If it gets better, you’ve learned the deploy was involved. If it doesn’t, you’ve learned that too, and you’ve lost five minutes.',
  },
  { at: 172, who: 'kwame', text: 'And the cost of not asking is every minute the slope keeps sloping.' },
  {
    at: 450,
    who: 'kwame',
    text: 'There’s a moment in the channel log where someone asks for an update and you write, “I don’t know yet. Next update at 3:10.”',
  },
  { at: 464, who: 'june', text: 'I almost deleted that. It felt like admitting I was out of my depth.' },
  {
    at: 470,
    who: 'kwame',
    text: 'From where I sat, it was the most calming message of the night. It told me three things: you were honest, you were in charge, and I could stop refreshing until ten past.',
  },
  {
    at: 492,
    who: 'june',
    text: 'That’s the bit I’d tell anyone new. A time for the next update is worth more than a guess about the cause.',
  },
  { at: 845, who: 'june', text: 'Then the rollback finished and the graph didn’t move. That was the worst five minutes of the night.' },
  { at: 858, who: 'kwame', text: 'Because the deploy had a migration in it.' },
  {
    at: 861,
    who: 'june',
    text: 'A migration that had already run. Rolling back the code put the old code on the new schema, and the old code was very confused.',
  },
  { at: 879, who: 'kwame', text: 'Which is why we flag schema changes separately now, but we’ll get to that.' },
  {
    at: 1300,
    who: 'kwame',
    text: 'People ask who’s allowed to roll back. The answer is: whoever is commanding the incident, without asking anyone. Including me.',
  },
  { at: 1314, who: 'june', text: 'Which I didn’t fully believe until I did it and nobody told me off.' },
  { at: 1695, who: 'june', text: 'I wrote the review at nine the next morning, before I’d had time to make myself look good in it.' },
  { at: 1708, who: 'kwame', text: 'That’s the trick, isn’t it. The first draft is the honest one.' },
  {
    at: 2060,
    who: 'kwame',
    text: 'So, three changes came out of it. Migrations ship behind their own flag, rollbacks are in the on-call path from week one, and the update template has a “next update at” line you can’t leave blank.',
  },
]

const TAKEAWAYS: { title: string; body: string; at: number }[] = [
  {
    title: 'Roll back to learn, not just to fix.',
    body: 'If the graph recovers, the deploy was involved. If it doesn’t, you’ve still learned something, for the price of five minutes.',
    at: 141,
  },
  {
    title: '“I don’t know. Next update at 3:10.”',
    body: 'An honest status with a time for the next one calms a channel more than a confident guess about the cause.',
    at: 450,
  },
  {
    title: 'Migrations don’t roll back with code.',
    body: 'A schema change that already ran outlives the rollback. Ship it behind its own flag so the two can be undone separately.',
    at: 845,
  },
]

const LINKS: { label: string; note: string; to?: string; itemId?: string; at: number }[] = [
  { label: 'Ready for on-call', note: 'The path June took, now with a rollback drill in week one.', itemId: 'oncall-path', at: 141 },
  { label: 'Ship behind a feature flag', note: 'The lab for the “migrations get their own flag” rule.', itemId: 'flags-lab', at: 879 },
  { label: 'Failure Modes, ep. 3', note: 'Another night, another slope. Video, 16 min.', itemId: 'failure-modes', at: 1300 },
  {
    label: 'Write a proposal that gets a decision',
    note: 'Sol’s guide; the review template borrows its structure.',
    itemId: 'proposal',
    at: 1695,
  },
  { label: 'Incident review template', note: 'Kestrel wiki · the version with the “next update at” line.', to: '/wiki/article', at: 2060 },
]

const EPISODES: { n: number; title: string; meta: string; seed: string; upcoming?: boolean }[] = [
  { n: 15, title: 'The customer who found it first', meta: 'Iris Novak joins · Nov 28', seed: 'ns15', upcoming: true },
  { n: 13, title: 'Paging the right person', meta: '41 min · Oct 31', seed: 'ns13' },
  { n: 12, title: 'Postmortems without villains', meta: '36 min · Oct 17', seed: 'ns12' },
  { n: 11, title: 'The on-call handoff nobody writes', meta: '29 min · Oct 03', seed: 'ns11' },
]

const TABS: PageTab[] = [
  { id: 'notes', label: 'Show notes', icon: FileText },
  { id: 'transcript', label: 'Transcript', icon: Captions, count: TRANSCRIPT.length },
]

const SPEEDS = ['1', '1.25', '1.5', '2'] as const
type Speed = (typeof SPEEDS)[number]

function clock(s: number) {
  const t = Math.max(0, Math.floor(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

function chapterAt(t: number) {
  let i = 0
  CHAPTERS.forEach((c, j) => {
    if (t >= c.at) i = j
  })
  return i
}

/** Little timestamp button that seeks the player. */
function Stamp({ at, onSeek, className }: { at: number; onSeek: (t: number) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onSeek(at)}
      aria-label={`Play from ${clock(at)}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md bg-primary-soft px-1.5 py-0.5 font-mono text-xs font-medium text-primary-soft-foreground tabular-nums outline-none hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Play className="size-3 fill-current" />
      {clock(at)}
    </button>
  )
}

export function PodcastPage() {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>('1')
  const [tab] = usePageTab(TABS)
  const playerRef = useRef<HTMLDivElement>(null)
  const [playerGone, setPlayerGone] = useState(false)

  // A pretend clock: no audio, just time moving at the chosen speed.
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setTime((t) => {
        const next = t + 0.25 * Number(speed)
        if (next >= DURATION) {
          setPlaying(false)
          return DURATION
        }
        return next
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [playing, speed])

  // When the player scrolls away, a mini player takes the top bar.
  useEffect(() => {
    const el = playerRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setPlayerGone(!e.isIntersecting && e.boundingClientRect.top < 40), {
      rootMargin: '-40px 0px 0px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const seek = (t: number) => {
    setTime(Math.min(DURATION, Math.max(0, t)))
    setPlaying(true)
  }
  const current = chapterAt(time)

  return (
    <div className="flex flex-col gap-6">
      {playerGone && (
        <TopBarPortal>
          <div className="flex min-w-0 flex-1 animate-in items-center gap-3 duration-200 fade-in slide-in-from-bottom-1">
            <Button
              size="icon"
              className="size-8 shrink-0 rounded-full"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            </Button>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">The 3 a.m. rollback</span>
              <span className="truncate text-xs text-muted-foreground">{CHAPTERS[current].title}</span>
            </div>
            <span className="ml-auto hidden font-mono text-xs text-muted-foreground tabular-nums sm:inline">
              {clock(time)} / {clock(DURATION)}
            </span>
          </div>
        </TopBarPortal>
      )}

      <EntityHeader
        back={{ label: 'Content pages', path: '/learn/pages' }}
        title="The 3 a.m. rollback"
        media={<ItemCover item={ITEM} className="size-12 shrink-0 rounded-xl" />}
        badges={
          <>
            <FormatBadge format="podcast" />
            <Badge variant="secondary">Night Shift · ep. 14</Badge>
          </>
        }
        meta={[
          { label: 'With Kwame Mensah & June Park' },
          { label: 'Nov 14, 2026' },
          { label: '38 min' },
          { label: `${ITEM.learners.toLocaleString('en-US')} listened` },
        ]}
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Download episode">
                  <Download />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download for offline</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Share episode at current time">
                  <Share2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share from {clock(time)}</TooltipContent>
            </Tooltip>
            <Button variant="outline">
              <Plus />
              Follow show
            </Button>
          </>
        }
      />

      {/* Player */}
      <Card ref={playerRef} className="py-0">
        <CardContent className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:p-6">
          <Cover seed="night-shift-14" series={5} motif="waves" className="hidden aspect-square sm:block">
            <div className="flex size-full flex-col justify-between p-3">
              <span className="text-xs font-semibold tracking-[0.12em] uppercase">Night Shift</span>
              <span className="font-mono text-4xl font-semibold tabular-nums">14</span>
            </div>
          </Cover>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                className="size-14 shrink-0 rounded-full [&_svg:not([class*='size-'])]:size-6"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="fill-current" /> : <Play className="ml-0.5 fill-current" />}
              </Button>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Chapter {current + 1} of {CHAPTERS.length}
                </div>
                <div className="truncate text-lg font-semibold tracking-tight">{CHAPTERS[current].title}</div>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => seek(time - 15)} aria-label="Back 15 seconds">
                      <RotateCcw />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back 15 s</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => seek(time + 30)} aria-label="Forward 30 seconds">
                      <RotateCw />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Forward 30 s</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <Scrubber time={time} onSeek={(t) => setTime(t)} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 sm:hidden">
                <Button variant="ghost" size="icon" onClick={() => seek(time - 15)} aria-label="Back 15 seconds">
                  <RotateCcw />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => seek(time + 30)} aria-label="Forward 30 seconds">
                  <RotateCw />
                </Button>
              </div>
              <Segmented
                aria-label="Playback speed"
                value={speed}
                onChange={setSpeed}
                options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))}
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {clock((DURATION - time) / Number(speed))} left at {speed}×
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <PageTabs tabs={TABS} aria-label="Episode sections" sticky={false} />
          {tab === 'notes' ? <Notes onSeek={seek} /> : <Transcript time={time} onSeek={seek} />}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Card className="gap-3 pb-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListMusic className="size-4 text-muted-foreground" />
                Chapters
              </CardTitle>
            </CardHeader>
            <ol className="flex flex-col px-3">
              {CHAPTERS.map((c, i) => {
                const end = CHAPTERS[i + 1]?.at ?? DURATION
                const done = i < current
                const now = i === current
                return (
                  <li key={c.at}>
                    <button
                      type="button"
                      onClick={() => seek(c.at)}
                      aria-current={now ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        now ? 'bg-primary-soft text-primary-soft-foreground' : 'hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <span className={cn('w-10 shrink-0 font-mono text-xs leading-5 tabular-nums', !now && 'text-muted-foreground')}>
                        {clock(c.at)}
                      </span>
                      <span className={cn('min-w-0 flex-1', now && 'font-medium', done && 'text-muted-foreground')}>{c.title}</span>
                      <span className="shrink-0 text-xs leading-5 text-muted-foreground tabular-nums">
                        {Math.round((end - c.at) / 60)}m
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>On this episode</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <PersonChip id="kwame" showRole size="md" />
              <PersonChip id="june" showRole size="md" />
            </CardContent>
          </Card>

          <Card className="gap-3 pb-3">
            <CardHeader>
              <CardTitle>More Night Shift</CardTitle>
            </CardHeader>
            <ul className="flex flex-col px-3">
              {EPISODES.map((e) => (
                <li key={e.n}>
                  <a
                    href={href('/learn/podcast')}
                    className="flex items-center gap-3 rounded-md p-2 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Cover seed={e.seed} series={5} motif="waves" className="flex size-10 shrink-0 items-center justify-center">
                      <span className="flex size-full items-center justify-center font-mono text-xs font-semibold">{e.n}</span>
                    </Cover>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{e.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{e.meta}</span>
                    </span>
                    {e.upcoming && <Badge variant="info">Soon</Badge>}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}

/** The timeline, cut into chapter segments. A native range input on top does the work, so keys and screen readers just work. */
function Scrubber({ time, onSeek }: { time: number; onSeek: (t: number) => void }) {
  const pct = (time / DURATION) * 100
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex h-5 items-center rounded-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <div className="flex w-full gap-0.5" aria-hidden>
          {CHAPTERS.map((c, i) => {
            const end = CHAPTERS[i + 1]?.at ?? DURATION
            const fill = Math.min(1, Math.max(0, (time - c.at) / (end - c.at)))
            return (
              <div
                key={c.at}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                style={{ flexGrow: end - c.at, flexBasis: 0 }}
                title={c.title}
              >
                <div className="h-full bg-primary" style={{ width: `${fill * 100}%` }} />
              </div>
            )
          })}
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-elevation-1"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={DURATION}
          step={1}
          value={Math.round(time)}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Seek"
          aria-valuetext={`${clock(time)} of ${clock(DURATION)}, ${CHAPTERS[chapterAt(time)].title}`}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
        <span>{clock(time)}</span>
        <span>−{clock(DURATION - time)}</span>
      </div>
    </div>
  )
}

function Notes({ onSeek }: { onSeek: (t: number) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex max-w-prose flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">The episode in a minute</h2>
        <p className="text-base leading-7 text-pretty">
          At 2:51 one November morning, card payments in Europe started failing, one in twelve and climbing. June was the incident commander
          for the second time in her life. She rolled back nine minutes in, before anyone knew why, and then the graph didn’t move. Kwame
          and June walk through the decisions minute by minute: why you roll back to learn, why “I don’t know” belongs in a status update,
          and why the review got written before breakfast.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Three things to take away</h2>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TAKEAWAYS.map((t, i) => (
            <li key={t.at} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <span className="font-mono text-xs font-semibold text-primary">0{i + 1}</span>
              <span className="text-base leading-snug font-semibold tracking-tight text-balance">{t.title}</span>
              <span className="flex-1 text-sm text-muted-foreground">{t.body}</span>
              <Stamp at={t.at} onSeek={onSeek} className="self-start" />
            </li>
          ))}
        </ol>
      </section>

      <figure className="flex max-w-prose flex-col gap-3 border-l-4 border-primary pl-5">
        <blockquote className="text-xl leading-snug font-semibold tracking-tight text-balance">
          “A time for the next update is worth more than a guess about the cause.”
        </blockquote>
        <figcaption className="flex items-center gap-3 text-sm text-muted-foreground">
          June Park <Stamp at={492} onSeek={onSeek} />
        </figcaption>
      </figure>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Mentioned in this episode</h2>
        <ul className="divide-y rounded-xl border bg-card">
          {LINKS.map((l) => {
            const item = l.itemId ? ITEM_BY_ID[l.itemId] : undefined
            return (
              <li key={l.label} className="flex items-center gap-3 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {item ? <BookOpen className="size-4" /> : <FileText className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={href(item?.path ?? l.to ?? '/learn/pages')}
                    className="inline-flex items-center gap-1 rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {l.label}
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                  </a>
                  <p className="truncate text-xs text-muted-foreground">{l.note}</p>
                </div>
                {item && <FormatBadge format={item.format} className="hidden sm:inline-flex" />}
                <Stamp at={l.at} onSeek={onSeek} />
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Transcript({ time, onSeek }: { time: number; onSeek: (t: number) => void }) {
  const [query, setQuery] = useState('')
  const [follow, setFollow] = useState(true)
  const lineRefs = useRef<Record<number, HTMLLIElement | null>>({})

  const currentAt = useMemo(() => {
    let at = 0
    TRANSCRIPT.forEach((l) => {
      if (time >= l.at) at = l.at
    })
    return at
  }, [time])

  // Scroll only when the current line changes, not on every tick of the clock.
  const started = time > 0
  useEffect(() => {
    if (follow && started) lineRefs.current[currentAt]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentAt, follow, started])

  const q = query.trim().toLowerCase()
  const lines = q ? TRANSCRIPT.filter((l) => l.text.toLowerCase().includes(q)) : TRANSCRIPT

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <Label htmlFor="transcript-search" className="sr-only">
            Search the transcript
          </Label>
          <Input
            id="transcript-search"
            placeholder="Search the transcript…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="follow" checked={follow} onCheckedChange={setFollow} />
          <Label htmlFor="follow" className="text-sm font-normal">
            Follow along
          </Label>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Excerpt. Click any line to play from there. Transcripts are checked by a person within a day of release.
      </p>
      <ol className="flex flex-col">
        {lines.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">Nothing in the transcript matches “{query}”.</li>
        )}
        {lines.map((l, i) => {
          const now = l.at === currentAt && time > 0
          const chapterStart = CHAPTERS.find((c) => c.at === l.at)
          const sameSpeaker = !chapterStart && i > 0 && lines[i - 1].who === l.who
          return (
            <li key={l.at} ref={(el) => void (lineRefs.current[l.at] = el)}>
              {chapterStart && !q && (
                <div className="mt-4 mb-1 flex items-center gap-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:mt-0">
                  {chapterStart.title}
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onSeek(l.at)}
                className={cn(
                  'grid w-full grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  now ? 'bg-primary-soft' : 'hover:bg-accent',
                )}
              >
                <span
                  className={cn('font-mono text-xs leading-6 tabular-nums', now ? 'text-primary-soft-foreground' : 'text-muted-foreground')}
                >
                  {clock(l.at)}
                </span>
                <span className="min-w-0">
                  {!sameSpeaker && <span className="block text-xs font-semibold">{PERSON_BY_ID[l.who].name}</span>}
                  <span className={cn('text-sm leading-6', now && 'text-primary-soft-foreground')}>{l.text}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
