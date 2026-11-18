import { CITIES, type City, type IndicatorCode } from '@/features/lab/sources'

/*
 * Ask's query language. Deliberately forgiving: tokens can come in any
 * order, synonyms map to one intent, and country and city names are matched
 * fuzzily ("s korea", "korea", "south korea" all reach KOR). The parser only
 * decides what was asked; the answer components fetch and compute.
 */

export type Window = '24h' | '7d' | '30d'

export type Intent =
  | { kind: 'quakes'; place: string | null; window: Window; minMag: number }
  | { kind: 'grid'; mode: 'now' | 'today' | 'best'; hours: number }
  | { kind: 'weather'; city: City; when: 'today' | 'tomorrow' | 'week' }
  | { kind: 'space'; focus: 'kp' | 'flares' }
  | { kind: 'co2'; year: number | null }
  | { kind: 'indicator'; code: IndicatorCode | 'life'; countries: string[]; year: number | null; unknown: string[] }
  | { kind: 'wiki'; n: number }
  | { kind: 'launch'; n: number }
  | { kind: 'hn'; n: number }
  | { kind: 'help' }
  | { kind: 'unknown'; text: string; suggestions: string[] }

export interface IndicatorMeta {
  code: IndicatorCode | 'life'
  words: string[]
  noun: string
  unit: (v: number) => string
  /** For "up/down" wording: is more of it good? */
  upIsGood: boolean | null
  dashboard: { label: string; path: (iso3?: string) => string }
}

const pct = (v: number) => `${v.toFixed(v >= 99.95 ? 0 : 1)}%`
const LEDGER = { label: 'Ledger', path: () => '/lab/ledger' }

export const INDICATORS: IndicatorMeta[] = [
  {
    code: 'life',
    words: ['life', 'lifespan', 'life expectancy', 'longevity'],
    noun: 'life expectancy',
    unit: (v) => `${v.toFixed(1)} years`,
    upIsGood: true,
    dashboard: { label: 'Lifelines', path: (iso) => (iso ? `/lab/lifelines?country=${iso}` : '/lab/lifelines') },
  },
  { code: 'NY.GDP.PCAP.CD', words: ['gdp', 'income', 'wealth', 'gdp per capita'], noun: 'GDP per person', unit: (v) => `$${Math.round(v).toLocaleString('en-US')}`, upIsGood: true, dashboard: LEDGER },
  { code: 'SP.POP.TOTL', words: ['population', 'pop', 'people'], noun: 'population', unit: (v) => fmtPop(v), upIsGood: null, dashboard: LEDGER },
  { code: 'IT.NET.USER.ZS', words: ['internet', 'online', 'web'], noun: 'share of people online', unit: pct, upIsGood: true, dashboard: LEDGER },
  { code: 'EG.ELC.ACCS.ZS', words: ['electricity', 'electrification', 'power access'], noun: 'access to electricity', unit: pct, upIsGood: true, dashboard: LEDGER },
  { code: 'EG.FEC.RNEW.ZS', words: ['renewables', 'renewable', 'clean energy'], noun: 'renewable share of energy use', unit: pct, upIsGood: true, dashboard: LEDGER },
  {
    code: 'EN.GHG.CO2.PC.CE.AR5',
    words: ['emissions', 'co2 per person', 'co2 per capita', 'carbon footprint', 'emission'],
    noun: 'CO₂ per person',
    unit: (v) => `${v.toFixed(1)} t`,
    upIsGood: false,
    dashboard: LEDGER,
  },
  { code: 'SP.DYN.TFRT.IN', words: ['fertility', 'births', 'birth rate', 'babies'], noun: 'fertility rate', unit: (v) => `${v.toFixed(2)} births per woman`, upIsGood: null, dashboard: LEDGER },
  { code: 'SP.DYN.IMRT.IN', words: ['infant mortality', 'infant', 'infants', 'child mortality'], noun: 'infant mortality', unit: (v) => `${v.toFixed(1)} per 1,000 births`, upIsGood: false, dashboard: LEDGER },
  { code: 'SP.URB.TOTL.IN.ZS', words: ['urban', 'urbanization', 'cities', 'city share'], noun: 'share living in cities', unit: pct, upIsGood: null, dashboard: LEDGER },
]

