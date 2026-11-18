import type { IndicatorCode, IndicatorCountry, WorldIndicators } from '@/features/lab/sources'

/**
 * Ledger's model: ten World Bank indicators as spreadsheet columns, each
 * with a spreadsheet-style function name, unit-aware formatters, and per-cell
 * rank, percentile and a precomputed trend path (so moving the cursor never
 * recomputes a sparkline).
 */

export interface Column {
  code: IndicatorCode
  letter: string
  short: string
  unit: string
  /** Formula-bar function name, e.g. GDP_PER_CAPITA */
  fn: string
  /** Cell text: compact */
  fmt: (v: number) => string
  /** Formula-bar / tooltip text: exact with unit */
  full: (v: number) => string
  /** Histogram on a log axis (heavily skewed columns). */
  log?: boolean
  /** Sum is meaningful (population). */
  sum?: boolean
}

const n0 = (v: number) => Math.round(v).toLocaleString('en-US')
const pct = (v: number) => `${v >= 99.95 ? '100' : v.toFixed(v < 10 ? 1 : 0)}%`
function big(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K`
  return n0(v)
}

const DEFS: Omit<Column, 'letter'>[] = [
  { code: 'SP.POP.TOTL', short: 'Population', unit: 'people', fn: 'POPULATION', fmt: big, full: (v) => `${n0(v)} people`, log: true, sum: true },
  { code: 'NY.GDP.PCAP.CD', short: 'GDP / person', unit: 'US$', fn: 'GDP_PER_CAPITA', fmt: (v) => `$${big(v)}`, full: (v) => `${n0(v)} US$`, log: true },
  { code: 'SP.DYN.LE00.IN', short: 'Life exp.', unit: 'years', fn: 'LIFE_EXPECTANCY', fmt: (v) => v.toFixed(1), full: (v) => `${v.toFixed(1)} years` },
  { code: 'SP.DYN.TFRT.IN', short: 'Fertility', unit: 'births / woman', fn: 'FERTILITY', fmt: (v) => v.toFixed(2), full: (v) => `${v.toFixed(2)} births per woman` },
  { code: 'SP.DYN.IMRT.IN', short: 'Infant mort.', unit: 'per 1,000', fn: 'INFANT_MORTALITY', fmt: (v) => v.toFixed(1), full: (v) => `${v.toFixed(1)} deaths per 1,000 live births`, log: true },
  { code: 'IT.NET.USER.ZS', short: 'Internet', unit: '% of people', fn: 'INTERNET_USERS', fmt: pct, full: (v) => `${v.toFixed(1)}% of people` },
  { code: 'SP.URB.TOTL.IN.ZS', short: 'Urban', unit: '% of people', fn: 'URBAN_SHARE', fmt: pct, full: (v) => `${v.toFixed(1)}% live in cities` },
  { code: 'EG.ELC.ACCS.ZS', short: 'Electricity', unit: '% with access', fn: 'ELECTRICITY_ACCESS', fmt: pct, full: (v) => `${v.toFixed(1)}% have electricity` },
  { code: 'EG.FEC.RNEW.ZS', short: 'Renewables', unit: '% of energy', fn: 'RENEWABLE_SHARE', fmt: pct, full: (v) => `${v.toFixed(1)}% of final energy use` },
  { code: 'EN.GHG.CO2.PC.CE.AR5', short: 'CO₂ / person', unit: 'tonnes', fn: 'CO2_PER_PERSON', fmt: (v) => `${v < 10 ? v.toFixed(2) : v.toFixed(1)}t`, full: (v) => `${v.toFixed(2)} t CO₂ per person`, log: true },
]

/** Spreadsheet letters start at B: column A is the country. */
export const COLUMNS: Column[] = DEFS.map((c, i) => ({ ...c, letter: String.fromCharCode(66 + i) }))

export interface Cell {
  value: number | null
  year: number | null
  /** 1 = highest value in the column (all countries) */
  rank: number | null
  /** 0 lowest … 1 highest */
  pct: number | null
  /** 40×14 sparkline path, 2000 → latest, scaled to the cell's own range */
  trend: string | null
  trendEnd: [number, number] | null
  series: [number, number][]
}

export interface LedgerRow {
  iso3: string
  name: string
  region: string
  income: string
  cells: Cell[]
}

export interface Ledger {
  rows: LedgerRow[]
  /** ranked counts per column */
  counts: number[]
  /** latest year in each column */
  maxYear: number[]
  regions: string[]
  incomes: string[]
  /** per column, all non-null values (for histograms) */
  values: number[][]
}

function trendPath(series: [number, number][]): { d: string; end: [number, number] } | null {
  if (series.length < 2) return null
  const w = 40
  const h = 14
  const x0 = series[0][0]
  const x1 = series.at(-1)![0]
  const vs = series.map((s) => s[1])
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const x = (yr: number) => 1 + ((yr - x0) / (x1 - x0 || 1)) * (w - 2)
  const y = (v: number) => h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4)
  const d = series.map(([yr, v], i) => `${i ? 'L' : 'M'}${x(yr).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const last = series.at(-1)!
  return { d, end: [x(last[0]), y(last[1])] }
}

export function buildLedger(data: WorldIndicators): Ledger {
  const countries = data.countries
  const rows: LedgerRow[] = countries.map((c: IndicatorCountry) => ({
    iso3: c.iso3,
    name: c.name,
    region: c.region,
    income: c.income,
    cells: COLUMNS.map((col) => {
      const s = c.values[col.code] ?? {}
      const series = Object.entries(s)
        .map(([y, v]) => [+y, v] as [number, number])
        .sort((a, b) => a[0] - b[0])
      const last = series.at(-1)
      const t = trendPath(series)
      return { value: last?.[1] ?? null, year: last?.[0] ?? null, rank: null, pct: null, trend: t?.d ?? null, trendEnd: t?.end ?? null, series }
    }),
  }))
  const counts: number[] = []
  const maxYear: number[] = []
  const values: number[][] = []
  COLUMNS.forEach((_, ci) => {
    const withVal = rows.filter((r) => r.cells[ci].value !== null).sort((a, b) => b.cells[ci].value! - a.cells[ci].value!)
    withVal.forEach((r, i) => {
      r.cells[ci].rank = i + 1
      r.cells[ci].pct = withVal.length > 1 ? 1 - i / (withVal.length - 1) : 1
    })
    counts.push(withVal.length)
    maxYear.push(Math.max(...withVal.map((r) => r.cells[ci].year!)))
    values.push(withVal.map((r) => r.cells[ci].value!))
  })
  const uniq = (xs: string[]) => [...new Set(xs)].filter(Boolean).sort()
  return { rows, counts, maxYear, values, regions: uniq(rows.map((r) => r.region)), incomes: uniq(rows.map((r) => r.income)) }
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export interface Stats {
  count: number
  avg: number | null
  median: number | null
  min: number | null
  max: number | null
  sum: number | null
}
export function stats(xs: number[]): Stats {
  if (!xs.length) return { count: 0, avg: null, median: null, min: null, max: null, sum: null }
  const sum = xs.reduce((a, b) => a + b, 0)
  return { count: xs.length, avg: sum / xs.length, median: median(xs), min: Math.min(...xs), max: Math.max(...xs), sum }
}

/** Short labels for long World Bank region names. */
export const REGION_SHORT: Record<string, string> = {
  'Middle East, North Africa, Afghanistan & Pakistan': 'Middle East, N. Africa, Afg. & Pak.',
  'Latin America & Caribbean': 'Latin America & Caribbean',
  'Europe & Central Asia': 'Europe & Central Asia',
  'East Asia & Pacific': 'East Asia & Pacific',
  'Sub-Saharan Africa': 'Sub-Saharan Africa',
}
export const regionLabel = (r: string) => REGION_SHORT[r] ?? r
