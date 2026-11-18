import { memo, useEffect, useMemo, useState } from 'react'
import { Pause, Pin, Play, X } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { Slider } from '@/components/ui/slider'
import { experiment } from '@/features/lab/catalog'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import {
  COLUMNS,
  PHRASE,
  W_MAX,
  W_MIN,
  domains,
  fromUnit,
  indicatorCol,
  list,
  median,
  regionLabel,
  sizeOf,
  valueAt,
  weightOf,
  yearsOf,
  type Choice,
  type Domain,
} from '@/features/lab/specimen/model'
import { WORLD_INDICATORS, type IndicatorCode, type IndicatorCountry, type WorldIndicators } from '@/features/lab/sources'
import { useElementSize, useLiveData } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

/*
 * Specimen: a variable font is the chart. Every country's name is set in
 * Inter Variable, its size drawn from one indicator and its weight (the
 * wght axis, 100–900) from another. Scrub or play the year and the type
 * itself changes: names thicken as lives lengthen.
 */

const EXP = experiment('specimen')
type Order = 'size' | 'az' | 'region'
type View = 'specimen' | 'table'

export function SpecimenPage() {
  const feed = useLiveData<WorldIndicators>(WORLD_INDICATORS)
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />
        <SourceLine source="World Bank WDI snapshot" href="https://data.worldbank.org/" feeds={[feed]} />
      </div>
      <LoadGate feeds={[feed]} label="Setting the type">
        {() => <Body data={feed.data!} />}
      </LoadGate>
    </div>
  )
}

interface Item {
  c: IndicatorCountry
  s: { v: number; year: number } | null
  w: { v: number; year: number } | null
  missing: boolean
  size: number
  weight: number
}

