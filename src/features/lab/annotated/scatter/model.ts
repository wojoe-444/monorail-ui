import { OTHER_COLOR, SERIES_COLORS } from '@/components/charts/palette'
import type { IndicatorCountry, WorldIndicators } from '@/features/lab/sources'

/**
 * Data for "Every Country, Labeled": one row per country per year (GDP per
 * capita, life expectancy, population), a curve fitted through the cloud,
 * and each country's distance from it — the residual the callouts are about.
 */

export const GDP = 'NY.GDP.PCAP.CD'
export const LE = 'SP.DYN.LE00.IN'
export const POP = 'SP.POP.TOTL'

/** Fixed region order → series slot. North America (3 countries) folds into Other. */
export const REGIONS = [
  'East Asia & Pacific',
  'Europe & Central Asia',
  'Latin America & Caribbean',
  'Middle East, North Africa, Afghanistan & Pakistan',
  'South Asia',
  'Sub-Saharan Africa',
  'North America',
] as const
export const REGION_SHORT: Record<string, string> = {
  'East Asia & Pacific': 'East Asia & Pacific',
  'Europe & Central Asia': 'Europe & Central Asia',
  'Latin America & Caribbean': 'Latin America',
  'Middle East, North Africa, Afghanistan & Pakistan': 'Middle East & N. Africa',
  'South Asia': 'South Asia',
  'Sub-Saharan Africa': 'Sub-Saharan Africa',
  'North America': 'North America',
}
export function regionColor(region: string): string {
  const i = REGIONS.indexOf(region as (typeof REGIONS)[number])
  return i >= 0 && i < SERIES_COLORS.length ? SERIES_COLORS[i] : OTHER_COLOR
}

const SPECIAL: Record<string, string> = {
  'Korea, Rep.': 'South Korea',
  "Korea, Dem. People's Rep.": 'North Korea',
  'Congo, Dem. Rep.': 'DR Congo',
  'Congo, Rep.': 'Congo',
  'Russian Federation': 'Russia',
  'Syrian Arab Republic': 'Syria',
  'Viet Nam': 'Vietnam',
  'Lao PDR': 'Laos',
  'Kyrgyz Republic': 'Kyrgyzstan',
  'Slovak Republic': 'Slovakia',
  'Hong Kong SAR, China': 'Hong Kong',
  'Macao SAR, China': 'Macao',
  'Turkiye': 'Türkiye',
  'Venezuela, RB': 'Venezuela',
  'Micronesia, Fed. Sts.': 'Micronesia',
  'St. Martin (French part)': 'St. Martin',
  'Sint Maarten (Dutch part)': 'Sint Maarten',
  'Virgin Islands (U.S.)': 'US Virgin Is.',
  'British Virgin Islands': 'British Virgin Is.',
  'United Arab Emirates': 'UAE',
  'Bosnia and Herzegovina': 'Bosnia',
  'Central African Republic': 'Central African Rep.',
  'St. Vincent and the Grenadines': 'St. Vincent',
  'Sao Tome and Principe': 'São Tomé',
  'Turks and Caicos Islands': 'Turks & Caicos',
  'Northern Mariana Islands': 'N. Mariana Is.',
  'Antigua and Barbuda': 'Antigua',
  'Trinidad and Tobago': 'Trinidad & Tobago',
  'St. Kitts and Nevis': 'St. Kitts & Nevis',
  'United States': 'United States',
  'United Kingdom': 'United Kingdom',
  "Cote d'Ivoire": 'Côte d’Ivoire',
  'Egypt, Arab Rep.': 'Egypt',
}
export function shortName(name: string): string {
  return SPECIAL[name] ?? name.split(',')[0].trim()
}

export interface Row {
  iso3: string
  name: string
  region: string
  gdp: number
  le: number
  pop: number
  /** Years of life above (+) or below (−) what the fitted curve predicts for its income. */
  residual: number
}

export interface Fit {
  a: number
  b: number
  c: number
  predict: (gdp: number) => number
  /** Years gained per tenfold income, at a given income. */
  slopeAt: (gdp: number) => number
}

/** Least-squares quadratic in log10(GDP): le ≈ a + b·L + c·L². */
export function fitCurve(rows: { gdp: number; le: number }[]): Fit {
  const S = [0, 0, 0, 0, 0]
  const T = [0, 0, 0]
  for (const r of rows) {
    const L = Math.log10(r.gdp)
    let p = 1
    for (let k = 0; k < 5; k++) {
      S[k] += p
      if (k < 3) T[k] += p * r.le
      p *= L
    }
  }
  // Normal equations [[S0 S1 S2][S1 S2 S3][S2 S3 S4]] · [a b c] = T, solved by Cramer's rule.
  const M = [
    [S[0], S[1], S[2]],
    [S[1], S[2], S[3]],
    [S[2], S[3], S[4]],
  ]
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const D = det(M) || 1
  const col = (i: number) => M.map((row, r) => row.map((v, c) => (c === i ? T[r] : v)))
  const a = det(col(0)) / D
  const b = det(col(1)) / D
  const c = det(col(2)) / D
  return {
    a,
    b,
    c,
    predict: (gdp) => {
      const L = Math.log10(gdp)
      return a + b * L + c * L * L
    },
    slopeAt: (gdp) => b + 2 * c * Math.log10(gdp),
  }
}