function fmtPop(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} billion`
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)} million`
  return Math.round(v).toLocaleString('en-US')
}

/** Example queries: help, first-visit chips, autocomplete and "did you mean". */
export const EXAMPLES = [
  'quakes japan 7d',
  'quakes >6 30d',
  'quakes california 24h',
  'grid now',
  'grid best 3h',
  'grid today',
  'weather london tomorrow',
  'weather tokyo week',
  'weather reykjavik',
  'space',
  'flares',
  'co2 1990',
  'co2',
  'life japan vs united states',
  'gdp china vs india',
  'internet nigeria',
  'population india',
  'renewables norway',
  'emissions qatar',
  'infant mortality sierra leone 2005',
  'wiki top 10',
  'launch next',
  'hn top 10',
  'help',
]

export const FIRST_VISIT = ['quakes japan 7d', 'grid best 3h', 'weather london tomorrow', 'life japan vs united states', 'co2 1990', 'wiki top 5']

// ── fuzzy matching ──────────────────────────────────────────────────────────

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/(?<!\d)\.|\.(?!\d)/g, '')
    .replace(/[^a-z0-9<>+=\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function lev(a: string, b: string): number {
  if (a === b) return 0
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Common names that World Bank spells differently. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'USA',
  us: 'USA',
  america: 'USA',
  'united states of america': 'USA',
  uk: 'GBR',
  britain: 'GBR',
  'great britain': 'GBR',
  england: 'GBR',
  russia: 'RUS',
  'south korea': 'KOR',
  's korea': 'KOR',
  korea: 'KOR',
  'north korea': 'PRK',
  'n korea': 'PRK',
  iran: 'IRN',
  egypt: 'EGY',
  vietnam: 'VNM',
  turkey: 'TUR',
  venezuela: 'VEN',
  syria: 'SYR',
  laos: 'LAO',
  drc: 'COD',
  'dr congo': 'COD',
  congo: 'COG',
  czechia: 'CZE',
  czech: 'CZE',
  slovakia: 'SVK',
  yemen: 'YEM',
  gambia: 'GMB',
  bahamas: 'BHS',
  'hong kong': 'HKG',
  macau: 'MAC',
  kyrgyzstan: 'KGZ',
  micronesia: 'FSM',
  'ivory coast': 'CIV',
  uae: 'ARE',
  emirates: 'ARE',
  holland: 'NLD',
  burma: 'MMR',
  'east timor': 'TLS',
  'cape verde': 'CPV',
  swaziland: 'SWZ',
  palestine: 'PSE',
  'st lucia': 'LCA',
}

export interface CountryRef {
  iso3: string
  name: string
}

function countryKey(name: string): string {
  return norm(name.replace(/,.*$/, ''))
}

/** Find a country in free text; returns the match and the leftover words. */
export function findCountry(text: string, countries: CountryRef[]): { country: CountryRef; rest: string } | null {
  const t = norm(text)
  if (!t) return null
  const byIso = new Map(countries.map((c) => [c.iso3, c]))
  const words = t.split(' ')
  // Longest phrase first, so "south korea" beats "korea" and "united states" beats "united".
  for (let len = Math.min(5, words.length); len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const phrase = words.slice(i, i + len).join(' ')
      const rest = [...words.slice(0, i), ...words.slice(i + len)].join(' ')
      const alias = COUNTRY_ALIASES[phrase]
      if (alias && byIso.has(alias)) return { country: byIso.get(alias)!, rest }
      const exact = countries.find((c) => countryKey(c.name) === phrase || c.iso3.toLowerCase() === phrase)
      if (exact) return { country: exact, rest }
    }
  }
  // Fuzzy: whole text against names, allowing a typo per ~5 letters.
  let best: CountryRef | null = null
  let bestD = Infinity
  for (const c of countries) {
    const k = countryKey(c.name)
    const d = k.startsWith(t) && t.length >= 4 ? 0.5 : lev(t, k)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  if (best && bestD <= Math.max(1, Math.floor(t.length / 5))) return { country: best, rest: '' }
  return null
}

export function findCity(text: string): City | null {
  const t = norm(text)
  const words = t.split(' ')
  const aliases: Record<string, string> = { ny: 'nyc', nyc: 'nyc', 'new york': 'nyc', manhattan: 'nyc' }
  for (let len = 2; len >= 1; len--)
    for (let i = 0; i + len <= words.length; i++) {
      const p = words.slice(i, i + len).join(' ')
      if (aliases[p]) return CITIES.find((c) => c.id === aliases[p])!
      const c = CITIES.find((c) => norm(c.name) === p || c.id === p || (p.length >= 4 && lev(p, norm(c.name)) <= 1))
      if (c) return c
    }
  return null
}

// ── parse ───────────────────────────────────────────────────────────────────

const has = (t: string, ...w: string[]) => w.some((x) => new RegExp(`(^|\\s)${x}(\\s|$)`).test(t))
const strip = (t: string, ...w: string[]) => w.reduce((s, x) => s.replace(new RegExp(`(^|\\s)${x}(?=\\s|$)`, 'g'), ' '), t).replace(/\s+/g, ' ').trim()

function topN(t: string, def: number, max: number): number {
  const m = t.match(/(?:^|\s)(\d{1,2})(?:\s|$)/)
  return m ? Math.max(1, Math.min(max, +m[1])) : def
}

export function parse(input: string, countries: CountryRef[]): Intent {
  const t = norm(input)
  if (!t || has(t, 'help', 'commands', '\\?')) return { kind: 'help' }

  if (has(t, 'hn', 'hacker news', 'hackernews')) return { kind: 'hn', n: topN(t, 5, 15) }
  if (has(t, 'wiki', 'wikipedia', 'trending', 'most read')) return { kind: 'wiki', n: topN(t, 5, 15) }
  if (has(t, 'launch', 'launches', 'rocket', 'rockets', 'liftoff')) return { kind: 'launch', n: topN(t, 5, 10) }

  if (has(t, 'quake', 'quakes', 'earthquake', 'earthquakes', 'seismic', 'tremor', 'tremors')) {
    const window: Window = /(^|\s)(30d|month|30 days)(\s|$)/.test(t) ? '30d' : /(^|\s)(7d|week|7 days)(\s|$)/.test(t) ? '7d' : '24h'
    const magM =
      t.match(/(?:^|\s)(?:>=?\s?|m|mag\s?|magnitude\s|over\s|above\s)(\d(?:\.\d)?)\+?(?=\s|$)/) ?? t.match(/(?:^|\s)(\d(?:\.\d)?)\+(?=\s|$)/)
    const minMag = magM ? Math.max(0, Math.min(9, +magM[1])) : 2.5
    const place = strip(t, 'quake', 'quakes', 'earthquake', 'earthquakes', 'seismic', 'tremor', 'tremors', '24h', '7d', '30d', 'week', 'month', 'today', 'near', 'in', 'last', 'past', 'the', 'days', 'day', 'hours', 'over', 'above', 'mag', 'magnitude', '30', '7', '24', '>', '>=')
      .split(' ')
      .filter((w) => !/^(>=?|m)?\d(\.\d)?\+?$/.test(w))
      .join(' ')
      .trim()
    return { kind: 'quakes', place: place || null, window, minMag }
  }

  if (has(t, 'space', 'kp', 'aurora', 'geomagnetic', 'solar storm', 'solar wind')) return { kind: 'space', focus: 'kp' }
  if (has(t, 'flare', 'flares', 'xray', 'x-ray', 'solar')) return { kind: 'space', focus: 'flares' }

  // Indicators need a country; "co2" alone is the Keeling curve, "co2 qatar" is emissions per person.
  const meta = [...INDICATORS]
    .flatMap((m) => m.words.map((w) => ({ m, w })))
    .sort((a, b) => b.w.length - a.w.length)
    .find(({ w }) => has(t, norm(w)))
  const co2Word = has(t, 'co2', 'carbon dioxide', 'keeling', 'ppm', 'mauna loa')
  const yearM = t.match(/(?:^|\s)(19[5-9]\d|20[0-4]\d)(?:\s|$)/)
  const year = yearM ? +yearM[1] : null

  if (meta || co2Word) {
    const words = meta ? meta.m.words.map(norm) : []
    let rest = strip(t, ...words, 'co2', 'carbon dioxide', 'per person', 'per capita', 'in', 'of', 'for', 'the', 'since', ...(year ? [String(year)] : []))
    const parts = rest.split(/\s(?:vs|versus|v|and|compared to|against)\s|,/).map((s) => s.trim()).filter(Boolean)
    const found: string[] = []
    const unknown: string[] = []
    for (const p of parts) {
      const c = findCountry(p, countries)
      if (c) found.push(c.country.iso3)
      else unknown.push(p)
    }
    if (found.length) {
      const code = meta ? meta.m.code : 'EN.GHG.CO2.PC.CE.AR5'
      return { kind: 'indicator', code, countries: [...new Set(found)].slice(0, 3), year, unknown }
    }
    if (co2Word && !meta) return { kind: 'co2', year }
    if (meta) {
      rest = rest.trim()
      return { kind: 'indicator', code: meta.m.code, countries: [], year, unknown: rest ? [rest] : [] }
    }
  }

  if (has(t, 'grid', 'carbon', 'power', 'electricity uk', 'energy', 'dishwasher', 'kettle', 'ev')) {
    const hm = t.match(/(\d{1,2})\s?h/)
    if (has(t, 'best', 'cleanest', 'when', 'dishwasher', 'kettle', 'ev') || hm) {
      const hours = hm ? Math.max(1, Math.min(12, +hm[1])) : has(t, 'kettle') ? 1 : has(t, 'ev') ? 6 : 3
      return { kind: 'grid', mode: 'best', hours }
    }
    return { kind: 'grid', mode: has(t, 'today', 'yesterday', 'past', '24h') ? 'today' : 'now', hours: 3 }
  }

  const city = findCity(t)
  if (has(t, 'weather', 'forecast', 'temperature', 'temp', 'rain', 'wind') || city) {
    const c = city ?? CITIES[0]
    const when = has(t, 'tomorrow') ? 'tomorrow' : has(t, 'week', '7d', 'weekend') ? 'week' : 'today'
    return { kind: 'weather', city: c, when }
  }

  // A bare country name: offer the questions we can answer about it.
  const bare = findCountry(t, countries)
  if (bare && !bare.rest) {
    const k = countryKey(bare.country.name)
    return { kind: 'unknown', text: input, suggestions: [`life ${k}`, `gdp ${k}`, `population ${k}`] }
  }
  return { kind: 'unknown', text: input, suggestions: closest(input, 3) }
}

/** The examples nearest to free text, for "did you mean". */
export function closest(input: string, n: number): string[] {
  const t = norm(input)
  const score = (ex: string) => {
    const words = t.split(' ')
    const exw = ex.split(' ')
    const overlap = words.filter((w) => exw.some((e) => e.startsWith(w) || lev(w, e) <= 1)).length
    return overlap * 10 - lev(t, ex) / 4
  }
  return [...EXAMPLES].filter((e) => e !== 'help').sort((a, b) => score(b) - score(a)).slice(0, n)
}

/** Autocomplete: examples, plus country and city completions for the word being typed. */
export function suggest(input: string, countries: CountryRef[]): string[] {
  const t = norm(input)
  if (!t) return []
  const words = t.split(' ')
  const out: string[] = []
  const push = (s: string) => {
    if (s !== t && !out.includes(s)) out.push(s)
  }
  for (const ex of EXAMPLES) {
    const exw = ex.split(' ')
    if (words.every((w, i) => (i === words.length - 1 ? exw.some((e) => e.startsWith(w)) : exw.includes(w)))) push(ex)
  }
  // Complete a country or city name after the command word.
  const last = words.at(-1)!
  const head = words.slice(0, -1).join(' ')
  if (head && last.length >= 2) {
    const isWeather = /^(weather|forecast)/.test(head)
    if (isWeather) {
      for (const c of CITIES) if (norm(c.name).startsWith(last)) push(`${head} ${norm(c.name)}`)
    } else if (INDICATORS.some((m) => m.words.some((w) => head.startsWith(norm(w)))) || /vs$/.test(head)) {
      for (const c of countries) {
        const k = countryKey(c.name)
        if (k.startsWith(last) || k.split(' ').some((p) => p.startsWith(last) && last.length >= 3)) push(`${head} ${k}`)
        if (out.length > 10) break
      }
    }
  }
  return out.slice(0, 6)
}
