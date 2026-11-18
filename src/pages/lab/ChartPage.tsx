import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, LoaderCircle } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { ChartTable, Movement, Spark } from '@/features/lab/chart/ChartTable'
import { buildChart, compact, periodLabel, toDayList, utcDate, wikiHref, type Chart, type ChartRow, type DayList, type Mode } from '@/features/lab/chart/model'
import { useSummary } from '@/features/lab/chart/useSummary'
import { experiment } from '@/features/lab/catalog'
import { useWikiDay } from '@/features/lab/feeds'
import { SourceLine } from '@/features/lab/LabKit'
import { cn } from '@/lib/utils'

/*
 * The Chart: English Wikipedia as a weekly hit chart. Fourteen daily top-1000
 * lists become two weeks; each article's position, movement, peak and days
 * on the chart come from them. The #1 gets a feature; the risers, fallers and
 * drop-outs get callouts.
 */

const EXP = experiment('chart')
const WINDOW = 14
const DAY = 86_400_000
type Size = '10' | '40' | '100'

/** Fifteen fixed hook calls: days 1–15 ago. If yesterday isn't published yet, the window shifts back a day. */
function useWindow() {
  const feeds = Array.from({ length: WINDOW + 1 }, (_, i) => useWikiDay(i + 1))
  const first = feeds[0]
  const firstSettled = first.data !== undefined || !!first.error
  const offset = first.data === undefined && first.error ? 1 : 0
  const win = feeds.slice(offset, offset + WINDOW)
  const settled = firstSettled && win.every((f) => f.data !== undefined || !!f.error)
  const loaded = win.filter((f) => f.data).length
  const days: (DayList | null)[] | null = useMemo(() => {
    if (!settled) return null
    return win.map((f, i) => (f.data ? toDayList(new Date(Date.now() - (offset + i + 1) * DAY), f.data) : null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, offset, ...win.map((f) => f.data)])
  return { feeds: win, days, loaded, settled }
}

export function ChartPage() {
  const { feeds, days, loaded, settled } = useWindow()
  const [mode, setMode] = useState<Mode>('weekly')
  const [size, setSize] = useState<Size>('40')
  const chart = useMemo(() => (days ? buildChart(days, mode) : null), [days, mode])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />
        {/* Days Wikimedia never published (404) are gaps, not feed errors. */}
        <SourceLine source={EXP.source} href="https://wikimedia.org/api/rest_v1/" feeds={settled ? feeds.filter((f) => f.data) : feeds} />
      </div>

      {!settled ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          <div>
            Tallying {loaded} of {WINDOW} daily charts…
          </div>
        </div>
      ) : !chart ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          Not enough published days to compile a chart ({loaded} of {WINDOW} loaded). Try again later.
        </div>
      ) : (
        <Body chart={chart} mode={mode} setMode={setMode} size={size} setSize={setSize} />
      )}
    </div>
  )
}

function Body({
  chart,
  mode,
  setMode,
  size,
  setSize,
}: {
  chart: Chart
  mode: Mode
  setMode: (m: Mode) => void
  size: Size
  setSize: (s: Size) => void
}) {
  const rows = chart.rows.slice(0, Number(size))
  const [selected, setSelected] = useState<number | null>(null)
  const periodWord = mode === 'weekly' ? 'this week' : 'that day'
  const lastLabel = mode === 'weekly' ? 'last week' : 'the day before'

  // j/k (or arrows) walk the chart, Enter opens the selected article.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [role="radiogroup"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault()
        setSelected((s) => {
          const next = Math.max(1, Math.min(rows.length, (s ?? 0) + (e.key === 'j' ? 1 : -1)))
          document.getElementById(`chart-row-${next}`)?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'Enter' && selected) {
        const r = rows[selected - 1]
        if (r) window.open(wikiHref(r.article), '_blank', 'noopener')
      } else if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, selected])

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Mode>
          aria-label="Chart period"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'daily', label: 'Daily' },
          ]}
        />
        <Segmented<Size>
          aria-label="Chart length"
          value={size}
          onChange={setSize}
          options={[
            { value: '10', label: 'Top 10' },
            { value: '40', label: 'Top 40' },
            { value: '100', label: 'Top 100' },
          ]}
        />
        <div className="text-sm text-muted-foreground sm:ml-auto">
          <span className="font-medium text-foreground">{periodLabel(chart.current)}</span>
          <span> vs {periodLabel(chart.previous)} · UTC</span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <NumberOne row={chart.rows[0]} next={chart.rows[1]} chart={chart} mode={mode} />
        <Callouts chart={chart} mode={mode} />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <ChartTable rows={rows} periodStart={chart.periodStart} selected={selected} onSelect={setSelected} periodWord={periodWord} lastLabel={lastLabel} />
      </Card>
      <p className="-mt-4 text-xs text-muted-foreground">
        Readers are summed from each day’s top 1,000 list, so an article outside a day’s list counts zero that day. Peak and days on chart look at the
        daily top 100 across all {chart.days} days. Keys: <kbd className="font-mono">j</kbd>/<kbd className="font-mono">k</kbd> to move,{' '}
        <kbd className="font-mono">Enter</kbd> to open.
      </p>
    </>
  )
}

