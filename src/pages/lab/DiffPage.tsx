import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, LoaderCircle } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { experiment } from '@/features/lab/catalog'
import {
  diffSnapshots,
  LAST_SEEN_KEY,
  SNAPSHOT_KEY,
  snapshotAgo,
  snapshotNow,
  type Feeds,
  type FileDiff,
  type Line,
  type Snapshot,
} from '@/features/lab/diff/model'
import {
  useCarbonWindow,
  useGenerationDay,
  useGenerationNow,
  useHackerNews,
  useKpForecast,
  useKpNow,
  useLaunchesPrevious,
  useLaunchesUpcoming,
  useQuakesMonth,
  useWeather,
  useWikiDay,
  useWikiLatest,
  useXray,
} from '@/features/lab/feeds'
import { SourceLine } from '@/features/lab/LabKit'
import { CITIES } from '@/features/lab/sources'
import { useNow, type LiveData } from '@/features/lab/useLiveData'
import { prefs } from '@/lib/prefs'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Diff: only what changed, as a unified diff. "Since last visit" compares a
 * snapshot saved in prefs (when you leave the page or press "Mark as seen")
 * with the feeds now. 1h / 6h / 24h rebuild the earlier state from the
 * history the feeds carry, so a first visit has something to show.
 */

const EXP = experiment('diff')
const HOUR = 3600_000
const DAY = 24 * HOUR
type Mode = 'last' | '1h' | '6h' | '24h'
const WINDOW: Record<Exclude<Mode, 'last'>, number> = { '1h': HOUR, '6h': 6 * HOUR, '24h': DAY }

function readSnapshot(): Snapshot | undefined {
  try {
    const raw = prefs.getItem(SNAPSHOT_KEY)
    return raw ? (JSON.parse(raw) as Snapshot) : undefined
  } catch {
    return undefined
  }
}

