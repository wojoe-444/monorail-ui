import { latest, type IndicatorCode, type IndicatorCountry, type WorldIndicators } from '@/features/lab/sources'

import { median } from './kit'

/**
 * Country, Written: everything the article says is computed here from the
 * World Bank snapshot. Ranks are among countries with a figure; "the median
 * country" stands in for a world figure (the snapshot has no aggregates),
 * except life expectancy, which has a true world series.
 */

export interface Meta {
  code: IndicatorCode
  label: string
  fmt: (v: number) => string
  /** for the infobox */
  short: string
  log?: boolean
  /** percent-point indicator: change is said in points */
  points?: boolean
}

const pct1 = (v: number) => `${v >= 99.5 ? Math.round(v) : v.toFixed(v < 10 ? 1 : 0)}%`

export const META: Record<IndicatorCode, Meta> = {
  'SP.POP.TOTL': { code: 'SP.POP.TOTL', label: 'population', short: 'Population', fmt: (v) => compactPeople(v), log: true },
  'NY.GDP.PCAP.CD': { code: 'NY.GDP.PCAP.CD', label: 'GDP per person', short: 'GDP per person', fmt: (v) => usd(v), log: true },
  'SP.DYN.LE00.IN': { code: 'SP.DYN.LE00.IN', label: 'life expectancy', short: 'Life expectancy', fmt: (v) => `${v.toFixed(1)} yrs` },
  'SP.DYN.TFRT.IN': { code: 'SP.DYN.TFRT.IN', label: 'fertility', short: 'Births per woman', fmt: (v) => v.toFixed(1) },
  'SP.DYN.IMRT.IN': { code: 'SP.DYN.IMRT.IN', label: 'infant mortality', short: 'Infant deaths /1,000', fmt: (v) => v.toFixed(v < 10 ? 1 : 0), log: true },
  'IT.NET.USER.ZS': { code: 'IT.NET.USER.ZS', label: 'internet use', short: 'Online', fmt: pct1, points: true },
  'SP.URB.TOTL.IN.ZS': { code: 'SP.URB.TOTL.IN.ZS', label: 'urban share', short: 'Urban', fmt: pct1, points: true },
  'EG.ELC.ACCS.ZS': { code: 'EG.ELC.ACCS.ZS', label: 'electricity access', short: 'Electricity', fmt: pct1, points: true },
  'EG.FEC.RNEW.ZS': { code: 'EG.FEC.RNEW.ZS', label: 'renewable share', short: 'Renewable energy', fmt: pct1, points: true },
  'EN.GHG.CO2.PC.CE.AR5': { code: 'EN.GHG.CO2.PC.CE.AR5', label: 'CO₂ per person', short: 'CO₂ per person', fmt: (v) => `${v.toFixed(v < 10 ? 1 : 0)} t`, log: true },
}
export const CODES = Object.keys(META) as IndicatorCode[]

