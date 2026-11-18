import { useState, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { EXPERIMENTS, GROUP_LABELS, GROUP_ORDER, type Experiment, type ExperimentGroup } from '@/features/lab/catalog'
import {
  useGenerationDay,
  useGenerationNow,
  useLaunchesUpcoming,
  useQuakesDay,
  useWeather,
  useWikiLatest,
} from '@/features/lab/feeds'
import { CARBON_BASE, CITIES, LIFE_EXPECTANCY, WORLD_INDICATORS, latest, type LifeData, type WorldIndicators } from '@/features/lab/sources'
import { timeAgo, useElementSize, useLiveData, useNow } from '@/features/lab/useLiveData'
import { prefs } from '@/lib/prefs'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * The Atlas: the lab's front page. A map of dashboard design space (how
 * dense, and whether the data speaks in pictures or in words) with every
 * experiment placed on it, then one card per experiment, grouped by review
 * round, each carrying a single live reading from its feed.
 */

const GROUPS = GROUP_ORDER
export const GROUP_COLOR: Record<ExperimentGroup, string> = {
  favorite: 'var(--primary)',
  narrative: 'var(--series-3)',
  annotated: 'var(--series-5)',
  new: 'var(--highlight)',
  kept: 'var(--muted-foreground)',
}
export const GROUP_BLURB: Record<ExperimentGroup, string> = {
  favorite: 'Picked from round one. In all three, words and type carry the data.',
  narrative: 'How far the written-dashboard idea from Forecast, Written can go.',
  annotated: 'How far the annotated charts in Attention can go: annotation as the main event.',
  new: 'Round two. Most go further toward words, type and the keyboard; a few test the edges.',
  kept: 'From round one, not cut.',
}

