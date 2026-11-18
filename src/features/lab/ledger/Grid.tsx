import { memo, useMemo } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'

import { cn } from '@/lib/utils'

import { COLUMNS, regionLabel, type Cell, type Column, type Ledger, type LedgerRow } from './model'

/**
 * The grid: a real <table> with a frozen header row and a frozen country
 * column. Rows are memoized on (row, active column, selected column span),
 * so moving the cursor re-renders at most the two rows it leaves and enters.
 */

export type Mark = 'bar' | 'trend' | 'rank'
export type Sort = { col: number | 'name'; dir: 'asc' | 'desc' }

export type DisplayItem = { kind: 'row'; row: LedgerRow; index: number } | { kind: 'group'; region: string; medians: (number | null)[]; count: number }

export const cellId = (iso3: string, c: number) => `ledger-cell-${iso3}-${c}`

const COL_W = 'w-[132px] min-w-[132px]'
const FIRST_W = 'w-[150px] min-w-[150px] sm:w-[232px] sm:min-w-[232px]'

function Histogram({ values, col, mark }: { values: number[]; col: Column; mark: number | null }) {
  const w = 104
  const h = 16
  const bins = 18
  const t = (v: number) => (col.log ? Math.log10(Math.max(v, 1e-3)) : v)
  const { counts, lo, hi } = useMemo(() => {
    const tv = values.map(t)
    const lo = Math.min(...tv)
    const hi = Math.max(...tv)
    const counts = new Array(bins).fill(0)
    for (const v of tv) counts[Math.min(bins - 1, Math.floor(((v - lo) / (hi - lo || 1)) * bins))]++
    return { counts, lo, hi }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, col.log])
  const max = Math.max(...counts)
  const bw = w / bins
  const mx = mark === null ? null : ((t(mark) - lo) / (hi - lo || 1)) * w
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-4 w-[104px]" aria-hidden>
      {counts.map((c, i) => (
        <rect key={i} x={i * bw + 0.5} width={bw - 1} y={h - (c / max) * (h - 2)} height={(c / max) * (h - 2)} rx={0.5} fill="var(--muted-foreground)" opacity={0.35} />
      ))}
      {mx !== null && <line x1={mx} x2={mx} y1={0} y2={h} stroke="var(--foreground)" strokeWidth={1.5} />}
    </svg>
  )
}

