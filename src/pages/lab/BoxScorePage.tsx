import { useMemo, useState, type ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Segmented } from '@/components/ui/segmented'
import { LineChart } from '@/features/lab/ask/charts'
import { signed } from '@/features/lab/ask/format'
import { buildGame, FUEL_LABEL, pct, teamOf, ukDateLong, ukDayStart, ukHm, useBoxData, type Game, type Player, type Team } from '@/features/lab/boxscore/model'
import { MvpLine, Story, mvpOf } from '@/features/lab/boxscore/story'
import { experiment } from '@/features/lab/catalog'
import { useRegions } from '@/features/lab/feeds'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import type { CarbonRegion } from '@/features/lab/sources'
import { useNow } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

/*
 * Box Score: the GB grid's day set like the sports page. Teams are
 * low-carbon / fossil / imports, players are fuels, periods are six-hour
 * blocks of the UK day. Yesterday is the final; today is live. Agate-size
 * tables, hairline rules, bold section heads, and a game story written
 * from the numbers.
 */

const EXP = experiment('box-score')
type Which = 'final' | 'live'

export function BoxScorePage() {
  const now = useNow(60_000)
  const { gen, int } = useBoxData(now)
  const regions = useRegions()
  const [which, setWhich] = useState<Which>('final')

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader
          eyebrow="Experiment"
          title={EXP.title}
          description={EXP.thesis}
          actions={
            <Segmented<Which>
              aria-label="Which day"
              value={which}
              onChange={setWhich}
              options={[
                { value: 'final', label: 'Yesterday · Final' },
                { value: 'live', label: 'Today · Live' },
              ]}
            />
          }
        />
        <SourceLine source="NESO Carbon Intensity API" href="https://carbonintensity.org.uk/" feeds={[gen, int, regions]} />
      </div>
      <LoadGate feeds={[gen, int]} label="Getting the box score">
        {() => <Sheet which={which} now={now} gen={gen.data!} int={int.data!} regions={regions.data} />}
      </LoadGate>
    </div>
  )
}

function Sheet({ which, now, gen, int, regions }: { which: Which; now: number; gen: Parameters<typeof buildGame>[0]; int: Parameters<typeof buildGame>[1]; regions?: CarbonRegion[] }) {
  const game = useMemo(() => {
    const today = ukDayStart(now)
    return buildGame(gen, int, which === 'live' ? today : ukDayStart(today - 1), now)
  }, [gen, int, which, now])
  if (!game) return <p className="text-sm text-muted-foreground">No generation data for that day yet.</p>
  const mvp = mvpOf(game)
  return (
    <div className="flex flex-col gap-8">
      <Scoreboard g={game} />
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <section>
            <Head>Line score</Head>
            <LineScore g={game} />
          </section>
          <section>
            <Head right={game.live ? 'so far today' : undefined}>Box score</Head>
            <PlayerBox g={game} mvp={mvp.fuel} />
          </section>
          <section>
            <Head right="right now">Standings</Head>
            {regions ? <Standings regions={regions} /> : <p className="text-xs text-muted-foreground">Loading regions…</p>}
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <section className="border-l-2 border-foreground pl-4">
            <div className="mb-1 text-[11px] font-bold tracking-[0.12em] uppercase">Player of the day</div>
            <div className="text-sm leading-relaxed text-foreground/90">
              <MvpLine g={game} />
            </div>
          </section>
          <section>
            <Head>Game story</Head>
            <Story g={game} />
          </section>
          <section>
            <Head right="gCO₂/kWh, half-hourly">Scoring</Head>
            <Scoring g={game} />
          </section>
        </div>
      </div>
      <Notes />
    </div>
  )
}

function Head({ children, right }: { children: ReactNode; right?: string }) {
  return (
    <h2 className="mb-2 flex items-baseline justify-between gap-3 border-b-2 border-foreground pb-1 text-xs font-bold tracking-[0.12em] uppercase">
      <span>{children}</span>
      {right && <span className="text-[10px] font-medium tracking-normal text-muted-foreground normal-case">{right}</span>}
    </h2>
  )
}

