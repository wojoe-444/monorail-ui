import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

import type { LifeData } from '@/features/lab/sources'

/** Every small multiple shares these: same years, same 10–90 year scale. */
export const Y_MIN = 10
export const Y_MAX = 90
export const VB_W = 120
export const VB_H = 44
/** A fall of more than this many years of life expectancy in one year is a shock. */
export const SHOCK_YEARS = 3

export interface Shock {
  year: number
  /** Positive: years lost versus the year before. */
  drop: number
  value: number
}

export interface Life {
  iso3: string
  name: string
  region: string
  income: string
  /** Indexed by year − y0. */
  values: (number | null)[]
  firstYear: number
  first: number
  lastYear: number
  last: number
  gain: number
  shocks: Shock[]
  maxShock: number
  /** Line in the shared VB_W × VB_H viewBox. */
  path: string
}

export interface Model {
  y0: number
  y1: number
  years: number[]
  world: (number | null)[]
  worldPath: string
  countries: Life[]
  regions: string[]
  /** Median of the region's countries per year. */
  regionMedian: Map<string, (number | null)[]>
}

export const xFrac = (m: Pick<Model, 'y0' | 'y1'>, year: number) => (year - m.y0) / (m.y1 - m.y0)
export const yFrac = (v: number) => 1 - (v - Y_MIN) / (Y_MAX - Y_MIN)

export function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v == null) {
      pen = false
      return
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`
    pen = true
  })
  return d
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function buildModel(data: LifeData): Model {
  const worldYears = Object.keys(data.world).map(Number)
  const y0 = 1960
  const y1 = Math.max(...worldYears)
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i)
  const vx = (i: number) => (i / (years.length - 1)) * VB_W
  const vy = (v: number) => yFrac(v) * VB_H
  const align = (s: Record<string, number>): (number | null)[] => years.map((y) => s[String(y)] ?? null)

  const countries: Life[] = data.countries
    .map((c): Life | null => {
      const values = align(c.series)
      const idx = values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0)
      if (idx.length < 2) return null
      const fi = idx[0]
      const li = idx[idx.length - 1]
      const shocks: Shock[] = []
      for (let i = 1; i < values.length; i++) {
        const a = values[i - 1]
        const b = values[i]
        if (a != null && b != null && a - b > SHOCK_YEARS) shocks.push({ year: years[i], drop: a - b, value: b })
      }
      return {
        iso3: c.iso3,
        name: c.name,
        region: c.region,
        income: c.income,
        values,
        firstYear: years[fi],
        first: values[fi]!,
        lastYear: years[li],
        last: values[li]!,
        gain: values[li]! - values[fi]!,
        shocks,
        maxShock: Math.max(0, ...shocks.map((s) => s.drop)),
        path: linePath(values, vx, vy),
      } satisfies Life
    })
    .filter((c): c is Life => c !== null)

  const regions = [...new Set(countries.map((c) => c.region))].sort()
  const regionMedian = new Map<string, (number | null)[]>()
  for (const r of regions) {
    const members = countries.filter((c) => c.region === r)
    regionMedian.set(
      r,
      years.map((_, i) => median(members.map((m) => m.values[i]).filter((v): v is number => v != null))),
    )
  }

  const world = align(data.world)
  return { y0, y1, years, world, worldPath: linePath(world, vx, vy), countries, regions, regionMedian }
}

export function valueAt(values: (number | null)[], y0: number, year: number): number | null {
  return values[year - y0] ?? null
}

// ── The synchronized scrub: one year, shared by every cell ──────────────────
let scrubYear: number | null = null
const listeners = new Set<() => void>()

export const scrub = {
  get: () => scrubYear,
  set(year: number | null) {
    if (year === scrubYear) return
    scrubYear = year
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

/** Only components that call this re-render while scrubbing (dots and value labels, never paths). */
export function useScrubYear(): number | null {
  return useSyncExternalStore(scrub.subscribe, scrub.get, () => null)
}

/** Element width, measured before paint and kept current. */
export function useWidth<E extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<E>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}