export function HeaderRow({
  ledger,
  sort,
  onSort,
  activeCol,
  activeRow,
}: {
  ledger: Ledger
  sort: Sort
  onSort: (col: number | 'name') => void
  activeCol: number
  activeRow: LedgerRow | null
}) {
  const arrow = (col: number | 'name') =>
    sort.col === col ? sort.dir === 'asc' ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden /> : null
  return (
    <tr>
      <th
        scope="col"
        aria-sort={sort.col === 'name' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={cn(FIRST_W, 'sticky top-0 left-0 z-30 border-r border-b bg-muted px-3 py-2 text-left align-bottom')}
      >
        <button type="button" onClick={() => onSort('name')} className="flex items-center gap-1 rounded-sm text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="font-mono font-normal text-muted-foreground">A</span> Country {arrow('name')}
        </button>
        <div className="mt-1 text-[11px] text-muted-foreground">{ledger.rows.length} economies</div>
      </th>
      {COLUMNS.map((col, ci) => (
        <th
          key={col.code}
          scope="col"
          aria-sort={sort.col === ci ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
          className={cn(COL_W, 'sticky top-0 z-20 border-r border-b bg-muted px-3 py-2 text-right align-bottom', activeCol === ci && 'bg-accent')}
        >
          <button
            type="button"
            onClick={() => onSort(ci)}
            className="ml-auto flex items-center justify-end gap-1 rounded-sm text-xs font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={`Sort by ${col.short} (s)`}
          >
            <span className="font-mono font-normal text-muted-foreground">{col.letter}</span>
            {col.short}
            {arrow(ci)}
          </button>
          <div className="text-[11px] font-normal whitespace-nowrap text-muted-foreground">{col.unit}</div>
          <div className="flex justify-end">
            <Histogram values={ledger.values[ci]} col={col} mark={activeRow?.cells[ci].value ?? null} />
          </div>
        </th>
      ))}
    </tr>
  )
}

function MarkView({ cell, mark }: { cell: Cell; mark: Mark }) {
  if (cell.value === null) return <span className="w-10" />
  if (mark === 'rank') return <span className="w-10 text-left font-mono text-[11px] text-muted-foreground">#{cell.rank}</span>
  if (mark === 'trend')
    return cell.trend ? (
      <svg viewBox="0 0 40 14" className="h-3.5 w-10 shrink-0" aria-hidden>
        <path d={cell.trend} fill="none" stroke="var(--series-1)" strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={cell.trendEnd![0]} cy={cell.trendEnd![1]} r={1.75} fill="var(--series-1)" />
      </svg>
    ) : (
      <span className="w-10" />
    )
  return (
    <span className="relative h-[3px] w-10 shrink-0 rounded-full bg-muted" aria-hidden>
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(4, (cell.pct ?? 0) * 100)}%`, background: 'var(--series-1)' }} />
    </span>
  )
}

interface RowProps {
  row: LedgerRow
  num: number
  mark: Mark
  maxYear: number[]
  /** column of the cursor if it's on this row, else -1 */
  activeCol: number
  /** selected column span on this row, [-1,-1] if none */
  selFrom: number
  selTo: number
  onCell: (iso3: string, c: number, extend: boolean) => void
  onOpen: (iso3: string) => void
}

export const Row = memo(function Row({ row, num, mark, maxYear, activeCol, selFrom, selTo, onCell, onOpen }: RowProps) {
  const isActive = activeCol >= 0
  return (
    <tr role="row" aria-rowindex={num + 1} className="group">
      <th
        scope="row"
        className={cn(
          FIRST_W,
          'sticky left-0 z-10 border-r border-b bg-card px-3 py-1.5 text-left font-normal',
          isActive && 'bg-accent text-accent-foreground',
        )}
      >
        <button type="button" tabIndex={-1} onClick={() => onOpen(row.iso3)} className="flex w-full min-w-0 items-baseline gap-2 text-left">
          <span className="w-7 shrink-0 text-right font-mono text-[10px] text-muted-foreground tabular-nums">{num}</span>
          <span className={cn('truncate text-[13px]', isActive && 'font-semibold')}>{row.name}</span>
        </button>
      </th>
      {row.cells.map((cell, ci) => {
        const active = ci === activeCol
        const selected = ci >= selFrom && ci <= selTo
        const stale = cell.year !== null && cell.year < maxYear[ci] - 1
        const col = COLUMNS[ci]
        return (
          <td
            key={ci}
            id={cellId(row.iso3, ci)}
            role="gridcell"
            aria-selected={selected}
            onMouseDown={(e) => {
              e.preventDefault()
              onCell(row.iso3, ci, e.shiftKey)
            }}
            onDoubleClick={() => onOpen(row.iso3)}
            title={cell.value === null ? `No World Bank data for ${row.name}` : `${col.full(cell.value)} (${cell.year}) · rank ${cell.rank}`}
            className={cn(
              COL_W,
              'relative scroll-mt-[76px] scroll-ml-[150px] sm:scroll-ml-[232px] border-r border-b px-3 py-1.5 text-right',
              selected && 'bg-primary/10',
              active && 'outline-2 -outline-offset-2 outline-primary',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <MarkView cell={cell} mark={mark} />
              {cell.value === null ? (
                <span className="text-[13px] text-muted-foreground">–</span>
              ) : (
                <span className="text-[13px] tabular-nums">
                  {col.fmt(cell.value)}
                  {stale && <sup className="ml-0.5 text-[9px] text-muted-foreground">’{String(cell.year).slice(2)}</sup>}
                </span>
              )}
            </div>
          </td>
        )
      })}
    </tr>
  )
})

export function GroupRow({ region, medians, count }: { region: string; medians: (number | null)[]; count: number }) {
  return (
    <tr role="row" className="bg-muted/70">
      <th scope="rowgroup" className={cn(FIRST_W, 'sticky left-0 z-10 border-r border-b bg-muted px-3 py-1.5 text-left')}>
        <div className="truncate text-xs font-semibold">{regionLabel(region)}</div>
        <div className="text-[10px] font-normal text-muted-foreground">median of {count}</div>
      </th>
      {medians.map((m, ci) => (
        <td key={ci} className={cn(COL_W, 'border-r border-b px-3 py-1.5 text-right text-xs font-medium text-muted-foreground tabular-nums')}>
          {m === null ? '–' : COLUMNS[ci].fmt(m)}
        </td>
      ))}
    </tr>
  )
}