function Body({ data }: { data: WorldIndicators }) {
  const doms = useMemo(() => domains(data), [data])
  const [y0, y1] = useMemo(() => yearsOf(data), [data])
  const [sizeBy, setSizeBy] = useState<Choice>('SP.POP.TOTL')
  const [weightBy, setWeightBy] = useState<Choice>('SP.DYN.LE00.IN')
  const [order, setOrder] = useState<Order>('size')
  const [view, setView] = useState<View>('specimen')
  // The latest year with broad coverage: the snapshot's final year is often thin.
  const latestFull = useMemo(() => {
    for (let y = y1; y > y0; y--) {
      const n = data.countries.filter((c) => c.values['SP.DYN.LE00.IN']?.[String(y)] !== undefined).length
      if (n > data.countries.length * 0.6) return y
    }
    return y1
  }, [data, y0, y1])
  const [year, setYear] = useState(latestFull)
  const [playing, setPlaying] = useState(false)
  const [orderYear, setOrderYear] = useState(latestFull)
  const [pinned, setPinned] = useState<string[]>([])
  const [wallRef, { width }] = useElementSize()
  const scale = width && width < 640 ? 0.66 : 1
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  // Play: one year a second; the order stays frozen until it stops, so names reweigh in place.
  useEffect(() => {
    if (!playing) {
      setOrderYear(year)
      return
    }
    const id = window.setInterval(() => {
      setYear((y) => {
        if (y >= y1) {
          setPlaying(false)
          return y
        }
        return y + 1
      })
    }, reduced ? 1400 : 1000)
    return () => window.clearInterval(id)
  }, [playing, y1, reduced, year])

  const build = (yr: number): Item[] =>
    data.countries.map((c) => {
      const s = sizeBy === 'none' ? null : valueAt(c, sizeBy, yr)
      const w = weightBy === 'none' ? null : valueAt(c, weightBy, yr)
      const missing = (sizeBy !== 'none' && !s) || (weightBy !== 'none' && !w)
      const size = missing ? 13 : sizeBy === 'none' ? 22 : sizeOf(sizeBy, doms[sizeBy], s!.v, 12, 58)
      const weight = missing ? 300 : weightBy === 'none' ? 450 : weightOf(doms[weightBy], w!.v)
      return { c, s, w, missing, size: size * scale, weight }
    })

  const items = useMemo(() => build(year), [data, year, sizeBy, weightBy, doms, scale]) // eslint-disable-line react-hooks/exhaustive-deps
  const orderItems = useMemo(() => build(orderYear), [data, orderYear, sizeBy, weightBy, doms, scale]) // eslint-disable-line react-hooks/exhaustive-deps

  // Order (from the frozen order year) → ids, then rendered with the live year's items.
  const byId = useMemo(() => new Map(items.map((i) => [i.c.iso3, i])), [items])
  const ordered = useMemo(() => {
    const key = (i: Item) => (i.missing ? -1 : sizeBy !== 'none' ? i.s!.v : weightBy !== 'none' ? i.w!.v : 0)
    const arr = [...orderItems]
    if (order === 'az') arr.sort((a, b) => a.c.name.localeCompare(b.c.name))
    else arr.sort((a, b) => key(b) - key(a) || a.c.name.localeCompare(b.c.name))
    return arr.map((i) => i.c.iso3)
  }, [orderItems, order, sizeBy, weightBy])

  const ranks = useMemo(() => {
    const rk = (pick: (i: Item) => number | undefined) => {
      const xs = items.filter((i) => pick(i) !== undefined).sort((a, b) => pick(b)! - pick(a)!)
      return { map: new Map(xs.map((i, n) => [i.c.iso3, n + 1])), n: xs.length }
    }
    return { size: rk((i) => i.s?.v), weight: rk((i) => i.w?.v) }
  }, [items])

  const togglePin = (iso3: string) => setPinned((p) => (p.includes(iso3) ? p.filter((x) => x !== iso3) : [...p, iso3]))
  const missingCount = items.filter((i) => i.missing).length

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <PickSelect id="spec-size" label="Size by" value={sizeBy} onChange={setSizeBy} />
        <PickSelect id="spec-weight" label="Weight by" value={weightBy} onChange={setWeightBy} />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Order</span>
          <Segmented<Order>
            aria-label="Order names"
            value={order}
            onChange={setOrder}
            options={[
              { value: 'size', label: 'By size' },
              { value: 'az', label: 'A–Z' },
              { value: 'region', label: 'By region' },
            ]}
          />
        </div>
        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
          <span className="flex items-baseline justify-between text-xs font-medium text-muted-foreground">
            <span>Year</span>
            <span className="text-base font-semibold text-foreground tabular-nums">{year}</span>
          </span>
          <div className="flex h-9 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label={playing ? 'Pause' : `Play ${year >= y1 ? y0 : year}–${y1}`}
              onClick={() => {
                if (!playing && year >= y1) setYear(y0)
                setPlaying((p) => !p)
              }}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            <Slider min={y0} max={y1} step={1} value={[year]} onValueChange={([v]) => (setPlaying(false), setYear(v))} thumbLabels={['Year']} />
          </div>
        </div>
        <Segmented<View>
          aria-label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'specimen', label: 'Specimen' },
            { value: 'table', label: 'Table' },
          ]}
        />
      </div>

      <Legend items={items} doms={doms} sizeBy={sizeBy} weightBy={weightBy} year={year} missingCount={missingCount} scale={scale} />

      <Summary items={items} sizeBy={sizeBy} weightBy={weightBy} year={year} />

      {pinned.length > 0 && (
        <div className="-mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Pin className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">Pinned</span>
          {pinned.map((iso3) => {
            const it = byId.get(iso3)!
            return (
              <button
                key={iso3}
                type="button"
                onClick={() => togglePin(iso3)}
                className="inline-flex items-center gap-1 rounded-full bg-highlight-soft px-2.5 py-0.5 text-xs font-medium text-highlight-soft-foreground"
                aria-label={`Unpin ${it.c.name}`}
              >
                {it.c.name}
                {weightBy !== 'none' && it.w && <span className="tabular-nums opacity-80">· {indicatorCol(weightBy).fmt(it.w.v)}</span>}
                <X className="size-3" />
              </button>
            )
          })}
        </div>
      )}

      <div ref={wallRef}>
        {view === 'table' ? (
          <SpecimenTable items={items} order={ordered} sizeBy={sizeBy} weightBy={weightBy} year={year} />
        ) : (
          <Card className="px-6 py-8 sm:px-10">
            {order === 'region' ? (
              [...new Set(data.countries.map((c) => c.region))].sort().map((reg) => (
                <section key={reg} className="mb-8 last:mb-0">
                  <h3 className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{regionLabel(reg)}</h3>
                  <Names ids={ordered.filter((id) => byId.get(id)!.c.region === reg)} byId={byId} pinned={pinned} onPin={togglePin} ranks={ranks} sizeBy={sizeBy} weightBy={weightBy} year={year} />
                </section>
              ))
            ) : (
              <Names ids={ordered} byId={byId} pinned={pinned} onPin={togglePin} ranks={ranks} sizeBy={sizeBy} weightBy={weightBy} year={year} />
            )}
          </Card>
        )}
      </div>
    </>
  )
}