function NumberOne({ row, next, chart, mode }: { row: ChartRow; next: ChartRow | undefined; chart: Chart; mode: Mode }) {
  const summary = useSummary(row.article, true, true)
  const periodWord = mode === 'weekly' ? 'this week' : utcDate(chart.current.to, { weekday: 'long' })
  const ratio = next ? row.views / next.views : 1
  const lead =
    row.move === 'new'
      ? 'a debut straight at the top'
      : row.move === 'reentry'
        ? 'back on the chart and straight to No. 1'
        : row.move === 'same'
          ? `holding at No. 1`
          : `up from No. ${row.last}`
  const reign =
    row.daysAtOne === 0
      ? `It never topped a single day’s list: it won on staying power, ${row.daysOn} days in the top 100.`
      : `It led the daily list on ${row.daysAtOne} of the last ${chart.days} days${row.daysOn > row.daysAtOne ? ` and has been in the top 100 for ${row.daysOn}` : ''}.`
  return (
    <Card className="gap-5 px-6 sm:flex-row">
      <div className="shrink-0">
        {summary?.thumb ? (
          <img src={summary.thumb} alt="" className="size-28 rounded-lg object-cover ring-1 ring-foreground/10 sm:size-36" />
        ) : (
          <div className="flex size-28 items-center justify-center rounded-lg bg-muted text-6xl font-semibold text-muted-foreground sm:size-36">1</div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">No. 1 {periodWord}</div>
        <a
          href={wikiHref(row.article)}
          target="_blank"
          rel="noreferrer"
          className="text-3xl leading-tight font-semibold tracking-tight underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {row.title}
        </a>
        <div className="text-sm text-muted-foreground">{summary === undefined ? '…' : (summary?.description ?? 'Wikipedia article')}</div>
        <p className="text-sm leading-relaxed">
          <span className="font-semibold tabular-nums">{compact(row.views)}</span> readers {mode === 'weekly' ? 'this week' : 'that day'}
          {next && (
            <>
              , <span className="font-semibold tabular-nums">{ratio.toFixed(1)}×</span> the No. 2, {next.title}
            </>
          )}
          ; {lead}. {reign}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground">
          <Spark values={row.spark} periodStart={chart.periodStart} />
          <span>last {chart.days} days, this {mode === 'weekly' ? 'week' : 'day'} shaded</span>
          <a href={wikiHref(row.article)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
            Read the article <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </Card>
  )
}

function Callouts({ chart, mode }: { chart: Chart; mode: Mode }) {
  const debut = chart.rows.find((r) => r.move === 'new')
  const gainer = chart.rows.filter((r) => r.move === 'up').sort((a, b) => b.delta - a.delta)[0]
  const faller = chart.rows.filter((r) => r.move === 'down').sort((a, b) => a.delta - b.delta)[0]
  const span = mode === 'weekly' ? 'last week' : 'the day before'
  return (
    <Card className="gap-0 px-6 py-4">
      <ul className="divide-y">
        {debut && (
          <Callout label="Hot debut" row={debut}>
            enters at No. {debut.pos} with {compact(debut.views)} readers
          </Callout>
        )}
        {gainer && (
          <Callout label="Biggest gainer" row={gainer}>
            <Movement row={gainer} /> to No. {gainer.pos}, from No. {gainer.last}
          </Callout>
        )}
        {faller && (
          <Callout label="Biggest faller" row={faller}>
            <Movement row={faller} /> to No. {faller.pos}, from No. {faller.last}
          </Callout>
        )}
        {chart.fellOff.length > 0 && (
          <li className="py-3 last:pb-0">
            <div className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              Fell off the chart <span className="normal-case">· top 40 {span}, out of the top 100 now</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed">
              {chart.fellOff.slice(0, 8).map((f, i, arr) => (
                <span key={f.article}>
                  <a href={wikiHref(f.article)} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                    {f.title}
                  </a>{' '}
                  <span className="text-muted-foreground tabular-nums">(was {f.last})</span>
                  {i < arr.length - 1 ? ', ' : chart.fellOff.length > arr.length ? `, and ${chart.fellOff.length - arr.length} more` : ''}
                </span>
              ))}
            </p>
          </li>
        )}
      </ul>
    </Card>
  )
}

function Callout({ label, row, children }: { label: string; row: ChartRow; children: React.ReactNode }) {
  return (
    <li className={cn('py-3 first:pt-0')}>
      <div className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{label}</div>
      <a href={wikiHref(row.article)} target="_blank" rel="noreferrer" className="mt-0.5 block truncate font-semibold underline-offset-2 hover:underline">
        {row.title}
      </a>
      <div className="flex flex-wrap items-baseline gap-x-1 text-sm text-muted-foreground">{children}</div>
    </li>
  )
}