function valueAt(c: IndicatorCountry, code: typeof GDP | typeof LE | typeof POP, year: number): number | undefined {
  return c.values[code]?.[String(year)]
}

export function yearRange(data: WorldIndicators): [number, number] {
  let lo = 9999
  let hi = 0
  for (const c of data.countries)
    for (const y of Object.keys(c.values[GDP] ?? {})) {
      if (c.values[LE]?.[y] === undefined) continue
      lo = Math.min(lo, +y)
      hi = Math.max(hi, +y)
    }
  // The newest year often has only a handful of reporters; end at the last year most countries have.
  const count = (y: number) => data.countries.filter((c) => valueAt(c, GDP, y) !== undefined && valueAt(c, LE, y) !== undefined).length
  while (hi > lo && count(hi) < 150) hi--
  return [lo, hi]
}

export function rowsForYear(data: WorldIndicators, year: number): { rows: Row[]; fit: Fit } {
  const raw: Omit<Row, 'residual'>[] = []
  for (const c of data.countries) {
    const gdp = valueAt(c, GDP, year)
    const le = valueAt(c, LE, year)
    const pop = valueAt(c, POP, year)
    if (!gdp || !le || !pop || gdp <= 0) continue
    raw.push({ iso3: c.iso3, name: shortName(c.name), region: c.region, gdp, le, pop })
  }
  const fit = fitCurve(raw)
  return { rows: raw.map((r) => ({ ...r, residual: r.le - fit.predict(r.gdp) })), fit }
}

/** Every year's position for one country (for the hover trail). */
export function trailFor(data: WorldIndicators, iso3: string, from: number, to: number): { year: number; gdp: number; le: number }[] {
  const c = data.countries.find((k) => k.iso3 === iso3)
  if (!c) return []
  const out: { year: number; gdp: number; le: number }[] = []
  for (let y = from; y <= to; y++) {
    const gdp = valueAt(c, GDP, y)
    const le = valueAt(c, LE, y)
    if (gdp && le) out.push({ year: y, gdp, le })
  }
  return out
}

export const money = (v: number) =>
  v >= 1000 ? `$${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: v >= 10_000 ? 0 : 1 }).format(v)}` : `$${Math.round(v)}`
export const people = (v: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
export const yrs = (v: number) => `${Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0)}`

export interface Callout {
  iso3: string
  title: string
  text: string
  /** Sort key: how far off the curve, weighted toward populous countries. */
  weight: number
}

/**
 * The countries furthest from the curve, written up. Only countries of a
 * million people or more qualify, so a tiny island's noisy data doesn't take
 * the headline. Two above the curve and two below, each a full sentence.
 */
export function callouts(rows: Row[], n = 2): Callout[] {
  const big = rows.filter((r) => r.pop >= 1_000_000)
  const medianGdp = [...big].sort((a, b) => a.gdp - b.gdp)[Math.floor(big.length / 2)]?.gdp ?? 5000
  const weigh = (r: Row) => Math.abs(r.residual) * (1 + Math.log10(r.pop / 1e6) * 0.15)
  const below = big.filter((r) => r.residual < 0).sort((a, b) => weigh(b) - weigh(a)).slice(0, n)
  const above = big.filter((r) => r.residual > 0).sort((a, b) => weigh(b) - weigh(a)).slice(0, n)
  const write = (r: Row): Callout => {
    const rich = r.gdp >= medianGdp
    const d = yrs(r.residual)
    let title: string
    let text: string
    if (r.residual < 0 && rich) {
      title = 'Rich on paper, shorter lives'
      text = `${money(r.gdp)} a head, yet lives end ${d} years sooner than that income predicts.`
    } else if (r.residual < 0) {
      title = 'Below even its income'
      text = `Lives run ${d} years shorter than the curve predicts for ${money(r.gdp)} a head.`
    } else if (!rich) {
      title = 'Long lives, modest income'
      text = `${d} more years of life than its ${money(r.gdp)} a head predicts.`
    } else {
      title = 'Outlives its income'
      text = `${d} years above the curve at ${money(r.gdp)} a head.`
    }
    return { iso3: r.iso3, title: `${r.name}: ${title.toLowerCase()}`, text, weight: weigh(r) }
  }
  return [...below.map(write), ...above.map(write)].sort((a, b) => b.weight - a.weight)
}