/** "3h 12m ago" */
function since(t: number, now: number): string {
  const m = Math.max(0, Math.round((now - t) / 60_000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ${m % 60}m ago`
  return `${Math.floor(h / 24)}d ${h % 24}h ago`
}

export function DiffPage() {
  const quakesMonth = useQuakesMonth()
  const kp = useKpForecast()
  const kpNow = useKpNow()
  const xray = useXray()
  const carbon = useCarbonWindow()
  const mix = useGenerationNow()
  const mixDay = useGenerationDay()
  const weather = useWeather(CITIES[0])
  const wiki = useWikiLatest()
  const wikiPrev = useWikiDay(wiki.daysAgo + 1)
  const hn = useHackerNews(30)
  const upcoming = useLaunchesUpcoming()
  const previous = useLaunchesPrevious()
  const feeds: LiveData<unknown>[] = [quakesMonth, kp, kpNow, xray, carbon, mix, mixDay, weather, wiki, wikiPrev, hn, upcoming, previous]

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), 10_000)
    return () => window.clearTimeout(id)
  }, [])
  const settled = feeds.every((f) => f.data !== undefined || f.error) || timedOut
  const now = useNow(60_000)

  const input: Feeds = {
    now,
    quakesMonth: quakesMonth.data,
    kp: kp.data,
    kpNow: kpNow.data,
    xray: xray.data,
    carbon: carbon.data,
    mix: mix.data?.mix,
    mixDay: mixDay.data,
    weather: weather.data,
    wiki: wiki.data,
    wikiPrev: wikiPrev.data ? { date: new Date(Date.now() - (wiki.daysAgo + 1) * DAY), articles: wikiPrev.data } : undefined,
    hn: hn.data,
    upcoming: upcoming.data,
    previous: previous.data,
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />
        <SourceLine source={EXP.source} feeds={feeds} />
      </div>
      {settled ? (
        <Diff input={input} />
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          <div>
            Reading every feed: {feeds.filter((f) => f.data !== undefined || f.error).length} of {feeds.length}…
          </div>
        </div>
      )}
    </div>
  )
}

function Diff({ input }: { input: Feeds }) {
  // The baseline is read once, when the page opens; leaving the page replaces it for next time.
  const [saved, setSaved] = useState<Snapshot | undefined>(readSnapshot)
  const [mode, setMode] = useState<Mode>(saved ? 'last' : '24h')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState(-1)
  const [justSaved, setJustSaved] = useState(false)
  const hunkRefs = useRef<(HTMLDivElement | null)[]>([])

  const current = useMemo(() => snapshotNow(input), [input])
  const { files, base } = useMemo(() => {
    if (mode === 'last' && saved) return { files: diffSnapshots(saved, current), base: saved.t }
    const w = WINDOW[mode === 'last' ? '24h' : mode]
    const { snap, noHistory } = snapshotAgo(input, w)
    return { files: diffSnapshots(snap, current, noHistory), base: snap.t }
  }, [mode, saved, current, input])

  // Save on leaving (unmount or tab close), merged over the old snapshot so a feed that failed today keeps yesterday's copy.
  const latest = useRef(current)
  latest.current = current
  useEffect(() => {
    const opened = Date.now()
    const save = () => {
      // React's dev double-mount unmounts instantly; a real visit lasts longer than this.
      if (Date.now() - opened < 2000) return
      const cur = latest.current
      const filled = Object.keys(cur).length - 1
      if (filled < 3) return
      const merged = { ...(readSnapshot() ?? {}), ...cur }
      prefs.setItem(SNAPSHOT_KEY, JSON.stringify(merged))
      prefs.setItem(LAST_SEEN_KEY, String(cur.t))
    }
    window.addEventListener('pagehide', save)
    return () => {
      window.removeEventListener('pagehide', save)
      save()
    }
  }, [])

  const markSeen = () => {
    const merged = { ...(readSnapshot() ?? {}), ...current }
    prefs.setItem(SNAPSHOT_KEY, JSON.stringify(merged))
    prefs.setItem(LAST_SEEN_KEY, String(current.t))
    setSaved(merged)
    setMode('last')
    setJustSaved(true)
  }
  useEffect(() => {
    if (!justSaved) return
    const id = window.setTimeout(() => setJustSaved(false), 2500)
    return () => window.clearTimeout(id)
  }, [justSaved])

  // Hunk index → its file, for keyboard moves.
  const hunkFiles = files.filter((f) => !collapsed.has(f.file)).flatMap((f) => f.hunks.map(() => f.file))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'n' || e.key === 'p') {
        e.preventDefault()
        const total = hunkFiles.length
        if (!total) return
        const next = e.key === 'n' ? Math.min(total - 1, cursor + 1) : Math.max(0, cursor - 1)
        setCursor(next)
        hunkRefs.current[next]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      } else if (e.key === 'c' && cursor >= 0) {
        const f = hunkFiles[cursor]
        if (f) toggle(f)
      } else if (e.key === 'm') markSeen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggle = (file: string) =>
    setCollapsed((s) => {
      const n = new Set(s)
      if (n.has(file)) n.delete(file)
      else n.add(file)
      return n
    })

  const changed = files.filter((f) => f.added + f.removed > 0)
  const added = files.reduce((s, f) => s + f.added, 0)
  const removed = files.reduce((s, f) => s + f.removed, 0)
  const lastSeen = Number(prefs.getItem(LAST_SEEN_KEY)) || saved?.t
  let hunkIndex = 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Mode>
          aria-label="Compare with"
          value={mode}
          onChange={(m) => {
            setMode(m)
            setCursor(-1)
          }}
          options={[
            { value: 'last', label: 'Since last visit', disabled: !saved, title: saved ? undefined : 'No saved visit yet' },
            { value: '1h', label: '1h' },
            { value: '6h', label: '6h' },
            { value: '24h', label: '24h' },
          ]}
        />
        <Button onClick={markSeen}>
          {justSaved ? <Check /> : null}
          {justSaved ? 'Marked as seen' : 'Mark as seen'}
        </Button>
        <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
          <Kbd>n</Kbd>/<Kbd>p</Kbd> next/prev hunk · <Kbd>c</Kbd> collapse file · <Kbd>m</Kbd> mark as seen
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[15px] leading-relaxed text-pretty">
          {mode === 'last' && saved ? (
            <>
              Compared with your last look, <span className="font-semibold">{since(saved.t, input.now)}</span> (
              {new Date(saved.t).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}).{' '}
            </>
          ) : !saved ? (
            <>
              No saved visit yet, so this compares with <span className="font-semibold">{mode === 'last' ? '24 hours' : mode.replace('h', ' hours').replace('1 hours', '1 hour')}</span> ago, rebuilt from the feeds’ own
              history. Leave the page or press <span className="font-medium">Mark as seen</span> and your next visit will show what changed since now.{' '}
            </>
          ) : (
            <>
              Compared with <span className="font-semibold">{mode.replace('h', ' hours').replace('1 hours', '1 hour')}</span> ago, rebuilt from each feed’s history
              {lastSeen ? <> (your last look was {since(lastSeen, input.now)})</> : null}.{' '}
            </>
          )}
          {changed.length === 0 ? <span className="font-semibold">Nothing has changed.</span> : null}
        </p>
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span>
            <span className="font-semibold">{changed.length}</span> {changed.length === 1 ? 'file' : 'files'} changed, <span className="font-semibold">{added}</span> insertion
            {added === 1 ? '' : 's'}(+), <span className="font-semibold">{removed}</span> deletion{removed === 1 ? '' : 's'}(−)
          </span>
          <ChangeBar added={added} removed={removed} />
        </div>
        <nav aria-label="Files" className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
          {files.map((f) => (
            <a key={f.file} href={`#${anchor(f.file)}`} onClick={(e) => jump(e, f.file)} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              {f.file}{' '}
              {f.added + f.removed > 0 ? (
                <span className="text-foreground">
                  +{f.added} −{f.removed}
                </span>
              ) : (
                <span>·</span>
              )}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        {files.map((f) => {
          const isCollapsed = collapsed.has(f.file)
          const first = hunkIndex
          if (!isCollapsed) hunkIndex += f.hunks.length
          return (
            <FileBlock
              key={f.file}
              f={f}
              base={base}
              now={input.now}
              collapsed={isCollapsed}
              onToggle={() => toggle(f.file)}
              activeHunk={cursor - first}
              hunkRef={(i, el) => {
                hunkRefs.current[first + i] = el
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

const anchor = (file: string) => `diff-${file.replace(/\W/g, '-')}`
function jump(e: React.MouseEvent, file: string) {
  // The app uses the hash for routing, so scroll instead of following the fragment.
  e.preventDefault()
  document.getElementById(anchor(file))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border bg-muted px-1 py-px text-[10px] text-foreground">{children}</kbd>
}

/** GitHub-style five blocks: insertions vs deletions. */
function ChangeBar({ added, removed }: { added: number; removed: number }) {
  const total = added + removed
  const a = total ? Math.round((added / total) * 5) : 0
  const r = total ? 5 - a : 0
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn('size-2.5 rounded-[2px]', i < a ? 'bg-highlight' : i < a + r ? 'bg-muted-foreground/50' : 'bg-muted')} />
      ))}
    </span>
  )
}

function FileBlock({
  f,
  base,
  now,
  collapsed,
  onToggle,
  activeHunk,
  hunkRef,
}: {
  f: FileDiff
  base: number
  now: number
  collapsed: boolean
  onToggle: () => void
  activeHunk: number
  hunkRef: (i: number, el: HTMLDivElement | null) => void
}) {
  const quiet = f.added + f.removed === 0
  return (
    <section id={anchor(f.file)} className="scroll-mt-24 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/60 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${f.file}` : `Collapse ${f.file}`}
          className="flex items-center gap-1.5 rounded-sm font-mono text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          {f.file}
        </button>
        {f.isNew && <span className="rounded border px-1.5 font-mono text-[10px] text-muted-foreground">new file</span>}
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {quiet ? 'no changes' : `+${f.added} −${f.removed}`}
        </span>
        <a href={href(f.link.path)} className="ml-auto text-xs font-medium text-primary underline-offset-2 hover:underline">
          {f.link.label} →
        </a>
      </header>
      <p className={cn('px-4 py-2.5 text-sm text-pretty', quiet && 'text-muted-foreground')}>{f.summary}</p>
      {!collapsed && (
        <div className="overflow-x-auto border-t font-mono text-xs leading-5">
          <div className="min-w-max">
            <div className="px-4 pt-2 text-muted-foreground">
              <div>
                --- a/{f.file}
                {'  '}
                {f.isNew ? '(no earlier copy)' : since(base, now)}
              </div>
              <div>
                +++ b/{f.file}
                {'  '}now
              </div>
            </div>
            {f.note && <div className="px-4 pt-1 text-muted-foreground italic"># {f.note}</div>}
            {f.hunks.map((h, i) => (
              <div
                key={h.title}
                ref={(el) => hunkRef(i, el)}
                className={cn('mt-2 pb-1 outline-none', activeHunk === i && 'ring-2 ring-ring ring-inset')}
              >
                <div className="bg-muted/70 px-4 py-0.5 text-muted-foreground">@@ {h.title} @@</div>
                {h.lines.map((l, k) => (
                  <DiffLine key={k} line={l} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function DiffLine({ line }: { line: Line }) {
  const row = (
    <div
      className={cn(
        'grid grid-cols-[1.75rem_minmax(0,1fr)] pr-4 whitespace-pre',
        line.kind === '+' && 'bg-highlight-soft text-highlight-soft-foreground',
        line.kind === '-' && 'bg-muted text-muted-foreground',
        line.kind === ' ' && 'text-foreground/70',
        line.kind === '…' && 'text-muted-foreground italic',
      )}
    >
      <span aria-hidden className={cn('text-center select-none', line.kind === '+' && 'font-bold text-highlight', line.kind === '-' && 'font-bold')}>
        {line.kind === '+' ? '+' : line.kind === '-' ? '−' : line.kind === '…' ? '⋯' : ''}
      </span>
      <span className={cn(line.kind === '-' && 'line-through decoration-muted-foreground/60')}>
        <span className="sr-only">{line.kind === '+' ? 'added: ' : line.kind === '-' ? 'removed: ' : ''}</span>
        {line.text}
      </span>
    </div>
  )
  if (!line.tip) return row
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="top" align="start">
        {line.tip}
      </TooltipContent>
    </Tooltip>
  )
}
