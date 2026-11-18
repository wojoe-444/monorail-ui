import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  Captions,
  Check,
  FileText,
  FlaskConical,
  FolderGit2,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  ScrollText,
  SkipForward,
  Siren,
  type LucideIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { SearchField } from '@/components/ui/search-field'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Cover, PersonChip } from '@/features/learning/components'
import { PERSON_BY_ID } from '@/features/learning/data'
import { clock, EPISODES, SERIES, type Episode, type Resource, type TranscriptLine } from '@/features/learning/video-data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

const SPEEDS = [1, 1.25, 1.5, 2]

const RESOURCE_ICONS: Record<Resource['kind'], LucideIcon> = {
  Postmortem: Siren,
  Repository: FolderGit2,
  Lab: FlaskConical,
  Podcast: Headphones,
  Article: FileText,
  RFC: ScrollText,
}

/** Transcript lines for an episode: the full one for ep. 4, a line per chapter otherwise. */
function linesFor(ep: Episode): TranscriptLine[] {
  return ep.transcript ?? ep.chapters.map((c) => ({ at: c.at, speaker: 'mara' as const, text: c.line ?? '' }))
}

function lastIndexAtOrBefore<T extends { at: number }>(list: T[], t: number): number {
  let idx = 0
  list.forEach((x, i) => {
    if (x.at <= t) idx = i
  })
  return idx
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'))
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-highlight-soft px-0.5 text-highlight-soft-foreground">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  )
}

