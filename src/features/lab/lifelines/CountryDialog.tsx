import { useMemo, useState, type PointerEvent } from 'react'
import { Table2 } from 'lucide-react'

import { ChartTooltipContent } from '@/components/charts/ChartTooltip'
import { Legend } from '@/components/charts/Legend'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FloatingTip } from '@/features/lab/LabKit'

import { linePath, useWidth, type Life, type Model } from './model'

const H = 300
const PAD = { top: 16, right: 12, bottom: 28, left: 32 }
const COLORS = { country: 'var(--series-1)', region: 'var(--series-2)', world: 'var(--series-other)' }

/** One country, large: its line against its region's median and the world, shocks annotated. */
export function CountryDialog({ life, model, onClose }: { life: Life | undefined; model: Model; onClose: () => void }) {
  return (
    <Dialog open={!!life} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">{life && <Detail life={life} model={model} />}</DialogContent>
    </Dialog>
  )
}

function Detail({ life, model }: { life: Life; model: Model }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const region = model.regionMedian.get(life.region)!
  const series = [
    { key: 'country', label: life.name, values: life.values, color: COLORS.country, w: 2 },
    { key: 'region', label: `${life.region} (median)`, values: region, color: COLORS.region, w: 1.5 },
    { key: 'world', label: 'World', values: model.world, color: COLORS.world, w: 1.5 },
  ]

  const geo = useMemo(() => {
    if (!width) return null
    const all = series.flatMap((s) => s.values).filter((v): v is number => v != null)
    const lo = Math.floor(Math.min(...all) / 10) * 10
    const hi = Math.ceil(Math.max(...all) / 10) * 10
    const pw = width - PAD.left - PAD.right
    const ph = H - PAD.top - PAD.bottom
    const x = (i: number) => PAD.left + (i / (model.years.length - 1)) * pw
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * ph
    const ticks: number[] = []
    for (let t = lo; t <= hi; t += 10) ticks.push(t)
    // Label the three biggest shocks, skipping any too close to one already labeled.
    const labeled: number[] = []
    for (const s of [...life.shocks].sort((a, b) => b.drop - a.drop)) {
      if (labeled.length >= 3) break
      const sx = x(s.year - model.y0)
      if (labeled.every((l) => Math.abs(x(l - model.y0) - sx) > 70)) labeled.push(s.year)
    }
    return { x, y, ticks, lo, hi, labeled, paths: series.map((s) => linePath(s.values, x, y)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, life, model])

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!geo) return
    const r = e.currentTarget.getBoundingClientRect()
    const f = (e.clientX - r.left - PAD.left) / (width - PAD.left - PAD.right)
    setHover(Math.max(0, Math.min(model.years.length - 1, Math.round(f * (model.years.length - 1)))))
  }

  const fmt = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1))
  const worst = life.shocks.length ? [...life.shocks].sort((a, b) => b.drop - a.drop)[0] : null

  return (
    <>
      <DialogHeader>
        <DialogTitle>{life.name}</DialogTitle>
        <DialogDescription>
          {life.first.toFixed(1)} years in {life.firstYear} → {life.last.toFixed(1)} in {life.lastYear} ({life.gain >= 0 ? '+' : '−'}
          {Math.abs(life.gain).toFixed(1)}).{' '}
          {worst
            ? `${life.shocks.length} shock${life.shocks.length > 1 ? 's' : ''}; the worst, in ${worst.year}, took ${worst.drop.toFixed(1)} years off.`
            : 'No single-year fall of more than 3 years.'}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <Legend shape="line" items={series.map((s) => ({ key: s.key, label: s.label, color: s.color }))} />
        <div ref={ref} className="relative w-full touch-none" style={{ height: H }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {geo && (
            <svg width={width} height={H} className="block" aria-label={`Life expectancy in ${life.name}, ${model.y0}–${model.y1}`}>
              {geo.ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--chart-grid)" />
                  <text x={PAD.left - 8} y={geo.y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                    {t}
                  </text>
                </g>
              ))}
              {model.years
                .filter((y) => y % 10 === 0)
                .map((y) => (
                  <text key={y} x={geo.x(y - model.y0)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
                    {y}
                  </text>
                ))}
              {[...series].reverse().map((s, i) => (
                <path
                  key={s.key}
                  d={geo.paths[series.length - 1 - i]}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.w}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {life.shocks.map((s) => {
                const cx = geo.x(s.year - model.y0)
                const cy = geo.y(s.value)
                const label = geo.labeled.includes(s.year)
                // Near the floor, the label moves to the left of the dot (the dip's steep side) instead of under it.
                const beside = cy + 18 > H - PAD.bottom - 4
                return (
                  <g key={s.year}>
                    <circle cx={cx} cy={cy} r={4} fill="var(--destructive)" stroke="var(--popover)" strokeWidth={2} />
                    {label && (
                      <text
                        x={beside ? cx - 10 : cx}
                        y={beside ? cy + 4 : cy + 18}
                        textAnchor={beside ? 'end' : cx > width - 60 ? 'end' : cx < 60 ? 'start' : 'middle'}
                        className="fill-foreground text-[11px] font-medium tabular-nums"
                      >
                        −{s.drop.toFixed(1)} · {s.year}
                      </text>
                    )}
                  </g>
                )
              })}
              {hover !== null && (
                <g>
                  <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--foreground)" strokeOpacity={0.3} />
                  {series.map((s) =>
                    s.values[hover] != null ? (
                      <circle key={s.key} cx={geo.x(hover)} cy={geo.y(s.values[hover]!)} r={4} fill={s.color} stroke="var(--popover)" strokeWidth={2} />
                    ) : null,
                  )}
                </g>
              )}
            </svg>
          )}
          {geo && hover !== null && (
            <FloatingTip x={geo.x(hover)} y={PAD.top} width={width}>
              <ChartTooltipContent
                title={String(model.years[hover])}
                rows={series.map((s) => ({ key: s.key, label: s.label, value: fmt(s.values[hover]), color: s.color }))}
                footer={life.shocks.find((s) => s.year === model.years[hover]) ? 'Shock year: fell more than 3 years' : undefined}
              />
            </FloatingTip>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className="size-2 rounded-full bg-destructive" />
            Shock: life expectancy fell more than 3 years in one year
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
            <Table2 />
            {showTable ? 'Hide values' : 'Show values'}
          </Button>
        </div>
        {showTable && (
          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-xs tabular-nums">
              <thead className="sticky top-0 bg-popover text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Year</th>
                  {series.map((s) => (
                    <th key={s.key} className="max-w-40 truncate px-3 py-1.5 text-right font-medium">
                      {s.key === 'region' ? 'Region median' : s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...model.years].reverse().map((y) => {
                  const i = y - model.y0
                  return (
                    <tr key={y} className="border-t">
                      <td className="px-3 py-1 font-medium">{y}</td>
                      {series.map((s) => (
                        <td key={s.key} className="px-3 py-1 text-right text-foreground/85">
                          {fmt(s.values[i])}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
