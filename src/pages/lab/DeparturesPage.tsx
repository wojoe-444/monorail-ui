import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { experiment } from '@/features/lab/catalog'
import { Board, FlapText, FlapTile, StatusPill } from '@/features/lab/departures/Board'
import { boardStatus, fmtWindow, isDated, isFirm, localDayKey, operator, regionOf, REGIONS, site, type Region } from '@/features/lab/departures/model'
import { useLaunchesPrevious, useLaunchesUpcoming, type Launch } from '@/features/lab/feeds'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import { timeAgo, useNow } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

/*
 * Departures: rocket launches as an airport departures board. A live
 * countdown to the next firm launch leads; the board flips its characters
 * when anything changes; arrivals are the recent launches with outcomes.
 * Dates are only as precise as the source says: "NET NOV" is a placeholder,
 * not a promise, and never lands on the day strip.
 */

const EXP = experiment('departures')

type Range = '24h' | '7d' | 'all'
const RANGES: { value: Range; label: string }[] = [
  { value: '24h', label: 'Next 24h' },
  { value: '7d', label: '7 days' },
  { value: 'all', label: 'All' },
]

export function DeparturesPage() {
  const up = useLaunchesUpcoming()
  const prev = useLaunchesPrevious()
  const feeds = [up, prev]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />
        <SourceLine source={EXP.source} href="https://thespacedevs.com/llapi" feeds={feeds} />
        {up.error && up.data && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            Launch Library is limiting requests from this browser (it allows about 15 an hour). Showing the copy from {timeAgo(up.updatedAt)}.
          </p>
        )}
      </div>
      <LoadGate feeds={[up]} label="Reading the launch manifest">
        {() => <Body upcoming={up.data!} previous={prev.data ?? []} />}
      </LoadGate>
    </div>
  )
}