export function AtlasPage() {
  const [active, setActive] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Dashboards"
        title={`${EXPERIMENTS.length} ways to look at live data`}
        description="Most dashboards are the same dashboard: a row of KPI tiles over a line chart over a table. Each experiment pushes one idea as far as it goes, on real public feeds, and says what it gives up. The three favorites from round one all let words do the work, so the map now asks how much a dashboard speaks in words."
      />
      <Card className="gap-0 py-0">
        <DesignSpace active={active} onActive={setActive} />
      </Card>
      {GROUPS.map((g) => {
        const items = EXPERIMENTS.filter((e) => e.group === g)
        return (
          <section key={g} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: GROUP_COLOR[g] }} />
                {GROUP_LABELS[g]}
                <span className="text-sm font-normal text-muted-foreground tabular-nums">{items.length}</span>
              </h2>
              <p className="text-sm text-muted-foreground">{GROUP_BLURB[g]}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((e) => (
                <ExperimentCard key={e.id} e={e} n={EXPERIMENTS.indexOf(e) + 1} active={active === e.id} onActive={setActive} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ── The map ────────────────────────────────────────────────────────────────

function DesignSpace({ active, onActive }: { active: string | null; onActive: (id: string | null) => void }) {
  const [ref, { width }] = useElementSize()
  const narrow = width < 640
  const height = narrow ? 420 : 520
  const m = { top: 28, right: 28, bottom: 44, left: 44 }
  const w = Math.max(0, width - m.left - m.right)
  const h = height - m.top - m.bottom
  const x = (v: number) => m.left + v * w
  const y = (v: number) => m.top + (1 - v) * h

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Experiments placed by density (calm to dense) and by whether they speak in pictures or words">
          <line x1={x(0.5)} x2={x(0.5)} y1={m.top} y2={m.top + h} stroke="var(--chart-grid)" />
          <line x1={m.left} x2={m.left + w} y1={y(0.5)} y2={y(0.5)} stroke="var(--chart-grid)" />
          <rect x={m.left} y={m.top} width={w} height={h} fill="none" stroke="var(--chart-axis)" />

          {/* Where the conventional dashboard sits */}
          <ellipse cx={x(0.52)} cy={y(0.1)} rx={w * 0.19} ry={h * 0.07} fill="var(--muted-foreground)" opacity={0.1} />
          <text x={x(0.52)} y={y(0.1)} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[11px]">
            {narrow ? 'the usual dashboard' : 'where most dashboards live: tiles, a line chart, a table'}
          </text>

          {!narrow && (
            <g className="fill-muted-foreground text-[11px] tracking-[0.08em] uppercase">
              <text x={m.left + 12} y={m.top + 20}>Conversation</text>
              <text x={m.left + w - 12} y={m.top + 20} textAnchor="end">Reading room</text>
              <text x={m.left + 12} y={m.top + h - 12}>Signal</text>
              <text x={m.left + w - 12} y={m.top + h - 12} textAnchor="end">Instrument</text>
            </g>
          )}

          <text x={m.left} y={height - 14} className="fill-muted-foreground text-xs">
            ← Calm
          </text>
          <text x={m.left + w} y={height - 14} textAnchor="end" className="fill-muted-foreground text-xs">
            Dense →
          </text>
          <text x={m.left + w / 2} y={height - 14} textAnchor="middle" className="fill-foreground text-xs font-medium">
            How much is on screen
          </text>
          <g transform={`translate(${18}, ${m.top + h / 2}) rotate(-90)`}>
            <text textAnchor="middle" className="fill-foreground text-xs font-medium">
              Speaks in pictures → speaks in words
            </text>
          </g>

          {EXPERIMENTS.map((e, i) => {
            const cx = x(e.density)
            const cy = y(e.verbal)
            const left = e.density > 0.78
            const on = active === e.id
            return (
              <a
                key={e.id}
                href={href(e.path)}
                onPointerEnter={() => onActive(e.id)}
                onPointerLeave={() => onActive(null)}
                onFocus={() => onActive(e.id)}
                onBlur={() => onActive(null)}
                className="outline-none [&:focus-visible_circle.dot]:stroke-ring"
              >
                <title>{`${e.title}: ${e.thesis}`}</title>
                <circle cx={cx} cy={cy} r={16} fill="transparent" />
                <circle className="dot transition-all" cx={cx} cy={cy} r={on ? 8 : 6} fill={GROUP_COLOR[e.group]} stroke="var(--card)" strokeWidth={2} />
                {!narrow && (
                  <text
                    x={left ? cx - 13 : cx + 13}
                    y={cy}
                    dominantBaseline="middle"
                    textAnchor={left ? 'end' : 'start'}
                    className={cn('text-[13px] transition-colors', on ? 'fill-foreground font-semibold' : 'fill-foreground/80 font-medium')}
                  >
                    <tspan className="fill-muted-foreground font-mono text-[11px]">{String(i + 1).padStart(2, '0')} </tspan>
                    {e.title}
                  </text>
                )}
                {narrow && (
                  <text x={cx} y={cy - 12} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                    {String(i + 1).padStart(2, '0')}
                  </text>
                )}
              </a>
            )
          })}
        </svg>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 px-6 pb-4 text-xs text-muted-foreground">
        {GROUPS.map((g) => (
          <li key={g} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: GROUP_COLOR[g] }} />
            {GROUP_LABELS[g]}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Cards ──────────────────────────────────────────────────────────────────

export function ExperimentCard({
  e,
  n,
  active = false,
  onActive = () => {},
}: {
  e: Experiment
  n: number
  active?: boolean
  onActive?: (id: string | null) => void
}) {
  const Icon = e.icon
  const Pulse = PULSES[e.id]
  return (
    <a
      href={href(e.path)}
      onPointerEnter={() => onActive(e.id)}
      onPointerLeave={() => onActive(null)}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className={cn('h-full gap-4 px-6 transition-shadow group-hover:shadow-elevation-2', active && 'shadow-elevation-2 ring-primary/40')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
              <Icon className="size-4" />
            </div>
            <div>
              <div className="font-mono text-[11px] text-muted-foreground">Experiment {String(n).padStart(2, '0')}</div>
              <div className="font-semibold">{e.title}</div>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <div className="min-h-14 border-y py-3">{Pulse ? <Pulse /> : null}</div>
        <p className="text-sm">{e.thesis}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">Gives up: </span>
          {e.tradeoff}
        </p>
        <div className="mt-auto font-mono text-[11px] text-muted-foreground">{e.source}</div>
      </Card>
    </a>
  )
}

/** One live reading per experiment. */
function Reading({ value, caption, loading }: { value: ReactNode; caption: ReactNode; loading?: boolean }) {
  return (
    <div className={cn('flex items-baseline gap-2 transition-opacity', loading && 'opacity-40')}>
      <span className="shrink-0 text-2xl font-semibold tracking-tight">{loading ? '···' : value}</span>
      <span className="min-w-0 truncate text-xs text-muted-foreground">{caption}</span>
    </div>
  )
}

const NYC = CITIES[0]
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

function useCarbonNow() {
  return useLiveData<{ forecast: number; actual: number | null; index: string }>(`${CARBON_BASE}/intensity`, {
    key: 'atlas:carbon',
    parse: (r) => r.data[0].intensity,
  })
}
function useIndicators() {
  return useLiveData<WorldIndicators>(WORLD_INDICATORS, { key: 'atlas:indicators' })
}

const PULSES: Record<string, () => ReactNode> = {
  forecast: () => {
    const d = useWeather(NYC)
    return (
      <Reading
        loading={!d.data}
        value={d.data ? `${Math.round(d.data.current.temp)}°C` : ''}
        caption={d.data ? `in New York, feels like ${Math.round(d.data.current.feels)}°C` : ''}
      />
    )
  },
  attention: () => {
    const d = useWikiLatest()
    const top = d.data?.articles[0]
    return <Reading loading={!d.data && !d.error} value={top ? `${(top.views / 1000).toFixed(0)}K` : '—'} caption={top ? `reads of “${top.title}”, the day’s top article` : 'not published yet'} />
  },
  terminal: () => {
    const d = useQuakesDay()
    const max = d.data?.reduce((m, q) => Math.max(m, q.mag), 0)
    return <Reading loading={!d.data} value={d.data?.length.toLocaleString('en-US')} caption={d.data ? `quakes of any size in 24h, max M${max!.toFixed(1)}` : ''} />
  },
  ask: () => <Reading value={<span className="font-mono text-lg">›_</span>} caption={<span className="font-mono">quakes japan 7d · co2 1990 · grid now</span>} />,
  specimen: () => {
    const d = useIndicators()
    const n = d.data?.countries.filter((c) => latest(c, 'SP.POP.TOTL')).length
    return <Reading loading={!d.data} value={n} caption="country names, each set in its own weight" />
  },
  wire: () => <Reading value="live" caption="every edit to every Wikipedia, as it happens" />,
  chart: () => {
    const d = useWikiLatest()
    const top = d.data?.articles[0]
    return <Reading loading={!d.data && !d.error} value="#1" caption={top ? top.title : '—'} />
  },
  inbox: () => {
    const d = useQuakesDay()
    const n = d.data?.filter((q) => q.mag >= 5).length
    return <Reading loading={!d.data} value={n} caption="quakes of M5+ in 24h, each one a message" />
  },
  diff: () => {
    const now = useNow(30_000)
    const last = Number(prefs.getItem('diff.lastSeen')) || 0
    return <Reading value={last ? timeAgo(last, now) : 'first visit'} caption={last ? 'since you last opened Diff' : 'open it twice to see a diff'} />
  },
  almanac: () => {
    const d = useWeather(NYC)
    const i = d.data ? d.data.daily.time.indexOf(d.data.current.time.slice(0, 10)) : -1
    return (
      <Reading
        loading={!d.data}
        value={d.data && i >= 0 ? fmtTime(d.data.daily.sunset[i]) : ''}
        caption={d.data && i >= 0 ? `sunset in New York, after ${(d.data.daily.daylight[i] / 3600).toFixed(1)}h of daylight` : ''}
      />
    )
  },
  departures: () => {
    const d = useLaunchesUpcoming()
    const now = useNow(30_000)
    const next = d.data?.find((l) => l.net > now)
    const hrs = next ? (next.net - now) / 3600_000 : 0
    return (
      <Reading
        loading={!d.data && !d.error}
        value={next ? (hrs < 48 ? `T−${Math.floor(hrs)}h` : `${Math.round(hrs / 24)}d`) : '—'}
        caption={next ? `next launch: ${next.rocket}, ${next.mission}` : 'launch feed unavailable'}
      />
    )
  },
  pages: () => {
    const d = useCarbonNow()
    const v = d.data ? (d.data.actual ?? d.data.forecast) : undefined
    return <Reading loading={v === undefined} value={<span className="font-mono">P302</span>} caption={v !== undefined ? `GB grid: ${v} gCO₂/kWh, ${d.data!.index}` : ''} />
  },
  'box-score': () => {
    const day = useGenerationDay()
    const now = useGenerationNow()
    const totals = new Map<string, number>()
    day.data?.forEach((s) => s.mix.forEach((f) => totals.set(f.fuel, (totals.get(f.fuel) ?? 0) + f.perc / day.data!.length)))
    const mvp = [...totals].sort((a, b) => b[1] - a[1])[0]
    return <Reading loading={!day.data || !now.data} value={mvp ? `${mvp[1].toFixed(0)}%` : ''} caption={mvp ? `MVP of the last 24h: ${mvp[0]}` : ''} />
  },
  ledger: () => {
    const d = useIndicators()
    return <Reading loading={!d.data} value={d.data ? `${d.data.countries.length} × ${Object.keys(d.data.indicators).length}` : ''} caption="countries by indicators, every cell a mark" />
  },
  'grid-clock': () => {
    const d = useCarbonNow()
    const v = d.data ? (d.data.actual ?? d.data.forecast) : undefined
    return <Reading loading={v === undefined} value={v} caption={d.data ? `gCO₂/kWh on the GB grid, ${d.data.index}` : ''} />
  },
  lifelines: () => {
    const d = useLiveData<LifeData>(LIFE_EXPECTANCY, { key: 'atlas:life' })
    const years = d.data ? Object.keys(d.data.world).sort() : []
    const last = years.at(-1)
    const gain = d.data && last ? d.data.world[last] - d.data.world[years[0]] : 0
    return (
      <Reading
        loading={!d.data}
        value={d.data && last ? d.data.world[last].toFixed(1) : ''}
        caption={d.data ? `years, world life expectancy ${last}; +${gain.toFixed(0)} since ${years[0]}` : ''}
      />
    )
  },
}