export function VideoSeriesPage() {
  const [epN, setEpN] = useState(4)
  const ep = EPISODES.find((e) => e.n === epN) ?? EPISODES[3]
  const [time, setTime] = useState(ep.position ?? 0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [captions, setCaptions] = useState(true)
  const [saved, setSaved] = useState(true)
  const [query, setQuery] = useState('')
  const [follow, setFollow] = useState(true)

  // Advance the clock while "playing".
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setTime((t) => {
        const next = t + 0.25 * speed
        if (next >= ep.duration) {
          setPlaying(false)
          return ep.duration
        }
        return next
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [playing, speed, ep.duration])

  const lines = useMemo(() => linesFor(ep), [ep])
  const lineIdx = lastIndexAtOrBefore(lines, time)
  const chapterIdx = lastIndexAtOrBefore(ep.chapters, time)
  const chapter = ep.chapters[chapterIdx]
  const line = lines[lineIdx]
  const ended = time >= ep.duration
  const next = EPISODES.find((e) => e.n === ep.n + 1)

  function selectEpisode(n: number, at?: number) {
    const target = EPISODES.find((e) => e.n === n)
    if (!target) return
    setEpN(n)
    setTime(at ?? (target.state === 'progress' ? (target.position ?? 0) : 0))
    setPlaying(at !== undefined || n !== epN)
    setQuery('')
  }

  function seek(t: number) {
    setTime(Math.min(Math.max(0, t), ep.duration))
  }

  const watched = EPISODES.filter((e) => e.state === 'watched').length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Video series · Engineering"
        title={SERIES.title}
        description={SERIES.summary}
        actions={
          <Button variant="outline" aria-pressed={saved} onClick={() => setSaved((s) => !s)}>
            {saved ? <BookmarkCheck /> : <Bookmark />}
            {saved ? 'Saved' : 'Save series'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Player */}
          <Card className="gap-0 overflow-hidden py-0">
            <Cover seed={`failure-modes-${ep.n}`} series={2} motif={ep.n % 2 ? 'bars' : 'waves'} className="aspect-video rounded-none">
              <button
                type="button"
                aria-label={playing ? 'Pause' : 'Play'}
                onClick={() => (ended ? (seek(0), setPlaying(true)) : setPlaying((p) => !p))}
                className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-inset"
              />
              <div className="pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md bg-background/85 px-2.5 py-1 text-xs text-foreground shadow-elevation-1">
                <span className="font-semibold whitespace-nowrap">Ep. {ep.n}</span>
                <span className="truncate text-muted-foreground">
                  Ch. {chapterIdx + 1} · {chapter.title}
                </span>
              </div>
              {!playing && !ended && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevation-2 sm:size-20">
                    <Play className="size-7 translate-x-0.5 fill-current sm:size-8" />
                  </span>
                </div>
              )}
              {ended && next && (
                <div className="absolute inset-0 grid place-items-center bg-background/70 p-4">
                  <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                    <span className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">Up next</span>
                    <span className="text-lg font-semibold text-balance">
                      Ep. {next.n}: {next.title}
                    </span>
                    <Button onClick={() => selectEpisode(next.n)}>
                      <Play /> Play episode {next.n}
                    </Button>
                  </div>
                </div>
              )}
              {captions && !ended && line.text && (
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4 sm:bottom-5',
                    !playing && 'max-sm:hidden',
                  )}
                >
                  <p className="max-w-2xl rounded-md bg-background/90 px-3 py-1.5 text-center text-xs leading-snug text-foreground shadow-elevation-1 sm:text-base">
                    <span className="font-semibold">{PERSON_BY_ID[line.speaker].name.split(' ')[0]}:</span> {line.text}
                  </p>
                </div>
              )}
            </Cover>

            <div className="flex flex-col gap-2 border-t px-3 pt-3 pb-2 sm:px-4">
              <Scrubber ep={ep} time={time} onSeek={seek} />
              <div className="flex items-center gap-1">
                <IconButton label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>
                  {playing ? <Pause /> : <Play />}
                </IconButton>
                <IconButton label="Back 10 seconds" onClick={() => seek(time - 10)}>
                  <RotateCcw />
                </IconButton>
                <IconButton label="Forward 10 seconds" onClick={() => seek(time + 10)} className="max-sm:hidden">
                  <RotateCw />
                </IconButton>
                <span className="ml-1 font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                  {clock(time)} / {clock(ep.duration)}
                </span>
                <span className="flex-1" />
                <IconButton label={captions ? 'Hide captions' : 'Show captions'} pressed={captions} onClick={() => setCaptions((c) => !c)}>
                  <Captions />
                </IconButton>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-12 font-mono tabular-nums"
                      aria-label={`Playback speed ${speed}×`}
                      onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
                    >
                      {speed}×
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Playback speed</TooltipContent>
                </Tooltip>
                {next && (
                  <IconButton label={`Next episode: ${next.title}`} onClick={() => selectEpisode(next.n)} className="hidden sm:inline-flex">
                    <SkipForward />
                  </IconButton>
                )}
              </div>
            </div>
          </Card>

          {/* Episode */}
          <div className="flex flex-col gap-3">
            <div className="text-xs text-muted-foreground">
              Episode {ep.n} of {EPISODES.length} · {Math.round(ep.duration / 60)} min
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-balance">{ep.title}</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">{ep.summary}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
              <PersonChip id={SERIES.host} showRole />
              {ep.guest && <PersonChip id={ep.guest} showRole />}
            </div>
          </div>

          <TranscriptCard
            ep={ep}
            lines={lines}
            lineIdx={lineIdx}
            chapterIdx={chapterIdx}
            time={time}
            query={query}
            setQuery={setQuery}
            follow={follow}
            setFollow={setFollow}
            onSeek={(t) => {
              seek(t)
              setPlaying(true)
            }}
          />
        </div>

        {/* Aside */}
        <div className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-20">
          <Card className="gap-4 pb-2">
            <CardHeader>
              <CardTitle>Episodes</CardTitle>
              <CardDescription>
                {watched} of {EPISODES.length} watched · 1 h 34 m in all
              </CardDescription>
              <Progress
                value={((watched + (ep.n === 4 ? time / ep.duration : 0.44)) / EPISODES.length) * 100}
                className="mt-2"
                aria-label="Series progress"
              />
            </CardHeader>
            <ol className="flex flex-col px-2">
              {EPISODES.map((e) => (
                <li key={e.n}>
                  <EpisodeRow ep={e} current={e.n === ep.n} time={e.n === ep.n ? time : e.position} onSelect={() => selectEpisode(e.n)} />
                </li>
              ))}
            </ol>
          </Card>

          <Card className="gap-4 pb-3">
            <CardHeader>
              <CardTitle>Mentioned in this episode</CardTitle>
              <CardDescription>Jump to the moment, or open the thing itself.</CardDescription>
            </CardHeader>
            <ul className="flex flex-col px-3">
              {ep.resources.map((r) => {
                const Icon = RESOURCE_ICONS[r.kind]
                return (
                  <li key={r.title} className="flex items-center gap-3 rounded-lg px-3 py-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      {r.path ? (
                        <a href={href(r.path)} className="truncate text-sm font-medium hover:underline">
                          {r.title}
                        </a>
                      ) : (
                        <span className="truncate text-sm font-medium">{r.title}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{r.kind}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs tabular-nums"
                      aria-label={`Jump to ${clock(r.at)}`}
                      onClick={() => (seek(r.at), setPlaying(true))}
                    >
                      {clock(r.at)}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  pressed,
  className,
  children,
}: {
  label: string
  onClick: () => void
  pressed?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={pressed ? 'soft' : 'ghost'}
          size="icon"
          className={cn('size-8', className)}
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Seek bar with a gap in the track at every chapter start, and the chapter under it. */
function Scrubber({ ep, time, onSeek }: { ep: Episode; time: number; onSeek: (t: number) => void }) {
  return (
    <div className="relative py-1">
      <Slider value={[time]} max={ep.duration} step={1} onValueChange={([v]) => onSeek(v)} thumbLabels={['Seek']} />
      {ep.chapters.slice(1).map((c) => (
        <span
          key={c.at}
          aria-hidden
          className="pointer-events-none absolute top-1/2 h-2 w-0.5 -translate-y-1/2 bg-card"
          style={{ left: `${(c.at / ep.duration) * 100}%` }}
        />
      ))}
    </div>
  )
}

function EpisodeRow({ ep, current, time, onSelect }: { ep: Episode; current: boolean; time?: number; onSelect: () => void }) {
  const left = time !== undefined ? Math.ceil((ep.duration - time) / 60) : 0
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={current ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        current ? 'bg-primary-soft/60' : 'hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Cover
        seed={`failure-modes-${ep.n}`}
        series={2}
        motif={ep.n % 2 ? 'bars' : 'waves'}
        className="aspect-video w-24 shrink-0 rounded-md"
      >
        <span className="absolute right-1 bottom-1 rounded bg-background/85 px-1 font-mono text-[10px] text-foreground tabular-nums">
          {clock(ep.duration)}
        </span>
        {current && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
              <Play className="size-3.5 translate-x-px fill-current" />
            </span>
          </span>
        )}
        {(ep.state === 'progress' || current) && time !== undefined && (
          <Progress
            value={(time / ep.duration) * 100}
            className="absolute inset-x-0 bottom-0 h-1 rounded-none bg-background/60"
            aria-label={`${ep.title} progress`}
          />
        )}
      </Cover>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground tabular-nums">Episode {ep.n}</span>
        <span className="line-clamp-2 text-sm font-medium">{ep.title}</span>
        <span className="text-xs">
          {ep.state === 'watched' && (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-3" /> Watched
            </span>
          )}
          {ep.state === 'progress' && <span className="text-muted-foreground">{left} min left</span>}
          {ep.state === 'next' && (
            <Badge variant="primary" className="px-1.5 py-0">
              Up next
            </Badge>
          )}
          {ep.state === 'new' && <span className="text-muted-foreground">Not started</span>}
        </span>
      </span>
    </button>
  )
}

function TranscriptCard({
  ep,
  lines,
  lineIdx,
  chapterIdx,
  time,
  query,
  setQuery,
  follow,
  setFollow,
  onSeek,
}: {
  ep: Episode
  lines: TranscriptLine[]
  lineIdx: number
  chapterIdx: number
  time: number
  query: string
  setQuery: (q: string) => void
  follow: boolean
  setFollow: (f: boolean) => void
  onSeek: (t: number) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const q = query.trim()
  const matches = q ? lines.filter((l) => l.text.toLowerCase().includes(q.toLowerCase())) : lines

  // Keep the current line in view (inside the transcript box only, never the page).
  useEffect(() => {
    if (!follow || q || !scroller.current) return
    const el = scroller.current.querySelector<HTMLElement>(`[data-line="${lineIdx}"]`)
    if (el) scroller.current.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' })
  }, [lineIdx, follow, q, ep.n])

  // Chapter headings go before the first line at or after each chapter start.
  const headingBefore = new Map<number, number>()
  ep.chapters.forEach((c, ci) => {
    const li = lines.findIndex((l) => l.at >= c.at)
    if (li >= 0 && !headingBefore.has(li)) headingBefore.set(li, ci)
  })

  return (
    <Card className="gap-4 pb-0">
      <div className="flex flex-col gap-4 px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <CardTitle>Transcript</CardTitle>
          <CardDescription>
            {ep.transcript
              ? 'Click any line to jump there. Search to skim the whole episode.'
              : 'Chapter summaries. The full transcript arrives with the episode.'}
          </CardDescription>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <SearchField
            size="sm"
            placeholder="Search transcript"
            aria-label="Search transcript"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-w-0 lg:w-56"
          />
          <div className="flex items-center gap-2">
            <Switch id="follow-transcript" checked={follow} onCheckedChange={setFollow} />
            <Label htmlFor="follow-transcript" className="text-xs whitespace-nowrap">
              Follow along
            </Label>
          </div>
        </div>
      </div>

      <CardContent className="grid grid-cols-1 gap-0 border-t px-0 md:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Chapters */}
        <nav aria-label="Chapters" className="border-b md:border-r md:border-b-0">
          <div className="px-6 pt-4 pb-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Chapters</div>
          <ol className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:gap-0.5 md:overflow-visible md:px-3">
            {ep.chapters.map((c, i) => {
              const end = ep.chapters[i + 1]?.at ?? ep.duration
              const done = time >= end
              const active = i === chapterIdx
              return (
                <li key={c.at} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onSeek(c.at)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'bg-primary-soft text-primary-soft-foreground' : 'hover:bg-accent hover:text-accent-foreground',
                      'max-md:border max-md:py-1.5',
                    )}
                  >
                    <span className={cn('mt-px font-mono text-xs tabular-nums', !active && 'text-muted-foreground')}>{clock(c.at)}</span>
                    <span className={cn('whitespace-nowrap md:whitespace-normal', done && !active && 'text-muted-foreground')}>
                      {c.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Lines */}
        <div className="flex min-w-0 flex-col">
          {q && (
            <div className="border-b px-6 py-2 text-xs text-muted-foreground" aria-live="polite">
              {matches.length === 0
                ? `No lines mention “${q}”.`
                : `${matches.length} ${matches.length === 1 ? 'line mentions' : 'lines mention'} “${q}”. Click one to jump there.`}
            </div>
          )}
          <div ref={scroller} className="relative h-[26rem] overflow-y-auto px-3 py-3">
            <ol className="flex flex-col">
              {lines.map((l, i) => {
                if (q && !matches.includes(l)) return null
                const ci = headingBefore.get(i)
                const active = i === lineIdx && !q
                return (
                  <li key={l.at} data-line={i}>
                    {ci !== undefined && !q && (
                      <div className={cn('px-3 pb-1 text-xs font-semibold text-muted-foreground', i > 0 && 'pt-4')}>
                        {ci + 1}. {ep.chapters[ci].title}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onSeek(l.at)}
                      className={cn(
                        'grid w-full grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded-md px-3 py-2 text-left text-sm leading-relaxed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-primary-soft text-primary-soft-foreground' : 'hover:bg-accent hover:text-accent-foreground',
                        !active && !q && l.at > time && 'text-foreground',
                        !active && !q && l.at <= time && 'text-muted-foreground',
                      )}
                    >
                      <span className="pt-0.5 font-mono text-xs tabular-nums opacity-80">{clock(l.at)}</span>
                      <span>
                        <span className="mr-1.5 font-semibold">{PERSON_BY_ID[l.speaker].name.split(' ')[0]}</span>
                        <Highlight text={l.text} query={q} />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