function Body({ upcoming, previous }: { upcoming: Launch[]; previous: Launch[] }) {
  const now = useNow(30_000)
  const [region, setRegion] = useState<Region>('all')
  const [range, setRange] = useState<Range>('all')

  const inRegion = (l: Launch) => region === 'all' || regionOf(l) === region
  const live = upcoming.filter((l) => l.status === 'In Flight' || l.net > now - 3600_000 || !isDated(l))
  const next = live.find((l) => isFirm(l) && l.net > now)

  const board = useMemo(() => {
    const limit = range === '24h' ? now + 86_400_000 : range === '7d' ? now + 7 * 86_400_000 : Infinity
    return live.filter(inRegion).filter((l) => (range === 'all' ? true : isDated(l) && l.net <= limit))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming, region, range, now])
  const arrivals = previous.filter(inRegion)

  return (
    <>
      {next && <Hero l={next} />}

      {/* Filters scope everything below */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Region> aria-label="Region" value={region} onChange={setRegion} options={REGIONS} className="max-w-full overflow-x-auto" />
        <Segmented<Range> aria-label="Time range" value={range} onChange={setRange} options={RANGES} />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="font-mono tracking-[0.18em] uppercase">Departures</CardTitle>
          <CardDescription>
            {board.length} launch{board.length === 1 ? '' : 'es'} · local time · select a row for the window, orbit and pad
          </CardDescription>
        </CardHeader>
        <Board
          launches={board}
          kind="departures"
          now={now}
          empty={range === '24h' ? 'Nothing firm in the next 24 hours for this region.' : 'No launches on the manifest for this filter.'}
        />
      </Card>

      <>
        <Card>
          <CardHeader>
            <CardTitle>The next two weeks</CardTitle>
            <CardDescription className="max-w-3xl text-sm">
              <Summary upcoming={upcoming.filter(inRegion)} now={now} />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DayStrip upcoming={upcoming.filter(inRegion)} coverage={upcoming.at(-1)?.net ?? now} now={now} />
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="font-mono tracking-[0.18em] uppercase">Arrivals</CardTitle>
            <CardDescription>The last {arrivals.length} launches and how they went</CardDescription>
          </CardHeader>
          <Board launches={arrivals} kind="arrivals" now={now} empty={previous.length ? 'No recent launches from this region.' : 'Recent launches haven’t loaded yet.'} />
        </Card>
      </>
    </>
  )
}

// ── Hero: the next firm launch, counting down every second ────────────────

function Hero({ l }: { l: Launch }) {
  const now = useNow(1000)
  const ms = Math.max(0, l.net - now)
  const s = Math.floor(ms / 1000)
  const days = Math.floor(s / 86_400)
  const hh = String(Math.floor((s % 86_400) / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  const st = boardStatus(l)
  const approx = l.precision === 'Hour'

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Next departure</div>
          <div className="flex flex-wrap items-center gap-0.5 sm:gap-1.5" role="timer" aria-label={`T minus ${days} days ${hh} hours ${mm} minutes ${ss} seconds`}>
            <span className="mr-0.5 font-mono text-xl font-semibold text-muted-foreground sm:mr-1 sm:text-4xl">T−</span>
            {days > 0 && (
              <>
                {[...String(days)].map((c, i) => (
                  <FlapTile key={`d${i}`} ch={c} />
                ))}
                <span className="mr-2 ml-0.5 self-end pb-2 font-mono text-sm text-muted-foreground">D</span>
              </>
            )}
            <FlapTile ch={hh[0]} />
            <FlapTile ch={hh[1]} />
            <span className="font-mono text-xl text-muted-foreground sm:text-3xl">:</span>
            <FlapTile ch={mm[0]} />
            <FlapTile ch={mm[1]} />
            <span className="font-mono text-xl text-muted-foreground sm:text-3xl">:</span>
            <FlapTile ch={ss[0]} />
            <FlapTile ch={ss[1]} />
          </div>
          {approx && <div className="text-xs text-muted-foreground">T-0 is only good to the hour, so the seconds are a guide.</div>}
        </div>
        <div className="flex min-w-0 flex-col gap-2 lg:max-w-md lg:items-end lg:text-right">
          <div className="font-mono text-xl font-semibold tracking-wide uppercase">
            <FlapText text={l.rocket} />
          </div>
          <div className="text-sm text-foreground">{l.mission}</div>
          <div className="text-sm text-muted-foreground">
            {operator(l.provider)} · {site(l.location)}
            {l.pad ? ` · ${l.pad}` : ''}
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <StatusPill s={st} />
            <span className="font-mono text-xs text-muted-foreground">
              {new Date(l.net).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · window{' '}
              {fmtWindow(l)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Two weeks at a glance ──────────────────────────────────────────────────

const WEEKDAY = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'long' })

function Summary({ upcoming, now }: { upcoming: Launch[]; now: number }) {
  const week = upcoming.filter((l) => isDated(l) && l.net > now && l.net <= now + 7 * 86_400_000)
  const loose = upcoming.filter((l) => !isDated(l)).length
  if (week.length === 0) {
    return (
      <>
        Nothing with a firm date in the next 7 days.{loose ? ` ${loose} more are only dated to the month or quarter.` : ''}
      </>
    )
  }
  const ops = new Map<string, number>()
  const days = new Map<string, { t: number; n: number }>()
  for (const l of week) {
    const o = operator(l.provider)
    ops.set(o, (ops.get(o) ?? 0) + 1)
    const k = localDayKey(l.net)
    days.set(k, { t: l.net, n: (days.get(k)?.n ?? 0) + 1 })
  }
  const [topOp, topN] = [...ops].sort((a, b) => b[1] - a[1])[0]
  const busiest = [...days.values()].sort((a, b) => b.n - a.n)[0]
  return (
    <>
      <strong className="font-semibold text-foreground">{week.length}</strong> launch{week.length === 1 ? '' : 'es'} in the next 7 days
      {week.length > 1 && topN > 1 ? (
        <>
          , <strong className="font-semibold text-foreground">{topN}</strong> of them {topOp}
        </>
      ) : null}
      .{' '}
      {busiest.n > 1 ? (
        <>
          The busiest day is <strong className="font-semibold text-foreground">{WEEKDAY(busiest.t)}</strong>, with {busiest.n}.{' '}
        </>
      ) : (
        'No day has more than one. '
      )}
      {loose ? `${loose} more are dated only to the month or quarter, so they stay off the strip.` : ''}
    </>
  )
}

function DayStrip({ upcoming, coverage, now }: { upcoming: Launch[]; coverage: number; now: number }) {
  const days = useMemo(() => {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const t = d.getTime()
      const list = upcoming.filter((l) => isDated(l) && localDayKey(l.net) === localDayKey(t))
      return { t, list, beyond: t > coverage }
    })
  }, [upcoming, coverage, now])
  const max = Math.max(1, ...days.map((d) => d.list.length))
  const H = 96

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1" style={{ height: H + 20 }}>
        {days.map((d) => {
          const n = d.list.length
          return (
            <Tooltip key={d.t}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-full flex-col items-center justify-end gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${new Date(d.t).toDateString()}: ${n} launch${n === 1 ? '' : 'es'}`}
                >
                  <span className="text-[11px] font-medium text-foreground tabular-nums">{n || ''}</span>
                  <span
                    className={cn('w-full max-w-6 rounded-t-sm', n === 0 && 'bg-border')}
                    style={{ height: n ? (n / max) * H : 1, background: n ? 'var(--series-1)' : undefined }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64">
                <div className="font-medium">{new Date(d.t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                {n ? (
                  <ul className="mt-1">
                    {d.list.map((l) => (
                      <li key={l.id}>
                        {l.rocket} · {l.mission}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>{d.beyond ? 'Past the end of the manifest we fetched.' : 'No dated launches.'}</div>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1 border-t pt-1.5 text-center text-[10px] text-muted-foreground tabular-nums">
        {days.map((d, i) => {
          const dt = new Date(d.t)
          return (
            <span key={d.t} className={cn(i === 0 && 'font-semibold text-foreground')}>
              {i === 0 ? 'Today' : dt.toLocaleDateString('en-GB', { weekday: 'narrow' })}
              <br />
              {dt.getDate()}
            </span>
          )
        })}
      </div>
    </div>
  )
}
