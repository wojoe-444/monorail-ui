import { memo, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '@/lib/utils'

import { scrub, useScrubYear, valueAt, xFrac, yFrac, VB_H, VB_W, type Life, type Model } from './model'

const pct = (f: number) => `${(f * 100).toFixed(2)}%`

/**
 * One small multiple: name, value, the country's line over the world line,
 * shock dots. Moving along any cell's chart scrubs every cell to that year.
 */
export const LifeCell = memo(function LifeCell({ life, model, onOpen }: { life: Life; model: Model; onOpen: (iso3: string) => void }) {
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    scrub.set(Math.round(model.y0 + f * (model.y1 - model.y0)))
  }
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const cur = scrub.get() ?? model.y1
    const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowLeft' ? -1 : 1)
    scrub.set(Math.max(model.y0, Math.min(model.y1, cur + step)))
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(life.iso3)}
      onKeyDown={onKey}
      onBlur={() => scrub.set(null)}
      aria-label={`${life.name}: ${life.last.toFixed(1)} years in ${life.lastYear}, ${life.gain >= 0 ? 'up' : 'down'} ${Math.abs(life.gain).toFixed(1)} since ${life.firstYear}${life.shocks.length ? `, ${life.shocks.length} shock${life.shocks.length > 1 ? 's' : ''}` : ''}`}
      className="group flex min-w-0 flex-col gap-1.5 rounded-lg bg-card px-2.5 pt-2 pb-2.5 text-left ring-1 ring-foreground/10 transition-[box-shadow,translate] outline-none hover:-translate-y-0.5 hover:shadow-elevation-2 hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium">{life.name}</span>
        <CellValue life={life} y0={model.y0} />
      </div>
      <div className="relative h-11" onPointerMove={fromPointer}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <path d={model.worldPath} fill="none" stroke="var(--series-other)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path
            d={life.path}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {life.shocks.map((s) => (
          <span
            key={s.year}
            aria-hidden
            className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive ring-2 ring-card"
            style={{ left: pct(xFrac(model, s.year)), top: pct(yFrac(s.value)) }}
          />
        ))}
        <ScrubMark life={life} model={model} />
      </div>
    </button>
  )
})

function CellValue({ life, y0 }: { life: Life; y0: number }) {
  const year = useScrubYear()
  const v = year === null ? life.last : valueAt(life.values, y0, year)
  return (
    <span className={cn('shrink-0 text-xs tabular-nums', year === null ? 'text-muted-foreground' : 'font-medium text-foreground')}>
      {v == null ? '—' : v.toFixed(1)}
    </span>
  )
}

function ScrubMark({ life, model }: { life: Life; model: Model }) {
  const year = useScrubYear()
  if (year === null) return null
  const v = valueAt(life.values, model.y0, year)
  const x = pct(xFrac(model, year))
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-foreground/25" style={{ left: x }} />
      {v != null && (
        <span
          aria-hidden
          className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
          style={{ left: x, top: pct(yFrac(v)), background: 'var(--series-1)' }}
        />
      )}
    </>
  )
}