function PickSelect({ id, label, value, onChange }: { id: string; label: string; value: Choice; onChange: (v: Choice) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value as Choice)} className="w-52">
        {COLUMNS.map((c) => (
          <option key={c.code} value={c.code}>
            {c.short} ({c.unit})
          </option>
        ))}
        <option value="none">None</option>
      </NativeSelect>
    </div>
  )
}

// ── The specimen header: extremes, the wght axis, the size axis ──────────────

function Legend({
  items,
  doms,
  sizeBy,
  weightBy,
  year,
  missingCount,
  scale,
}: {
  items: Item[]
  doms: Record<IndicatorCode, Domain>
  sizeBy: Choice
  weightBy: Choice
  year: number
  missingCount: number
  scale: number
}) {
  const present = items.filter((i) => !i.missing && i.w)
  // Extremes by value, not by weight: the 2nd–98th percentile clamp puts several names at 100 or 900.
  const light = present.reduce<Item | null>((m, i) => (!m || i.w!.v < m.w!.v ? i : m), null)
  const heavy = present.reduce<Item | null>((m, i) => (!m || i.w!.v > m.w!.v ? i : m), null)
  const wc = weightBy !== 'none' ? indicatorCol(weightBy) : null
  const sc = sizeBy !== 'none' ? indicatorCol(sizeBy) : null
  const steps = [0, 0.25, 0.5, 0.75, 1]
  const sizeSamples: { v: number; px: number }[] =
    sizeBy === 'none'
      ? []
      : sizeBy === 'SP.POP.TOTL'
        ? [1e6, 3e7, 3e8, 1.4e9].map((v) => ({ v, px: sizeOf(sizeBy, doms[sizeBy], v, 12, 58) * scale }))
        : [0, 0.5, 1].map((u) => {
            const v = fromUnit(doms[sizeBy], u)
            return { v, px: sizeOf(sizeBy, doms[sizeBy], v, 12, 58) * scale }
          })
  return (
    <Card className="gap-0 overflow-hidden py-0 lg:flex-row">
      {wc && light && heavy && (
        <div className="flex items-end gap-6 border-b px-6 py-6 sm:gap-8 lg:border-r lg:border-b-0">
          {[light, heavy].map((it, i) => (
            <div key={i} className="min-w-0">
              <div className="text-[64px] leading-[0.9] tracking-tight sm:text-[88px] transition-[font-weight] duration-700 motion-reduce:transition-none" style={{ fontWeight: it.weight }} aria-hidden>
                Aa
              </div>
              <div className="mt-2 font-mono text-[11px] text-muted-foreground">wght {it.weight}</div>
              <div className="max-w-36 truncate text-xs font-medium">{it.c.name}</div>
              <div className="text-xs text-muted-foreground tabular-nums">{wc.fmt(it.w!.v)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-5 px-6 py-6">
        {wc ? (
          <div>
            <div className="flex items-end justify-between gap-2">
              {steps.map((u) => (
                <span key={u} className="text-lg leading-none tabular-nums sm:text-3xl" style={{ fontWeight: Math.round(W_MIN + (W_MAX - W_MIN) * u) }}>
                  {wc.fmt(fromUnit(doms[weightBy as IndicatorCode], u))}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span>wght {W_MIN}</span>
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span className="font-sans text-xs">weight = {PHRASE[weightBy as IndicatorCode].noun}, {wc.unit}</span>
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span>{W_MAX}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Weight is off: every name is set at wght 450.</div>
        )}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          {sc ? (
            <>
              {sizeSamples.map((s, i) => (
                <span key={i} className="inline-flex items-baseline gap-1.5">
                  <span className="leading-none font-medium" style={{ fontSize: s.px }} aria-hidden>
                    Aa
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{sc.fmt(s.v)}</span>
                </span>
              ))}
              <span className="text-xs text-muted-foreground">
                size = {PHRASE[sizeBy as IndicatorCode].noun}
                {sizeBy === 'SP.POP.TOTL' ? ' (area follows people)' : ''}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Size is off: every name is set at one size.</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-light text-muted-foreground underline decoration-dotted underline-offset-2">Grey, light names</span>
          <span>
            have no data for {year} ({missingCount} of {items.length}). Values carry forward up to 5 years.
          </span>
        </div>
      </div>
    </Card>
  )
}

// ── The sentence ─────────────────────────────────────────────────────────────

function Summary({ items, sizeBy, weightBy, year }: { items: Item[]; sizeBy: Choice; weightBy: Choice; year: number }) {
  const parts: React.ReactNode[] = []
  if (weightBy !== 'none') {
    const col = indicatorCol(weightBy)
    const byRegion = new Map<string, number[]>()
    for (const i of items) if (i.w) byRegion.set(i.c.region, [...(byRegion.get(i.c.region) ?? []), i.w.v])
    const med = [...byRegion]
      .filter(([, v]) => v.length >= 3)
      .map(([r, v]) => ({ r, m: median(v)! }))
      .sort((a, b) => b.m - a.m)
    const present = items.filter((i) => i.w).sort((a, b) => b.w!.v - a.w!.v)
    if (med.length >= 3 && present.length) {
      parts.push(
        <span key="w">
          the heaviest names, the {PHRASE[weightBy].high}, cluster in <b className="font-semibold">{list(med.slice(0, 2).map((x) => regionLabel(x.r)))}</b> (medians{' '}
          {list(med.slice(0, 2).map((x) => col.fmt(x.m)))}); the lightest are in <b className="font-semibold">{regionLabel(med.at(-1)!.r)}</b> ({col.fmt(med.at(-1)!.m)}).{' '}
          {present[0].c.name} is the single heaviest at {col.fmt(present[0].w!.v)}, {present.at(-1)!.c.name} the lightest at {col.fmt(present.at(-1)!.w!.v)}.{' '}
        </span>,
      )
    }
  }
  if (sizeBy !== 'none') {
    const col = indicatorCol(sizeBy)
    const big = items.filter((i) => i.s).sort((a, b) => b.s!.v - a.s!.v)
    if (big.length >= 2)
      parts.push(
        <span key="s">
          {big[0].c.name} and {big[1].c.name} are set largest ({col.fmt(big[0].s!.v)} and {col.fmt(big[1].s!.v)} {PHRASE[sizeBy].noun === 'population' ? 'people' : ''}).
        </span>,
      )
  }
  if (!parts.length) return null
  return (
    <p className="max-w-3xl text-lg leading-relaxed text-foreground/90">
      <span className="font-semibold tabular-nums">In {year}, </span>
      {parts}
    </p>
  )
}

// ── The wall ─────────────────────────────────────────────────────────────────

interface NamesProps {
  ids: string[]
  byId: Map<string, Item>
  pinned: string[]
  onPin: (iso3: string) => void
  ranks: { size: { map: Map<string, number>; n: number }; weight: { map: Map<string, number>; n: number } }
  sizeBy: Choice
  weightBy: Choice
  year: number
}

function Names({ ids, byId, pinned, onPin, ranks, sizeBy, weightBy, year }: NamesProps) {
  return (
    <p className="leading-[1.12] [text-wrap:pretty]" lang="en">
      {ids.map((id, n) => {
        const it = byId.get(id)!
        return (
          <span key={id}>
            <Name
              it={it}
              pinned={pinned.includes(id)}
              onPin={onPin}
              sizeRank={ranks.size.map.get(id)}
              sizeN={ranks.size.n}
              weightRank={ranks.weight.map.get(id)}
              weightN={ranks.weight.n}
              sizeBy={sizeBy}
              weightBy={weightBy}
              year={year}
            />
            {n < ids.length - 1 && (
              <span aria-hidden className="mx-[0.35em] text-[11px] text-muted-foreground/60">
                ·
              </span>
            )}
          </span>
        )
      })}
    </p>
  )
}

const Name = memo(function Name({
  it,
  pinned,
  onPin,
  sizeRank,
  sizeN,
  weightRank,
  weightN,
  sizeBy,
  weightBy,
  year,
}: {
  it: Item
  pinned: boolean
  onPin: (iso3: string) => void
  sizeRank?: number
  sizeN: number
  weightRank?: number
  weightN: number
  sizeBy: Choice
  weightBy: Choice
  year: number
}) {
  const row = (code: Choice, v: { v: number; year: number } | null, rank: number | undefined, n: number, label: string) => {
    if (code === 'none') return null
    const col = indicatorCol(code)
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">
          {label}: {col.short}
        </span>
        <span className="text-right">
          {v ? (
            <>
              <span className="font-semibold tabular-nums">{col.full(v.v)}</span>
              <span className="ml-1.5 text-muted-foreground tabular-nums">
                #{rank} of {n}
                {v.year !== year ? ` · ${v.year}` : ''}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">no data</span>
          )}
        </span>
      </div>
    )
  }
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => onPin(it.c.iso3)}
          aria-pressed={pinned}
          className={cn(
            'inline rounded-sm align-baseline tracking-tight outline-none transition-[font-size,font-weight] duration-700 ease-out focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
            it.missing ? 'text-muted-foreground underline decoration-dotted decoration-1 underline-offset-[0.2em]' : 'text-foreground hover:text-primary',
            pinned && 'bg-highlight-soft px-[0.15em] text-highlight-soft-foreground',
          )}
          style={{ fontSize: it.size, fontWeight: it.weight }}
        >
          {it.c.name}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 text-xs">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{it.c.name}</span>
          <span className="truncate text-muted-foreground">{regionLabel(it.c.region)}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {row(sizeBy, it.s, sizeRank, sizeN, 'Size')}
          {row(weightBy, it.w, weightRank, weightN, 'Weight')}
        </div>
        <div className="mt-2 border-t pt-2 font-mono text-[11px] text-muted-foreground">
          set at {Math.round(it.size)}px, wght {it.weight} · click to {pinned ? 'unpin' : 'pin'}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
})

function SpecimenTable({ items, order, sizeBy, weightBy, year }: { items: Item[]; order: string[]; sizeBy: Choice; weightBy: Choice; year: number }) {
  const byId = new Map(items.map((i) => [i.c.iso3, i]))
  const sc = sizeBy !== 'none' ? indicatorCol(sizeBy) : null
  const wc = weightBy !== 'none' ? indicatorCol(weightBy) : null
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Values used to set each name, {year}</caption>
          <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Country</th>
              <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Region</th>
              {sc && <th className="px-4 py-2 text-right font-medium">Size: {sc.short}</th>}
              {wc && <th className="px-4 py-2 text-right font-medium">Weight: {wc.short}</th>}
              <th className="hidden px-4 py-2 text-right font-medium md:table-cell">wght</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.map((id) => {
              const it = byId.get(id)!
              return (
                <tr key={id}>
                  <td className="px-4 py-1.5">{it.c.name}</td>
                  <td className="hidden max-w-0 truncate px-4 py-1.5 text-muted-foreground sm:table-cell">{regionLabel(it.c.region)}</td>
                  {sc && <td className="px-4 py-1.5 text-right tabular-nums">{it.s ? sc.fmt(it.s.v) : '–'}</td>}
                  {wc && <td className="px-4 py-1.5 text-right tabular-nums">{it.w ? wc.fmt(it.w.v) : '–'}</td>}
                  <td className="hidden px-4 py-1.5 text-right font-mono text-xs text-muted-foreground md:table-cell">{it.weight}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
