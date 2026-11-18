import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { COLUMNS, regionLabel, type Ledger, type LedgerRow } from './model'

/** One country, all ten indicators: value, rank and its line since 2000. */
export function DetailPanel({ row, ledger, onClose }: { row: LedgerRow; ledger: Ledger; onClose: () => void }) {
  return (
    <aside
      aria-label={`${row.name} details`}
      className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[24rem] flex-col border-l bg-card shadow-elevation-3"
    >
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight">{row.name}</div>
          <div className="text-xs text-muted-foreground">
            {regionLabel(row.region)} · {row.income}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close details (Esc)">
          <X />
        </Button>
      </div>
      <ul className="flex-1 divide-y overflow-y-auto">
        {COLUMNS.map((col, ci) => {
          const c = row.cells[ci]
          return (
            <li key={col.code} className="px-5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium">
                  <span className="mr-1 font-mono text-muted-foreground">{col.letter}</span>
                  {col.short}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{c.rank ? `#${c.rank} of ${ledger.counts[ci]}` : 'not ranked'}</span>
              </div>
              {c.value === null ? (
                <div className="mt-1 text-sm text-muted-foreground">No World Bank data.</div>
              ) : (
                <>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums">
                    {col.full(c.value)} <span className="font-normal text-muted-foreground">in {c.year}</span>
                  </div>
                  <Trend series={c.series} fmt={col.fmt} />
                </>
              )}
            </li>
          )
        })}
      </ul>
      <div className="border-t px-5 py-2 font-mono text-[11px] text-muted-foreground">↑↓ next country · Esc close</div>
    </aside>
  )
}

function Trend({ series, fmt }: { series: [number, number][]; fmt: (v: number) => string }) {
  if (series.length < 2) return null
  const w = 320
  const h = 40
  const pad = { l: 2, r: 2, t: 6, b: 6 }
  const x0 = series[0][0]
  const x1 = series.at(-1)![0]
  const vs = series.map((s) => s[1])
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const x = (yr: number) => pad.l + ((yr - x0) / (x1 - x0 || 1)) * (w - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b)
  const d = series.map(([yr, v], i) => `${i ? 'L' : 'M'}${x(yr).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const first = series[0]
  const last = series.at(-1)!
  return (
    <div className="mt-1.5">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
        <path d={`${d}L${x(last[0])},${h}L${x(first[0])},${h}Z`} fill="var(--series-1)" opacity={0.1} />
        <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>
          {first[0]}: {fmt(first[1])}
        </span>
        <span>
          {last[0]}: {fmt(last[1])}
        </span>
      </div>
    </div>
  )
}
