import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Search } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { experiment } from '@/features/lab/catalog'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import { boards, fmtDelta, hms, matcher, WIKI_FILTERS, type Boards, type Filters, type WikiFilter } from '@/features/lab/wire/model'
import { BUCKET_MS, BUCKETS, useWikiStream, type WikiEvent } from '@/features/lab/wire/useWikiStream'
import { cn } from '@/lib/utils'

/*
 * Wire: every edit to every Wikimedia wiki, live, as a log. The top strip
 * reads the rate and the shape; the log is for reading at speed (it pauses
 * under the pointer or with Space); the side column ranks the last five
 * minutes. One filter row scopes all three.
 */

const EXP = experiment('wire')
const SHOW = 160
const MIN_DELTAS = [0, 100, 1000, 10000]

export function WirePage() {
  const s = useWikiStream()
  const [filters, setFilters] = useState<Filters>({ wiki: 'all', hideBots: false, minDelta: 0, q: '' })
  const [manualPause, setManualPause] = useState(false)
  const [hoverPause, setHoverPause] = useState(false)
  const [help, setHelp] = useState(false)
  const search = useRef<HTMLInputElement>(null)
  const paused = manualPause || hoverPause

  // A paused log shows the events as they were when it paused.
  const [frozen, setFrozen] = useState<{ at: number; events: WikiEvent[] } | null>(null)
  useEffect(() => {
    if (paused && !frozen) setFrozen({ at: Date.now(), events: s.events })
    if (!paused && frozen) setFrozen(null)
  }, [paused, frozen, s.events])

  const keep = useMemo(() => matcher(filters), [filters])
  const shown = useMemo(() => (frozen ? frozen.events : s.events).filter(keep).slice(0, SHOW), [frozen, s.events, keep])

  const queued = useMemo(() => {
    if (!frozen) return 0
    let n = 0
    for (const e of s.windowRef.current) {
      if (e.at <= frozen.at) break
      if (keep(e)) n++
    }
    return n
    // windowRef is read on each tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen, keep, s.tick])

  // Leaderboards every 2 s: fast enough to feel live, slow enough to read.
  const slow = Math.floor(s.tick / 10)
  const b = useMemo(
    () => boards(s.windowRef.current, keep, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slow, keep],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (t.closest('input, textarea, select, [contenteditable="true"]')) {
        if (e.key === 'Escape') (t as HTMLInputElement).blur()
        return
      }
      let handled = true
      if (e.key === ' ') setManualPause((p) => !p)
      else if (e.key === '/') search.current?.focus()
      else if (e.key === 'b') setFilters((f) => ({ ...f, hideBots: !f.hideBots }))
      else if (e.key >= '1' && e.key <= '5') setFilters((f) => ({ ...f, wiki: WIKI_FILTERS[Number(e.key) - 1].value }))
      else if (e.key === '?') setHelp((h) => !h)
      else if (e.key === 'Escape') setHelp(false)
      else handled = false
      if (handled) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative flex h-full flex-col bg-background font-mono text-[11px]">
      {/* Title row */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1.5">
        <span className="font-semibold tracking-[0.2em] text-primary uppercase">{EXP.title}</span>
        <span className="hidden min-w-0 flex-1 truncate font-sans text-xs text-muted-foreground md:inline">{EXP.thesis}</span>
        <SourceLine source="Wikimedia EventStreams · recentchange" href="https://stream.wikimedia.org/?doc" feeds={[s.feed]} className="min-w-0" />
      </div>

      <LoadGate feeds={[s.feed]} label="Opening the Wikimedia stream" className="flex-1">
        {() => (
          <>
            <RateStrip buckets={s.buckets} b={b} total={s.total} openedAt={s.openedAt} tick={s.tick} />

            {/* One filter row scopes the log and the leaderboards */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2 font-sans">
              <Segmented<WikiFilter>
                aria-label="Wiki"
                value={filters.wiki}
                onChange={(wiki) => setFilters((f) => ({ ...f, wiki }))}
                options={WIKI_FILTERS}
                className="max-w-full overflow-x-auto"
              />
              <div className="flex items-center gap-2">
                <Switch id="wire-bots" checked={filters.hideBots} onCheckedChange={(hideBots) => setFilters((f) => ({ ...f, hideBots }))} />
                <Label htmlFor="wire-bots" className="text-xs font-normal">
                  Hide bots
                </Label>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <Label htmlFor="wire-min" className="text-xs font-normal whitespace-nowrap">
                  Size at least
                </Label>
                <NativeSelect
                  id="wire-min"
                  className="w-36"
                  value={filters.minDelta}
                  onChange={(e) => setFilters((f) => ({ ...f, minDelta: Number(e.target.value) }))}
                >
                  {MIN_DELTAS.map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? 'any change' : `±${d.toLocaleString('en-US')} B`}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex min-w-40 flex-1 items-center gap-2 sm:max-w-72">
                <Label htmlFor="wire-q" className="sr-only">
                  Title contains
                </Label>
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="wire-q"
                    ref={search}
                    value={filters.q}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    placeholder="Title contains…   /"
                    className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualPause((p) => !p)}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                {manualPause ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                {manualPause ? 'Resume' : 'Pause'}
                <kbd className="hidden rounded-sm border bg-muted px-1 font-mono text-[10px] text-muted-foreground sm:inline">Space</kbd>
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_21rem]">
              <Log
                events={shown}
                paused={paused}
                queued={queued}
                manual={manualPause}
                onHover={setHoverPause}
                empty={filters}
              />
              <Side b={b} />
            </div>

            {/* Status line */}
            <div className="flex h-6 shrink-0 items-center gap-4 border-t bg-card px-3 text-muted-foreground">
              <span className={cn('font-semibold', paused ? 'text-primary' : 'text-foreground')}>{paused ? '❚❚ PAUSED' : '● LIVE'}</span>
              <span className="hidden truncate md:inline">space pause · / search · b bots · 1–5 wiki · ? keys · click a row for the diff</span>
              <span className="ml-auto truncate tabular-nums">
                <span className="text-foreground">{shown.length}</span> rows<span className="hidden sm:inline"> shown · + new page · # log entry</span>
              </span>
            </div>
          </>
        )}
      </LoadGate>

      {help && <Help onClose={() => setHelp(false)} />}
    </div>
  )
}

// ── Rate strip ─────────────────────────────────────────────────────────────

function RateStrip({ buckets, b, total, openedAt, tick }: { buckets: number[]; b: Boards; total: number; openedAt: number; tick: number }) {
  const [hover, setHover] = useState<number | null>(null)
  // The last bucket is still filling: leave it out of the scale and show it faded.
  const max = Math.max(1, ...buckets.slice(0, -1))
  const humanShare = b.n ? (b.n - b.bots) / b.n : 0
  const mins = Math.max(1, Math.round((Date.now() - openedAt) / 60_000))
  void tick
  const readout =
    hover === null
      ? { value: b.perSec10.toFixed(1), label: 'events / s, last 10 s' }
      : {
          value: (buckets[hover] / (BUCKET_MS / 1000)).toFixed(1),
          label: hover === BUCKETS - 1 ? 'events / s, this bucket so far' : `events / s, ${fmtAgo((BUCKETS - 1 - hover) * BUCKET_MS)} ago`,
        }

  return (
    <div className="flex shrink-0 flex-wrap items-end gap-x-6 gap-y-2 border-b px-3 py-2.5">
      <div className="flex min-w-36 items-baseline gap-2">
        <span className="font-sans text-3xl font-semibold tracking-tight text-foreground">{readout.value}</span>
        <span className="text-muted-foreground">{readout.label}</span>
      </div>

      <div className="hidden min-w-0 flex-1 flex-col gap-1 sm:flex">
        <div className="flex h-8 items-end gap-px" onPointerLeave={() => setHover(null)} role="img" aria-label="Events per 5 seconds over the last 5 minutes">
          {buckets.map((n, i) => (
            <div key={i} className="flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)}>
              <div
                className={cn('w-full rounded-t-sm transition-[height]', hover === i && 'opacity-70')}
                style={{
                  height: `${Math.max(2, (Math.min(n, max) / max) * 100)}%`,
                  background: 'var(--series-1)',
                  opacity: i === BUCKETS - 1 ? 0.35 : undefined,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>5 min ago</span>
          <span>one bar = 5 s</span>
          <span>now</span>
        </div>
      </div>

      <div className="flex w-44 flex-col gap-1">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${Math.round(humanShare * 100)}% human, ${Math.round((1 - humanShare) * 100)}% bot`}>
          <div className="h-full rounded-l-full bg-foreground/70" style={{ width: `${humanShare * 100}%` }} />
          <div className="h-full flex-1 rounded-r-full bg-muted-foreground/35" />
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>
            <span className="text-foreground tabular-nums">{Math.round(humanShare * 100)}%</span> human
          </span>
          <span>
            <span className="text-foreground tabular-nums">{Math.round((1 - humanShare) * 100)}%</span> bot
          </span>
        </div>
      </div>

      <Stat value={b.newPages.toLocaleString('en-US')} label="new pages, 5 min" />
      <Stat value={total.toLocaleString('en-US')} label={`since you opened (${mins}m)`} className="hidden md:flex" />
    </div>
  )
}

function fmtAgo(ms: number) {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

function Stat({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-base font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

// ── The log ────────────────────────────────────────────────────────────────

const COLS =
  'grid grid-cols-[4.5rem_minmax(0,1fr)_4.25rem] sm:grid-cols-[4rem_5.5rem_1rem_4.5rem_3.25rem_minmax(0,1fr)] xl:grid-cols-[4rem_5.5rem_1rem_4.5rem_3.25rem_minmax(0,1fr)_minmax(0,11rem)] gap-x-2'

function Log({
  events,
  paused,
  queued,
  manual,
  onHover,
  empty,
}: {
  events: WikiEvent[]
  paused: boolean
  queued: number
  manual: boolean
  onHover: (h: boolean) => void
  empty: Filters
}) {
  return (
    <section
      aria-label="Live edits"
      className="relative flex min-h-0 flex-col lg:border-r"
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <div className={cn(COLS, 'shrink-0 border-b px-3 py-1 text-[10px] tracking-wider text-muted-foreground uppercase')}>
        <span className="hidden sm:block">Time</span>
        <span>Wiki</span>
        <span className="hidden sm:block" />
        <span className="hidden text-right sm:block">Bytes</span>
        <span className="hidden sm:block" />
        <span>Title</span>
        <span className="hidden xl:block">User</span>
        <span className="text-right sm:hidden">Bytes</span>
      </div>
      {paused && (
        <div className="absolute inset-x-0 top-6 z-10 flex justify-center">
          <div className="mt-2 rounded-full bg-primary-soft px-3 py-1 text-primary-soft-foreground shadow-elevation-2">
            ❚❚ paused · <span className="tabular-nums">{queued.toLocaleString('en-US')}</span> queued ·{' '}
            {manual ? 'Space to resume' : 'move the pointer away to resume'}
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-3 py-10 text-center font-sans text-sm text-muted-foreground">
            Nothing matching yet{empty.q ? ` “${empty.q}”` : ''}. The stream is live; matching edits appear here as they happen.
          </div>
        ) : (
          <ul>
            {events.map((e) => (
              <li key={e.id}>
                <a
                  href={e.link}
                  target="_blank"
                  rel="noreferrer"
                  title={e.comment || undefined}
                  className={cn(
                    COLS,
                    'animate-in fade-in slide-in-from-top-1 items-center px-3 py-[3px] duration-300 outline-none hover:bg-accent focus-visible:bg-accent motion-reduce:animate-none',
                  )}
                >
                  <span className="hidden text-muted-foreground tabular-nums sm:block">{hms(e.t)}</span>
                  <span className="truncate text-muted-foreground">{e.code}</span>
                  <TypeGlyph e={e} />
                  <span className={cn('hidden text-right tabular-nums sm:block', e.delta !== null && Math.abs(e.delta) >= 1000 ? 'text-foreground' : 'text-muted-foreground')}>
                    {fmtDelta(e.delta)}
                  </span>
                  <DeltaBar d={e.delta} className="hidden sm:flex" />
                  <span className={cn('truncate', e.minor ? 'text-foreground/70' : 'text-foreground', e.type === 'new' && 'font-semibold')}>
                    {e.title || '—'}
                    {e.type === 'log' && e.logType && <span className="ml-2 text-muted-foreground">{e.logType}</span>}
                  </span>
                  <span className="hidden truncate text-muted-foreground xl:block">
                    {e.user}
                    {e.bot && <span className="ml-1.5 rounded-sm border px-1 text-[9px] tracking-wider uppercase">bot</span>}
                  </span>
                  <span className="text-right text-muted-foreground tabular-nums sm:hidden">{fmtDelta(e.delta)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function TypeGlyph({ e }: { e: WikiEvent }) {
  if (e.type === 'new') return <span className="hidden font-semibold text-primary sm:block" title="New page">+</span>
  if (e.type === 'log') return <span className="hidden text-muted-foreground sm:block" title="Log entry">#</span>
  return <span className="hidden text-muted-foreground/60 sm:block" title="Edit">·</span>
}

/** Diverging tick: additions grow right in series 1, removals grow left in series 2, log-scaled to 10 KB. */
function DeltaBar({ d, className }: { d: number | null; className?: string }) {
  const w = d ? Math.min(1, Math.log10(Math.abs(d) + 1) / 4) * 50 : 0
  return (
    <span aria-hidden className={cn('relative h-2 items-center', className)}>
      <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
      {d !== null && d !== 0 && (
        <span
          className={cn('absolute h-1.5', d > 0 ? 'left-1/2 rounded-r-sm' : 'right-1/2 rounded-l-sm')}
          style={{ width: `${w}%`, background: d > 0 ? 'var(--series-1)' : 'var(--series-2)' }}
        />
      )}
    </span>
  )
}

// ── Side column: the last five minutes ranked ──────────────────────────────

function Side({ b }: { b: Boards }) {
  const wmax = Math.max(1, ...b.wikis.map((w) => w.n))
  return (
    <aside aria-label="Last five minutes" className="hidden min-h-0 flex-col overflow-y-auto lg:flex">
      <Block title="Most edited titles" meta="5 min">
        {b.titles.length === 0 ? (
          <Empty>No title edited twice yet.</Empty>
        ) : (
          b.titles.map((t) => (
            <a key={t.key} href={t.link} target="_blank" rel="noreferrer" className="flex items-baseline gap-2 py-0.5 outline-none hover:bg-accent focus-visible:bg-accent">
              <span className="w-6 shrink-0 text-right text-foreground tabular-nums">{t.n}×</span>
              <span className="w-14 shrink-0 truncate text-muted-foreground">{t.code}</span>
              <span className="min-w-0 truncate text-foreground">{t.title}</span>
            </a>
          ))
        )}
      </Block>

      <Block title="Busiest wikis" meta={`${b.n.toLocaleString('en-US')} events`}>
        {b.wikis.map((w) => (
          <div key={w.code} className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-2 py-0.5">
            <span className="truncate text-foreground">{w.code}</span>
            <span className="h-1.5 rounded-r-sm" style={{ width: `${(w.n / wmax) * 100}%`, background: 'var(--series-1)' }} />
            <span className="text-right text-muted-foreground tabular-nums">{w.n.toLocaleString('en-US')}</span>
          </div>
        ))}
      </Block>

      <Block title="Biggest additions" meta="bytes">
        {b.adds.length === 0 ? <Empty>None yet.</Empty> : b.adds.map((e) => <SizedRow key={e.id} e={e} />)}
      </Block>
      <Block title="Biggest removals" meta="bytes">
        {b.cuts.length === 0 ? <Empty>None yet.</Empty> : b.cuts.map((e) => <SizedRow key={e.id} e={e} />)}
      </Block>

      <Block title="New on English Wikipedia" meta="articles">
        {b.enNew.length === 0 ? (
          <Empty>No new articles in the window{' '}— they arrive a few a minute.</Empty>
        ) : (
          b.enNew.map((e) => (
            <a key={e.id} href={e.link} target="_blank" rel="noreferrer" className="flex items-baseline gap-2 py-0.5 outline-none hover:bg-accent focus-visible:bg-accent">
              <span className="w-14 shrink-0 text-muted-foreground tabular-nums">{hms(e.t).slice(0, 5)}</span>
              <span className="min-w-0 truncate text-foreground">{e.title}</span>
            </a>
          ))
        )}
      </Block>
    </aside>
  )
}

function SizedRow({ e }: { e: WikiEvent }) {
  return (
    <a href={e.link} target="_blank" rel="noreferrer" className="grid grid-cols-[4.75rem_3.5rem_minmax(0,1fr)] items-baseline gap-2 py-0.5 outline-none hover:bg-accent focus-visible:bg-accent">
      <span className="text-right text-foreground tabular-nums">{fmtDelta(e.delta)}</span>
      <span className="truncate text-muted-foreground">{e.code}</span>
      <span className="truncate text-foreground">{e.title}</span>
    </a>
  )
}

function Block({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="border-b px-3 py-2.5">
      <h3 className="mb-1.5 flex items-baseline justify-between text-[10px] tracking-wider text-muted-foreground uppercase">
        <span className="font-semibold text-foreground">{title}</span>
        {meta && <span>{meta}</span>}
      </h3>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-0.5 font-sans text-xs text-muted-foreground">{children}</p>
}

const KEYS: [string, string][] = [
  ['Space', 'pause / resume the log'],
  ['hover', 'pauses while the pointer is over the log'],
  ['/', 'search titles'],
  ['b', 'hide or show bots'],
  ['1–5', 'All · English · Wikidata · Commons · Other'],
  ['click', 'open the diff (or the new page) in a new tab'],
  ['?', 'this help'],
  ['Esc', 'close'],
]

function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-label="Keyboard shortcuts" className="w-96 rounded-lg border bg-popover p-4 text-popover-foreground shadow-elevation-3" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Keys</div>
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-1.5">
          {KEYS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-sm border bg-muted px-1.5 py-px">{k}</kbd>
              </dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 border-t pt-3 text-muted-foreground">
          Rows: <span className="text-primary">+</span> new page · <span>#</span> log entry · · edit. Bars:{' '}
          <span className="inline-block h-1.5 w-3 rounded-sm align-middle" style={{ background: 'var(--series-1)' }} /> bytes added,{' '}
          <span className="inline-block h-1.5 w-3 rounded-sm align-middle" style={{ background: 'var(--series-2)' }} /> removed (log scale, full at 10 KB).
        </div>
      </div>
    </div>
  )
}