function Scoreboard({ g }: { g: Game }) {
  return (
    <div className="border-y-2 border-foreground py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium">
          {ukDateLong(g.start)} · Great Britain
        </span>
        {g.live ? (
          <span className="inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-bold tracking-[0.12em] uppercase">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-foreground" />
            Live · {['1st', '2nd', '3rd', '4th'][g.period]} period
          </span>
        ) : (
          <span className="rounded-sm bg-foreground px-1.5 py-0.5 font-bold tracking-[0.12em] text-background uppercase">Final</span>
        )}
      </div>
      <div className="grid grid-cols-3 divide-x">
        {g.teams.map((t, i) => {
          const leader = g.teams.every((o) => o.avg <= t.avg)
          return (
            <div key={t.key} className={cn('flex flex-col gap-1', i > 0 && 'pl-4 sm:pl-6', i < 2 && 'pr-4 sm:pr-6')}>
              <span className="truncate text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                <span className="sm:hidden">{t.code}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </span>
              <span className={cn('text-4xl tracking-tight sm:text-5xl', leader ? 'font-bold' : 'font-medium text-foreground/70')}>{t.avg.toFixed(0)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t.vsPrev === null ? '' : signed(t.vsPrev)}
                {t.vsPrev !== null && <span className="hidden sm:inline"> vs day before</span>}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Average share of GB electricity generation, %<span className="sm:hidden">; ± vs the day before. LC low-carbon, FOS fossil, IMP imports</span>. {g.live ? `Through ${ukHm(g.slots.at(-1)!.from + 30 * 60_000)} UK.` : ''}</p>
    </div>
  )
}

const th = 'px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase'
const td = 'px-2 py-1 tabular-nums'

function LineScore({ g }: { g: Game }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className={cn(th, 'text-left')}>Team</th>
            {g.periodLabels.map((l, i) => (
              <th key={l} title={`${l} UK time`} className={cn(th, 'text-right whitespace-nowrap', g.live && i === g.period && 'text-foreground')}>
                <span className="sm:hidden">{i + 1}</span>
                <span className="hidden sm:inline">{l}</span>
              </th>
            ))}
            <th className={cn(th, 'border-l text-right text-foreground')}>{g.live ? 'Now' : 'Final'}</th>
          </tr>
        </thead>
        <tbody>
          {g.teams.map((t) => (
            <tr key={t.key} className="border-b">
              <td className={cn(td, 'font-semibold whitespace-nowrap')}>
                <span className="hidden sm:inline">{t.label} </span>
                <span className="font-normal text-muted-foreground max-sm:font-semibold max-sm:text-foreground">{t.code}</span>
              </td>
              {t.periods.map((p, i) => (
                <td key={i} className={cn(td, 'text-right', p === null && 'text-muted-foreground')}>
                  {p === null ? '–' : pct(p)}
                </td>
              ))}
              <td className={cn(td, 'border-l text-right font-bold')}>{pct(t.avg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Spark({ data, hiAt }: { data: number[]; hiAt?: number }) {
  const w = 72
  const h = 16
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, h - 2 - (v / max) * (h - 4)] as const)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
  const hi = hiAt ?? data.indexOf(max)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-4 w-[72px] text-foreground/70" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" />
      {pts[hi] && <circle cx={pts[hi][0]} cy={pts[hi][1]} r={1.75} fill="currentColor" />}
    </svg>
  )
}

function PlayerBox({ g, mvp }: { g: Game; mvp: string }) {
  const active = g.players.filter((p) => !p.dnp)
  const dnp = g.players.filter((p) => p.dnp)
  const row = (p: Player | Team, kind: 'player' | 'team') => {
    const isTeam = kind === 'team'
    const label = isTeam ? `${(p as Team).label} total` : FUEL_LABEL[(p as Player).fuel]
    const code = isTeam ? '' : teamOf((p as Player).fuel).code
    const min = isTeam ? null : (p as Player).min
    return (
      <tr key={label} className={cn('border-b', isTeam && 'border-t border-t-foreground/40 font-semibold')}>
        <td className={cn(td, 'whitespace-nowrap')}>
          {label}
          {!isTeam && <span className="ml-1.5 hidden text-[10px] text-muted-foreground sm:inline">{code}</span>}
          {!isTeam && (p as Player).fuel === mvp && <span className="ml-1.5 text-[10px] font-bold tracking-wider">MVP</span>}
        </td>
        <td className={cn(td, 'hidden text-right sm:table-cell')}>{min === null ? '' : min.toFixed(1)}</td>
        <td className={cn(td, 'text-right font-semibold')}>{pct(p.avg)}</td>
        <td className={cn(td, 'text-right')}>
          {pct(p.high)} <span className="hidden text-[10px] text-muted-foreground md:inline">{ukHm(p.highAt)}</span>
        </td>
        <td className={cn(td, 'text-right')}>{pct(p.low)}</td>
        <td className={cn(td, 'text-right')}>{p.vsPrev === null ? '–' : signed(p.vsPrev)}</td>
        <td className={cn(td, 'hidden pl-3 sm:table-cell')}>
          <Spark data={p.spark} />
        </td>
      </tr>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className={cn(th, 'text-left')}>Fuel</th>
            <th className={cn(th, 'hidden text-right sm:table-cell')} title="Hours with more than 0.5% share">
              Min
            </th>
            <th className={cn(th, 'text-right')}>Avg</th>
            <th className={cn(th, 'text-right')}>High</th>
            <th className={cn(th, 'text-right')}>Low</th>
            <th className={cn(th, 'text-right')} title="Change in average share, percentage points">
              ±
            </th>
            <th className={cn(th, 'hidden pl-3 text-left sm:table-cell')}>24h</th>
          </tr>
        </thead>
        <tbody>
          {active.map((p) => row(p, 'player'))}
          {g.teams.map((t) => row(t, 'team'))}
        </tbody>
      </table>
      {dnp.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {dnp.map((p, i) => (
            <span key={p.fuel}>
              {i > 0 && '; '}
              <span className="font-medium text-foreground/80">{FUEL_LABEL[p.fuel]}</span> — DNP, did not play
            </span>
          ))}
          .
        </p>
      )}
    </div>
  )
}

function Scoring({ g }: { g: Game }) {
  if (g.intensity.length < 2) return <p className="text-xs text-muted-foreground">Not enough readings yet.</p>
  const mn = g.intensity.reduce((m, x) => (x.v < m.v ? x : m))
  const mx = g.intensity.reduce((m, x) => (x.v > m.v ? x : m))
  return (
    <LineChart
      height={150}
      series={[{ key: 'i', label: 'Carbon intensity', color: 'var(--series-1)', area: true, points: g.intensity.map((s) => ({ x: s.mid, y: s.v })) }]}
      xFormat={ukHm}
      xTicks={[1, 2, 3].map((i) => g.start + i * 6 * 3600_000)}
      tipTitle={(t) => `${ukHm(t)} UK`}
      yFormat={(v) => `${Math.round(v)}`}
      yZero
      marks={[
        { x: mn.mid, y: mn.v, label: `low ${mn.v}` },
        { x: mx.mid, y: mx.v, label: `high ${mx.v}` },
      ]}
    />
  )
}

function indexTone(i: string) {
  if (i === 'very low' || i === 'low') return 'bg-success'
  if (i === 'moderate') return 'bg-muted-foreground'
  if (i === 'high') return 'bg-warning'
  return 'bg-destructive'
}

function Standings({ regions }: { regions: CarbonRegion[] }) {
  const rows = regions.filter((r) => r.id <= 14).sort((a, b) => a.forecast - b.forecast)
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b">
          <th className={cn(th, 'w-6 text-right')}>Rk</th>
          <th className={cn(th, 'text-left')}>Region</th>
          <th className={cn(th, 'text-right')}>g/kWh</th>
          <th className={cn(th, 'text-left')}>Index</th>
          <th className={cn(th, 'hidden text-left sm:table-cell')}>Leading</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const lead = [...r.mix].sort((a, b) => b.perc - a.perc)[0]
          return (
            <tr key={r.id} className="border-b">
              <td className={cn(td, 'text-right text-muted-foreground')}>{i + 1}</td>
              <td className={cn(td, 'font-medium sm:whitespace-nowrap')}>{r.name}</td>
              <td className={cn(td, 'text-right font-semibold')}>{r.forecast}</td>
              <td className={cn(td, 'whitespace-nowrap')}>
                <span aria-hidden className={cn('mr-1.5 inline-block size-1.5 rounded-full align-middle', indexTone(r.index))} />
                {r.index}
              </td>
              <td className={cn(td, 'hidden whitespace-nowrap text-muted-foreground sm:table-cell')}>
                {lead ? `${lead.fuel} ${pct(lead.perc)}%` : '–'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Notes() {
  return (
    <footer className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground/80">Notes.</span> Shares are of electricity generated for the GB grid, half-hourly, from NESO’s Carbon Intensity API. A
        game is one UK calendar day, 00:00–24:00 London time; periods are its four six-hour blocks. <span className="font-medium text-foreground/80">Min</span> is hours on the
        field: half hours with more than 0.5% share, divided by two. <span className="font-medium text-foreground/80">±</span> is the change in average share from the day before,
        in percentage points. Teams: low-carbon is wind, nuclear, solar, hydro and biomass (biomass is counted as low-carbon here, though burning it emits CO₂); fossil is gas, coal and “other”, mostly small oil and thermal plants; imports are interconnector flows. DNP: a fuel that never reached 0.05%.
        Standings rank the 14 regional networks by their current forecast intensity.
      </p>
    </footer>
  )
}
