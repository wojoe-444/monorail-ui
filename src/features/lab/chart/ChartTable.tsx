import { memo } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { compact, wikiHref, type ChartRow } from './model'
import { useSeen, useSummary } from './useSummary'

/**
 * The chart itself: a real <table>, one row per position. Position is the
 * loudest thing on the row, then the title; everything else is metadata in
 * muted ink. Descriptions load as rows scroll into view.
 */

export function Movement({ row, compactForm = false }: { row: ChartRow; compactForm?: boolean }) {
  if (row.move === 'new') return <Badge variant="primary">NEW</Badge>
  if (row.move === 'reentry') return <Badge variant="outline">{compactForm ? 'RE' : 'RE-ENTRY'}</Badge>
  if (row.move === 'same') return <span className="text-muted-foreground" aria-label="No change">=</span>
  const up = row.move === 'up'
  return (
    <span className="inline-flex items-baseline gap-1 font-medium tabular-nums" aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(row.delta)}`}>
      <span aria-hidden className="text-[0.8em]" style={{ color: up ? 'var(--series-1)' : 'var(--series-2)' }}>
        {up ? '▲' : '▼'}
      </span>
      {Math.abs(row.delta)}
    </span>
  )
}

/** 14 days of daily views, with the current period washed. Gaps are days off the top 1,000. */
export function Spark({ values, periodStart, className }: { values: (number | null)[]; periodStart: number; className?: string }) {
  const w = 104
  const h = 26
  const max = Math.max(1, ...values.map((v) => v ?? 0))
  const x = (i: number) => 2 + (i / Math.max(1, values.length - 1)) * (w - 4)
  const y = (v: number) => h - 3 - (v / max) * (h - 6)
  const segs: string[] = []
  let cur = ''
  values.forEach((v, i) => {
    if (v === null) {
      if (cur) segs.push(cur)
      cur = ''
      return
    }
    cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
  })
  if (cur) segs.push(cur)
  const lastI = values.length - 1
  const last = values[lastI]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-[26px] w-[104px]', className)} aria-hidden>
      <rect x={x(periodStart) - 2} y={0} width={w - x(periodStart) + 2} height={h} rx={3} fill="var(--foreground)" opacity={0.045} />
      <line x1={0} x2={w} y1={h - 0.5} y2={h - 0.5} stroke="var(--chart-grid)" />
      {segs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--series-1)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {last !== null && <circle cx={x(lastI)} cy={y(last)} r={2.5} fill="var(--series-1)" stroke="var(--card)" strokeWidth={1.5} />}
    </svg>
  )
}

interface RowProps {
  row: ChartRow
  periodStart: number
  selected: boolean
  lastLabel: string
  onSelect: (pos: number) => void
}

const Row = memo(function Row({ row, periodStart, selected, lastLabel, onSelect }: RowProps) {
  const [ref, seen] = useSeen<HTMLTableRowElement>()
  const summary = useSummary(row.article, seen)
  const top3 = row.pos <= 3
  return (
    <tr
      ref={ref}
      id={`chart-row-${row.pos}`}
      aria-selected={selected}
      onClick={() => onSelect(row.pos)}
      className={cn('group border-b transition-colors last:border-0', selected ? 'bg-accent' : 'hover:bg-muted/50')}
    >
      <td className="w-14 py-3 pr-2 pl-4 align-top sm:w-20 sm:pl-6">
        <span className={cn('block font-semibold tracking-tight tabular-nums', top3 ? 'text-4xl leading-none' : 'text-2xl leading-tight')}>{row.pos}</span>
      </td>
      <td className="hidden w-24 py-3 pr-2 align-top text-sm md:table-cell">
        <span className={cn('inline-flex', top3 ? 'pt-2' : 'pt-1')}>
          <Movement row={row} />
        </span>
      </td>
      <td className="max-w-0 py-3 pr-4 align-top">
        <a
          href={wikiHref(row.article)}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'block truncate font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
            top3 ? 'pt-1 text-lg' : 'pt-0.5 text-[15px]',
          )}
        >
          {row.title}
        </a>
        <div className="truncate text-xs text-muted-foreground">
          {summary === undefined ? <span className="opacity-50">·</span> : (summary?.description ?? 'No description on Wikipedia')}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground md:hidden">
          <Movement row={row} compactForm />
          <span className="tabular-nums">{compact(row.views)} readers</span>
          <span className="tabular-nums">last {row.last && row.last <= 100 ? row.last : '–'}</span>
        </div>
      </td>
      <td className="hidden py-3 pr-4 text-right align-top text-sm text-muted-foreground tabular-nums md:table-cell">
        <span className="pt-1 inline-block" title={row.last ? `No. ${row.last} ${lastLabel}` : `Not ranked ${lastLabel}`}>
          {row.last && row.last <= 100 ? row.last : '–'}
        </span>
      </td>
      <td className="hidden py-3 pr-4 text-right align-top text-sm text-muted-foreground tabular-nums lg:table-cell">
        <span className="pt-1 inline-block">{row.peak ?? '–'}</span>
      </td>
      <td className="hidden py-3 pr-4 text-right align-top text-sm text-muted-foreground tabular-nums lg:table-cell">
        <span className="pt-1 inline-block">{row.daysOn}</span>
      </td>
      <td className="hidden py-3 pr-4 text-right align-top text-sm font-medium tabular-nums sm:table-cell">
        <span className="pt-1 inline-block">{compact(row.views)}</span>
      </td>
      <td className="hidden py-3 pr-6 align-top xl:table-cell">
        <Spark values={row.spark} periodStart={periodStart} className="mt-0.5" />
      </td>
    </tr>
  )
})

export function ChartTable({
  rows,
  periodStart,
  selected,
  onSelect,
  periodWord,
  lastLabel,
}: {
  rows: ChartRow[]
  periodStart: number
  selected: number | null
  onSelect: (pos: number) => void
  periodWord: string
  lastLabel: string
}) {
  const th = 'py-2 pr-4 text-right text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase'
  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">
        Top {rows.length} English Wikipedia articles by readers {periodWord}, with movement since {lastLabel}
      </caption>
      <colgroup>
        <col className="w-14 sm:w-20" />
        <col className="hidden w-24 md:table-column" />
        <col />
        <col className="hidden w-16 md:table-column" />
        <col className="hidden w-16 lg:table-column" />
        <col className="hidden w-20 lg:table-column" />
        <col className="hidden w-24 sm:table-column" />
        <col className="hidden w-[136px] xl:table-column" />
      </colgroup>
      <thead className="border-b">
        <tr>
          <th scope="col" className={cn(th, 'pl-4 text-left sm:pl-6')}>
            Pos
          </th>
          <th scope="col" className={cn(th, 'hidden text-left md:table-cell')}>
            Move
          </th>
          <th scope="col" className={cn(th, 'text-left')}>
            Article
          </th>
          <th scope="col" className={cn(th, 'hidden md:table-cell')} title={`Position ${lastLabel}`}>
            Last
          </th>
          <th scope="col" className={cn(th, 'hidden lg:table-cell')} title="Best daily rank in the last 14 days">
            Peak
          </th>
          <th scope="col" className={cn(th, 'hidden lg:table-cell')} title="Days in the daily top 100, last 14 days">
            Days on
          </th>
          <th scope="col" className={cn(th, 'hidden sm:table-cell')}>
            Readers
          </th>
          <th scope="col" className={cn(th, 'hidden pr-6 text-left xl:table-cell')}>
            14 days
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Row key={r.article} row={r} periodStart={periodStart} selected={selected === r.pos} lastLabel={lastLabel} onSelect={onSelect} />
        ))}
      </tbody>
    </table>
  )
}
