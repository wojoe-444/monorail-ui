import type { CarbonSlot, FuelShare } from '@/features/lab/sources'

/** Great Britain runs on UK time; the dial and every label use it. */
const UK_TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const UK_DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short' })

export function ukTime(t: number): string {
  return UK_TIME.format(t)
}
export function ukDayTime(t: number): string {
  return `${UK_DAY.format(t)} ${UK_TIME.format(t)}`
}
/** Minutes since UK midnight, 0–1439. */
export function ukMinutes(t: number): number {
  const parts = UK_TIME.formatToParts(t)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return (h % 24) * 60 + m
}

export interface Window {
  start: number
  end: number
  /** Mean forecast over the window, gCO₂/kWh. */
  mean: number
  /** Index of the first slot in `slots`. */
  i: number
}

/** Best (lowest mean) and worst contiguous runs of `len` half-hour slots. */
export function windows(slots: CarbonSlot[], len: number): { best: Window; worst: Window } | undefined {
  if (slots.length < len) return undefined
  let best: Window | undefined
  let worst: Window | undefined
  for (let i = 0; i + len <= slots.length; i++) {
    let sum = 0
    for (let k = i; k < i + len; k++) sum += slots[k].forecast
    const w = { start: slots[i].from, end: slots[i + len - 1].to, mean: sum / len, i }
    if (!best || w.mean < best.mean) best = w
    if (!worst || w.mean > worst.mean) worst = w
  }
  return { best: best!, worst: worst! }
}

/**
 * Fuels folded into the six categorical slots plus Other, in block order:
 * zero-carbon first, then biomass and imports, then fossil. Fixed mapping, so
 * a fuel keeps its color whatever the mix.
 */
export const FUEL_GROUPS: { key: string; label: string; fuels: string[]; color: string; ink: 'light' | 'dark'; zero: boolean }[] = [
  { key: 'wind', label: 'Wind', fuels: ['wind'], color: 'var(--series-1)', ink: 'light', zero: true },
  { key: 'solar', label: 'Solar', fuels: ['solar'], color: 'var(--series-4)', ink: 'dark', zero: true },
  { key: 'nuclear', label: 'Nuclear', fuels: ['nuclear'], color: 'var(--series-6)', ink: 'light', zero: true },
  { key: 'biomass', label: 'Biomass', fuels: ['biomass'], color: 'var(--series-3)', ink: 'dark', zero: false },
  { key: 'imports', label: 'Imports', fuels: ['imports'], color: 'var(--series-5)', ink: 'dark', zero: false },
  { key: 'gas', label: 'Gas', fuels: ['gas'], color: 'var(--series-2)', ink: 'light', zero: false },
  { key: 'other', label: 'Hydro, coal & other', fuels: ['hydro', 'coal', 'other'], color: 'var(--series-other)', ink: 'dark', zero: false },
]

export function groupMix(mix: FuelShare[]) {
  const by = new Map(mix.map((m) => [m.fuel, m.perc]))
  return FUEL_GROUPS.map((g) => ({
    ...g,
    perc: g.fuels.reduce((s, f) => s + (by.get(f) ?? 0), 0),
    parts: g.fuels.map((f) => ({ fuel: f, perc: by.get(f) ?? 0 })),
  }))
}

/** Text inside a colored fill: white or near-black, the same in both modes. */
export const INK = { light: 'oklch(0.99 0 0)', dark: 'oklch(0.2 0 0)' } as const

/** The carbon index is a status scale: low is good, high needs attention. */
export function indexVariant(index: string): 'success' | 'secondary' | 'warning' | 'destructive' {
  if (index === 'very low' || index === 'low') return 'success'
  if (index === 'moderate') return 'secondary'
  if (index === 'high') return 'warning'
  return 'destructive'
}

export function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
