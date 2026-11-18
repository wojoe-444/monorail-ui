import { FUEL_GROUPS } from '@/features/lab/gridclock/util'
import type { MixSlot } from '@/features/lab/feeds'
import type { CarbonSlot } from '@/features/lab/sources'

/**
 * The model behind One Day on the Grid: the past 24h of half-hours, each
 * with its carbon intensity and its mix folded into the lab's fixed fuel
 * groups (same groups and colors as Grid Clock). The story steps are
 * computed from this in the page.
 */

export type GroupKey = (typeof FUEL_GROUPS)[number]['key']
export const GROUPS = FUEL_GROUPS
export const LOW_CARBON: string[] = ['wind', 'solar', 'nuclear', 'hydro']

export interface DaySlot {
  from: number
  to: number
  /** gCO₂/kWh: actual where measured, else the forecast */
  intensity: number
  measured: boolean
  /** share by fuel group key, % */
  groups: Record<string, number>
  /** share by raw fuel, % */
  fuels: Record<string, number>
}

export function buildDay(mix: MixSlot[], carbon: CarbonSlot[]): DaySlot[] {
  const byFrom = new Map(carbon.map((c) => [c.from, c]))
  const out: DaySlot[] = []
  for (const m of mix) {
    const c = byFrom.get(m.from)
    if (!c) continue
    const fuels = Object.fromEntries(m.mix.map((f) => [f.fuel, f.perc]))
    const groups = Object.fromEntries(GROUPS.map((g) => [g.key, g.fuels.reduce((s, f) => s + (fuels[f] ?? 0), 0)]))
    out.push({ from: m.from, to: m.to, intensity: c.actual ?? c.forecast, measured: c.actual != null, groups, fuels })
  }
  return out.sort((a, b) => a.from - b.from)
}

export const share = (s: DaySlot, key: string) => s.groups[key] ?? 0
export const lowCarbon = (s: DaySlot) => LOW_CARBON.reduce((t, f) => t + (s.fuels[f] ?? 0), 0)

export function argMin<T>(xs: T[], f: (x: T) => number): number {
  let best = 0
  xs.forEach((x, i) => {
    if (f(x) < f(xs[best])) best = i
  })
  return best
}
export function argMax<T>(xs: T[], f: (x: T) => number): number {
  let best = 0
  xs.forEach((x, i) => {
    if (f(x) > f(xs[best])) best = i
  })
  return best
}
export const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length)

/** Best contiguous window of `n` slots by mean forecast, among future slots. */
export function bestWindow(slots: CarbonSlot[], n: number): { start: number; end: number; avg: number } | undefined {
  let best: { start: number; end: number; avg: number } | undefined
  for (let i = 0; i + n <= slots.length; i++) {
    const avg = mean(slots.slice(i, i + n).map((s) => s.forecast))
    if (!best || avg < best.avg) best = { start: slots[i].from, end: slots[i + n - 1].to, avg }
  }
  return best
}
