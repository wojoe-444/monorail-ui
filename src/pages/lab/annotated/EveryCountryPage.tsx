import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, Table2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { REGIONS, REGION_SHORT, callouts, money, people, regionColor, rowsForYear, yearRange, yrs } from '@/features/lab/annotated/scatter/model'
import { Scatter } from '@/features/lab/annotated/scatter/Scatter'
import { experiment } from '@/features/lab/catalog'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import { WORLD_INDICATORS, type WorldIndicators } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

/*
 * Every Country, Labeled: the classic income-vs-lifespan scatter, but the
 * experiment is the labeling. Every dot is offered a name; a placement engine
 * decides who gets one at this zoom, written callouts explain the outliers,
 * and the curve is labeled where it runs.
 */

const EXP = experiment('every-country')

export function EveryCountryPage() {
  const data = useLiveData<WorldIndicators>(WORLD_INDICATORS)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment · annotated" title={EXP.title} description={EXP.thesis} />
        <SourceLine source="World Bank · World Development Indicators (snapshot)" href="https://data.worldbank.org/" feeds={[data]} />
      </div>
      <LoadGate feeds={[data]} label="Loading 200 countries">
        {() => <Body data={data.data!} />}
      </LoadGate>
    </div>
  )
}

function Body({ data }: { data: WorldIndicators }) {
  const [first, last] = useMemo(() => yearRange(data), [data])
  const [year, setYear] = useState(last)
  const [playing, setPlaying] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [pinned, setPinned] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [table, setTable] = useState(false)
  const [stats, setStats] = useState({ placed: 0, total: 0, zoom: 1 })

  const { rows, fit } = useMemo(() => rowsForYear(data, year), [data, year])

  // Stable axes across years, so movement means movement.
  const domain = useMemo(() => {
    let gLo = Infinity
    let gHi = 0
    let lHi = 0
    const les: number[] = []
    for (let y = first; y <= last; y++) {
      for (const r of rowsForYear(data, y).rows) {
        gLo = Math.min(gLo, r.gdp)
        gHi = Math.max(gHi, r.gdp)
        lHi = Math.max(lHi, r.le)
        les.push(r.le)
      }
    }
    // A handful of crisis-year values (e.g. 14.7 years) would squash everything else;
    // the floor sits at the 1st percentile (all years pooled) and lower values are pinned to it, marked.
    les.sort((a, b) => a - b)
    const lLo = les[Math.floor(les.length * 0.01)] ?? 40
    return {
      x: [Math.floor(Math.log10(gLo) * 10) / 10, Math.ceil(Math.log10(gHi) * 10) / 10] as [number, number],
      y: [Math.floor(lLo / 5) * 5, Math.ceil(lHi / 5) * 5] as [number, number],
    }
  }, [data, first, last])

  const changeYear = (y: number) => {
    setAnimate(true)
    setYear(y)
  }
  useEffect(() => {
    if (!animate) return
    const id = window.setTimeout(() => setAnimate(false), 700)
    return () => window.clearTimeout(id)
  }, [animate, year])

  useEffect(() => {
    if (!playing) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setInterval(
      () => {
        setAnimate(!reduced)
        setYear((y) => {
          if (y >= last) {
            setPlaying(false)
            return last
          }
          return y + 1
        })
      },
      reduced ? 1200 : 800,
    )
    return () => window.clearInterval(id)
  }, [playing, last])

  const notes = useMemo(() => callouts(rows), [rows])
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 6) : []
  }, [rows, query])
  const pinnedRow = rows.find((r) => r.iso3 === pinned)
  const sd = Math.sqrt(rows.reduce((s, r) => s + r.residual ** 2, 0) / Math.max(1, rows.length))
  const within5 = rows.filter((r) => Math.abs(r.residual) <= 5).length

  return (
    <div className="flex flex-col gap-4">
      {/* Controls: one row above everything they scope */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex min-w-60 flex-1 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            aria-label={playing ? 'Pause' : `Play ${first} to ${last}`}
            onClick={() => {
              if (!playing && year >= last) setYear(first)
              setPlaying((p) => !p)
            }}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-xs text-muted-foreground">
              <span>{first}</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">{year}</span>
              <span>{last}</span>
            </div>
            <Slider min={first} max={last} step={1} value={[year]} onValueChange={([v]) => changeYear(v)} thumbLabels={['Year']} />
          </div>
        </div>
        <div className="relative flex w-56 flex-col gap-1.5">
          <Label htmlFor="ec-find">Find a country</Label>
          <Input
            id="ec-find"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) {
                setPinned(matches[0].iso3)
                setQuery('')
              }
            }}
            placeholder="e.g. Chile"
            autoComplete="off"
          />
          {matches.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-lg border bg-popover text-sm shadow-elevation-2">
              {matches.map((m) => (
                <li key={m.iso3}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
                    onClick={() => {
                      setPinned(m.iso3)
                      setQuery('')
                    }}
                  >
                    <span aria-hidden className="size-2 rounded-full" style={{ background: regionColor(m.region) }} />
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant={table ? 'secondary' : 'outline'} onClick={() => setTable((t) => !t)} aria-pressed={table}>
          <Table2 />
          Table
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        {table ? (
          <CountryTable rows={rows} onPick={(iso) => setPinned(iso)} pinned={pinned} />
        ) : (
          <Scatter
            data={data}
            rows={rows}
            fit={fit}
            year={year}
            firstYear={first}
            domain={domain}
            pinned={pinned}
            onPin={setPinned}
            onStats={setStats}
            animate={animate}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t px-4 py-3 text-xs text-muted-foreground">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {REGIONS.map((r) => (
              <li key={r} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: regionColor(r) }} />
                <span className="text-foreground/80">{REGION_SHORT[r]}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <SizeKey />
            {!table && (
              <span className="tabular-nums">
                <span className="font-semibold text-foreground">{stats.placed}</span> of {stats.total} named
                {stats.placed < stats.total ? ' · zoom in for the rest' : ' · every country named'}
                {stats.zoom > 1 ? ` · ${stats.zoom.toFixed(1)}×` : ''}
              </span>
            )}
          </div>
        </div>
      </Card>
      {!table && <p className="hidden text-xs text-muted-foreground sm:block">Ctrl/⌘ + scroll or double-click to zoom, drag to pan, click a dot to pin its trail since {first}.</p>}

      {/* What stands out: the callouts as text, for every screen size */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-3 px-6 lg:col-span-2">
          <h2 className="font-semibold">What stands out in {year}</h2>
          <p className="text-sm text-muted-foreground">
            The curve is the life expectancy typical for each income. In {year}, {within5} of {rows.length} countries sit within 5 years of it; the
            typical distance is {sd.toFixed(1)} years. These four are furthest off among countries of a million people or more.
          </p>
          <ul className="flex flex-col divide-y">
            {notes.map((n) => {
              const r = rows.find((k) => k.iso3 === n.iso3)!
              return (
                <li key={n.iso3}>
                  <button type="button" className="flex w-full items-start gap-3 py-2.5 text-left text-sm hover:bg-accent/50" onClick={() => setPinned(n.iso3)}>
                    <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: regionColor(r.region) }} />
                    <span>
                      <span className="font-medium">{n.title}.</span> <span className="text-muted-foreground">{n.text}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card className="gap-2 px-6">
          <h2 className="font-semibold">{pinnedRow ? pinnedRow.name : 'Pin a country'}</h2>
          {pinnedRow ? (
            <PinnedFacts row={pinnedRow} year={year} first={first} data={data} />
          ) : (
            <p className="text-sm text-muted-foreground">Click any dot, label or callout to pin it. The chart draws its path since {first} and keeps its name on screen at every zoom.</p>
          )}
          {pinnedRow && (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setPinned(null)}>
              Unpin
            </Button>
          )}
        </Card>
      </div>
    </div>
  )
}

function PinnedFacts({ row, year, first, data }: { row: ReturnType<typeof rowsForYear>['rows'][number]; year: number; first: number; data: WorldIndicators }) {
  const then = rowsForYear(data, first).rows.find((r) => r.iso3 === row.iso3)
  const leGain = then ? row.le - then.le : undefined
  const gdpX = then ? row.gdp / then.gdp : undefined
  return (
    <p className="text-sm text-muted-foreground">
      In {year}, people in {row.name} could expect to live <span className="font-semibold text-foreground">{row.le.toFixed(1)} years</span> on{' '}
      <span className="font-semibold text-foreground">{money(row.gdp)}</span> a head, {yrs(row.residual)} years {row.residual >= 0 ? 'above' : 'below'} the curve.
      {then && leGain !== undefined && gdpX !== undefined && (
        <>
          {' '}
          Since {first}, lives {leGain >= 0 ? 'lengthened' : 'shortened'} by <span className="font-semibold text-foreground">{yrs(leGain)} years</span> while income{' '}
          {gdpX >= 1 ? `grew ${gdpX >= 1.95 ? `${gdpX.toFixed(1)}×` : `${Math.round((gdpX - 1) * 100)}%`}` : `fell ${Math.round((1 - gdpX) * 100)}%`}.
        </>
      )}{' '}
      Population {people(row.pop)}.
    </p>
  )
}

function SizeKey() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="Dot area is population">
      <svg width="46" height="20" aria-hidden>
        <circle cx="5" cy="15" r="2.5" fill="none" stroke="var(--muted-foreground)" />
        <circle cx="16" cy="13" r="5" fill="none" stroke="var(--muted-foreground)" />
        <circle cx="34" cy="10" r="9" fill="none" stroke="var(--muted-foreground)" />
      </svg>
      people
    </span>
  )
}

function CountryTable({ rows, onPick, pinned }: { rows: ReturnType<typeof rowsForYear>['rows']; onPick: (iso: string) => void; pinned: string | null }) {
  const sorted = [...rows].sort((a, b) => a.residual - b.residual)
  return (
    <div className="max-h-[640px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Country</th>
            <th className="px-3 py-2 text-right font-medium">Life expectancy</th>
            <th className="px-3 py-2 text-right font-medium">GDP per person</th>
            <th className="px-3 py-2 text-right font-medium">People</th>
            <th className="px-4 py-2 text-right font-medium">vs. curve</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((r) => (
            <tr key={r.iso3} className={cn('cursor-pointer hover:bg-accent/50', pinned === r.iso3 && 'bg-primary-soft')} onClick={() => onPick(r.iso3)}>
              <td className="px-4 py-1.5">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: regionColor(r.region) }} />
                  {r.name}
                </span>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.le.toFixed(1)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{money(r.gdp)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{people(r.pop)}</td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                {r.residual >= 0 ? '+' : '−'}
                {yrs(r.residual)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
