import { COLUMNS, regionLabel, type Column } from '@/features/lab/ledger/model'
import type { IndicatorCode, IndicatorCountry, WorldIndicators } from '@/features/lab/sources'

/**
 * Specimen's scales. Each indicator gets a fixed domain across every year,
 * so animating the year shows real change, not a re-normalized picture.
 *
 * - Size: population is a count, so it uses √ (area tracks people). Other
 *   indicators map their 2nd–98th percentile linearly onto the size range.
 * - Weight: 2nd–98th percentile onto wght 100–900, on a log axis for the
 *   skewed indicators (population, GDP, infant mortality, CO₂).
 */

export type Choice = IndicatorCode | 'none'
export const indicatorCol = (code: IndicatorCode) => COLUMNS.find((c) => c.code === code)!
export { COLUMNS, regionLabel, type Column }

export const W_MIN = 100
export const W_MAX = 900
export const CARRY_YEARS = 5

export interface Domain {
  lo: number
  hi: number
  max: number
  log: boolean
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * q
  const a = Math.floor(i)
  const b = Math.ceil(i)
  return sorted[a] + (sorted[b] - sorted[a]) * (i - a)
}

export function domains(data: WorldIndicators): Record<IndicatorCode, Domain> {
  const out = {} as Record<IndicatorCode, Domain>
  for (const col of COLUMNS) {
    const vs: number[] = []
    for (const c of data.countries) for (const v of Object.values(c.values[col.code] ?? {})) vs.push(v)
    vs.sort((a, b) => a - b)
    const log = !!col.log
    const t = (v: number) => (log ? Math.log10(Math.max(v, 1e-3)) : v)
    out[col.code] = { lo: t(quantile(vs, 0.02)), hi: t(quantile(vs, 0.98)), max: vs.at(-1) ?? 1, log }
  }
  return out
}

/** Value for a year, carried forward from up to CARRY_YEARS earlier. */
export function valueAt(c: IndicatorCountry, code: IndicatorCode, year: number): { v: number; year: number } | null {
  const s = c.values[code]
  if (!s) return null
  for (let y = year; y >= year - CARRY_YEARS; y--) {
    const v = s[String(y)]
    if (v !== undefined) return { v, year: y }
  }
  return null
}

/** 0…1 position of a value within its domain (clamped). */
export function unit(d: Domain, v: number): number {
  const t = d.log ? Math.log10(Math.max(v, 1e-3)) : v
  return Math.max(0, Math.min(1, (t - d.lo) / (d.hi - d.lo || 1)))
}
/** Inverse of `unit`, for legends. */
export function fromUnit(d: Domain, u: number): number {
  const t = d.lo + u * (d.hi - d.lo)
  return d.log ? 10 ** t : t
}

export const weightOf = (d: Domain, v: number) => Math.round(W_MIN + (W_MAX - W_MIN) * unit(d, v))

export function sizeOf(code: IndicatorCode, d: Domain, v: number, min: number, max: number): number {
  if (code === 'SP.POP.TOTL') return min + (max - min) * Math.sqrt(Math.max(0, v) / d.max)
  return min + (max - min) * unit({ ...d, log: false, lo: d.log ? 10 ** d.lo : d.lo, hi: d.log ? 10 ** d.hi : d.hi }, v)
}

export function yearsOf(data: WorldIndicators): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const c of data.countries)
    for (const s of Object.values(c.values))
      for (const y of Object.keys(s ?? {})) {
        lo = Math.min(lo, +y)
        hi = Math.max(hi, +y)
      }
  return [lo, hi]
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** "life expectancy" from "Life exp." etc.: words for sentences. */
export const PHRASE: Record<IndicatorCode, { noun: string; high: string; low: string }> = {
  'SP.POP.TOTL': { noun: 'population', high: 'most populous', low: 'least populous' },
  'NY.GDP.PCAP.CD': { noun: 'GDP per person', high: 'richest per person', low: 'poorest per person' },
  'SP.DYN.LE00.IN': { noun: 'life expectancy', high: 'longest-lived', low: 'shortest-lived' },
  'SP.DYN.TFRT.IN': { noun: 'fertility', high: 'highest fertility', low: 'lowest fertility' },
  'SP.DYN.IMRT.IN': { noun: 'infant mortality', high: 'highest infant mortality', low: 'lowest infant mortality' },
  'IT.NET.USER.ZS': { noun: 'internet use', high: 'most online', low: 'least online' },
  'SP.URB.TOTL.IN.ZS': { noun: 'urban share', high: 'most urban', low: 'most rural' },
  'EG.ELC.ACCS.ZS': { noun: 'electricity access', high: 'best connected', low: 'least connected' },
  'EG.FEC.RNEW.ZS': { noun: 'renewable share', high: 'most renewable', low: 'least renewable' },
  'EN.GHG.CO2.PC.CE.AR5': { noun: 'CO₂ per person', high: 'highest-emitting', low: 'lowest-emitting' },
}

export const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