export function compactPeople(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`
  return String(Math.round(n))
}
export function usd(n: number): string {
  if (n >= 10_000) return `$${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K`
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export interface Fact {
  code: IndicatorCode
  year: number
  value: number
  /** 1 = highest */
  rank: number
  of: number
  /** share of countries with a lower value, 0–1 */
  pctile: number
  regionMedian?: number
  regionN: number
  worldMedian: number
  /** earliest value from 2000 on */
  first?: { year: number; value: number }
  series: { year: number; value: number }[]
}

export interface Model {
  data: WorldIndicators
  byIso: Map<string, IndicatorCountry>
  /** latest value per code per iso */
  latestBy: Record<IndicatorCode, Map<string, [number, number]>>
}

export function buildModel(data: WorldIndicators): Model {
  const byIso = new Map(data.countries.map((c) => [c.iso3, c]))
  const latestBy = Object.fromEntries(
    CODES.map((code) => {
      const m = new Map<string, [number, number]>()
      for (const c of data.countries) {
        const l = latest(c, code)
        if (l) m.set(c.iso3, l)
      }
      return [code, m]
    }),
  ) as Model['latestBy']
  return { data, byIso, latestBy }
}

export function fact(m: Model, c: IndicatorCountry, code: IndicatorCode): Fact | undefined {
  const mine = m.latestBy[code].get(c.iso3)
  if (!mine) return undefined
  const all = [...m.latestBy[code].values()].map((v) => v[1])
  const sorted = [...all].sort((a, b) => b - a)
  const region = m.data.countries.filter((o) => o.region === c.region).map((o) => m.latestBy[code].get(o.iso3)?.[1]).filter((v): v is number => v != null)
  const series = Object.entries(c.values[code] ?? {})
    .map(([y, v]) => ({ year: +y, value: v }))
    .sort((a, b) => a.year - b.year)
  return {
    code,
    year: mine[0],
    value: mine[1],
    rank: sorted.indexOf(mine[1]) + 1,
    of: sorted.length,
    pctile: all.filter((v) => v < mine[1]).length / Math.max(1, all.length - 1),
    regionMedian: region.length >= 3 ? median(region) : undefined,
    regionN: region.length,
    worldMedian: median(all),
    first: series[0],
    series,
  }
}

/** The countries most like this one: z-scored (logged where skewed) indicators, mean squared distance over shared ones. */
export function mostLike(m: Model, c: IndicatorCountry, k = 3): { c: IndicatorCountry; d: number }[] {
  const codes = CODES.filter((x) => x !== 'SP.POP.TOTL')
  const stats = new Map<IndicatorCode, { mu: number; sd: number }>()
  const t = (code: IndicatorCode, v: number) => (META[code].log ? Math.log10(Math.max(v, 1e-3)) : v)
  for (const code of codes) {
    const vals = [...m.latestBy[code].values()].map((v) => t(code, v[1]))
    const mu = vals.reduce((s, v) => s + v, 0) / vals.length
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mu) ** 2, 0) / vals.length) || 1
    stats.set(code, { mu, sd })
  }
  const z = (o: IndicatorCountry, code: IndicatorCode) => {
    const l = m.latestBy[code].get(o.iso3)
    if (!l) return undefined
    const s = stats.get(code)!
    return (t(code, l[1]) - s.mu) / s.sd
  }
  const out: { c: IndicatorCountry; d: number }[] = []
  for (const o of m.data.countries) {
    if (o.iso3 === c.iso3) continue
    let sum = 0
    let n = 0
    for (const code of codes) {
      const a = z(c, code)
      const b = z(o, code)
      if (a == null || b == null) continue
      sum += (a - b) ** 2
      n++
    }
    if (n >= 6) out.push({ c: o, d: Math.sqrt(sum / n) })
  }
  return out.sort((a, b) => a.d - b.d).slice(0, k)
}

/** The indicator on which a country stands furthest from its region's median, in z units. */
export function standout(m: Model, c: IndicatorCountry): { code: IndicatorCode; f: Fact; above: boolean } | undefined {
  let best: { code: IndicatorCode; f: Fact; above: boolean; score: number } | undefined
  for (const code of CODES) {
    if (code === 'SP.POP.TOTL') continue
    const f = fact(m, c, code)
    if (!f || f.regionMedian == null || f.regionN < 5) continue
    const t = (v: number) => (META[code].log ? Math.log10(Math.max(v, 1e-3)) : v)
    const vals = [...m.latestBy[code].values()].map((v) => t(v[1]))
    const mu = vals.reduce((s, v) => s + v, 0) / vals.length
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mu) ** 2, 0) / vals.length) || 1
    const score = Math.abs(t(f.value) - t(f.regionMedian)) / sd
    if (!best || score > best.score) best = { code, f, above: f.value > f.regionMedian, score }
  }
  return best && best.score > 0.6 ? best : undefined
}

/** First year a series reached `threshold`. */
export function yearReached(f: Fact, threshold: number): number | undefined {
  return f.series.find((p) => p.value >= threshold)?.year
}

/** Region names in the World Bank list are long; this shortens the awkward ones for prose. */
export function regionWord(region: string): string {
  return region
    .replace('Middle East, North Africa, Afghanistan & Pakistan', 'the Middle East and North Africa')
    .replace('Latin America & Caribbean', 'Latin America and the Caribbean')
    .replace('Europe & Central Asia', 'Europe and Central Asia')
    .replace('East Asia & Pacific', 'East Asia and the Pacific')
    .replace('Sub-Saharan Africa', 'sub-Saharan Africa')
    .replace(/^North America$/, 'North America')
    .replace(/^South Asia$/, 'South Asia')
}

const DISPLAY: Record<string, string> = {
  'Korea, Rep.': 'South Korea',
  "Korea, Dem. People's Rep.": 'North Korea',
  'Egypt, Arab Rep.': 'Egypt',
  'Iran, Islamic Rep.': 'Iran',
  'Venezuela, RB': 'Venezuela',
  'Yemen, Rep.': 'Yemen',
  'Congo, Dem. Rep.': 'Democratic Republic of the Congo',
  'Congo, Rep.': 'Republic of the Congo',
  'Micronesia, Fed. Sts.': 'Micronesia',
  'Hong Kong SAR, China': 'Hong Kong',
  'Macao SAR, China': 'Macao',
  'Lao PDR': 'Laos',
  'Russian Federation': 'Russia',
  'Slovak Republic': 'Slovakia',
  'Kyrgyz Republic': 'Kyrgyzstan',
  'Syrian Arab Republic': 'Syria',
  'Gambia, The': 'Gambia',
  'Bahamas, The': 'Bahamas',
  Turkiye: 'Türkiye',
  'Viet Nam': 'Vietnam',
  'Brunei Darussalam': 'Brunei',
  "Cote d'Ivoire": 'Côte d’Ivoire',
  'Sao Tome and Principe': 'São Tomé and Príncipe',
  'St. Kitts and Nevis': 'St Kitts and Nevis',
  'Virgin Islands (U.S.)': 'US Virgin Islands',
}
/** The World Bank's list names ("Korea, Rep.") as people write them. */
export function displayName(name: string): string {
  return DISPLAY[name] ?? name
}
const THE = /^(United States|United Kingdom|United Arab Emirates|Netherlands|Philippines|Bahamas|Gambia|Czech|Central African Republic|Dominican Republic|Democratic Republic|Republic of the Congo|Maldives|Marshall Islands|Solomon Islands|Comoros|Seychelles|Cayman Islands|Faroe Islands|Turks and Caicos|US Virgin Islands|British Virgin Islands|Northern Mariana)/
/** displayName with "the" where English wants it, for the middle of a sentence. */
export function proseName(name: string): string {
  const d = displayName(name)
  return THE.test(d) ? `the ${d}` : d
}
/** proseName, capitalised for the start of a sentence. */
export function ProseName(name: string): string {
  const p = proseName(name)
  return p[0].toUpperCase() + p.slice(1)
}
