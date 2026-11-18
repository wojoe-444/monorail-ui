/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Every public feed the lab reads, with a typed parser each. All of these
 * send CORS headers, so the browser fetches them live; World Bank does not,
 * so it is a snapshot in public/data (refresh: node scripts/fetch-snapshots.mjs).
 */

// ── USGS earthquakes ────────────────────────────────────────────────────────
export const USGS_MONTH = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson'
export const USGS_DAY_ALL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'

export interface Quake {
  id: string
  mag: number
  place: string
  time: number
  /** km below the surface */
  depth: number
  lon: number
  lat: number
  tsunami: boolean
  /** PAGER alert level: green / yellow / orange / red */
  alert: string | null
  felt: number | null
  sig: number
  url: string
}

/** Sorted oldest first. */
export function parseQuakes(raw: any): Quake[] {
  return (raw.features as any[])
    .filter((f) => f.properties.mag != null && f.geometry)
    .map((f) => ({
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place ?? 'Unknown location',
      time: f.properties.time,
      depth: f.geometry.coordinates[2],
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      tsunami: f.properties.tsunami === 1,
      alert: f.properties.alert,
      felt: f.properties.felt,
      sig: f.properties.sig,
      url: f.properties.url,
    }))
    .sort((a, b) => a.time - b.time)
}

// ── UK grid carbon intensity (National Energy System Operator) ──────────────
export const CARBON_BASE = 'https://api.carbonintensity.org.uk'
/** Half-hour slots from `hoursBack` ago through 48h ahead of that start. */
export function carbonWindowUrl(now: Date, hoursBack = 24): string {
  const start = new Date(now.getTime() - hoursBack * 3600_000)
  start.setUTCMinutes(start.getUTCMinutes() < 30 ? 0 : 30, 0, 0)
  return `${CARBON_BASE}/intensity/${start.toISOString().slice(0, 16)}Z/fw48h`
}
export const CARBON_GENERATION = `${CARBON_BASE}/generation`
export const CARBON_REGIONAL = `${CARBON_BASE}/regional`

export interface CarbonSlot {
  from: number
  to: number
  /** gCO₂/kWh */
  forecast: number
  actual: number | null
  /** very low / low / moderate / high / very high */
  index: string
}
export function parseCarbon(raw: any): CarbonSlot[] {
  return (raw.data as any[]).map((d) => ({
    from: Date.parse(d.from),
    to: Date.parse(d.to),
    forecast: d.intensity.forecast,
    actual: d.intensity.actual ?? null,
    index: d.intensity.index,
  }))
}
export interface FuelShare {
  fuel: string
  perc: number
}
export function parseGeneration(raw: any): { from: number; mix: FuelShare[] } {
  return { from: Date.parse(raw.data.from), mix: raw.data.generationmix }
}
export interface CarbonRegion {
  id: number
  name: string
  forecast: number
  index: string
  mix: FuelShare[]
}
/** The 14 DNO regions plus England / Scotland / Wales / GB aggregates (ids 15–18). */
export function parseRegional(raw: any): CarbonRegion[] {
  return (raw.data[0].regions as any[]).map((r) => ({
    id: r.regionid,
    name: r.shortname,
    forecast: r.intensity.forecast,
    index: r.intensity.index,
    mix: r.generationmix,
  }))
}

// ── NOAA Space Weather Prediction Center ────────────────────────────────────
/** 3-hourly Kp: last week observed, then estimated, then 3-day prediction. */
export const SWPC_KP_FORECAST = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'
export const SWPC_KP_1M = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'
/** ~3 MB, one row a minute for a week (two spacecraft). parseWind keeps the active one. */
export const SWPC_WIND_1M = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json'
export const SWPC_XRAY_1D = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json'

export interface KpPoint {
  time: number
  kp: number
  kind: 'observed' | 'estimated' | 'predicted'
  scale: string | null
}
export function parseKpForecast(raw: any): KpPoint[] {
  return (raw as any[])
    .filter((r) => r && typeof r === 'object' && !Array.isArray(r))
    .map((r) => ({ time: Date.parse(r.time_tag + 'Z'), kp: Number(r.kp), kind: r.observed, scale: r.noaa_scale }))
}
export interface WindPoint {
  time: number
  /** km/s */
  speed: number | null
  /** protons/cm³ */
  density: number | null
  /** K */
  temperature: number | null
}
/** Active spacecraft only, oldest first. */
export function parseWind(raw: any): WindPoint[] {
  return (raw as any[])
    .filter((r) => r.active)
    .map((r) => ({ time: Date.parse(r.time_tag + 'Z'), speed: r.proton_speed, density: r.proton_density, temperature: r.proton_temperature }))
    .sort((a, b) => a.time - b.time)
}
export interface XrayPoint {
  time: number
  /** W/m² */
  flux: number
}
/** Long channel (0.1–0.8 nm), the one flare classes are defined on. */
export function parseXray(raw: any): XrayPoint[] {
  return (raw as any[])
    .filter((r) => r.energy === '0.1-0.8nm' && r.flux > 0)
    .map((r) => ({ time: Date.parse(r.time_tag), flux: r.flux }))
}
/** A1.2 / C3.4 / X2.0 from a 0.1–0.8 nm flux in W/m². */
export function flareClass(flux: number): string {
  const classes: [string, number][] = [
    ['X', 1e-4],
    ['M', 1e-5],
    ['C', 1e-6],
    ['B', 1e-7],
    ['A', 1e-8],
  ]
  for (const [c, base] of classes) if (flux >= base) return `${c}${(flux / base).toFixed(1)}`
  return `A${(flux / 1e-8).toFixed(1)}`
}

// ── Open-Meteo (weather and air quality, no key) ────────────────────────────
export interface City {
  id: string
  name: string
  lat: number
  lon: number
}
export const CITIES: City[] = [
  { id: 'nyc', name: 'New York', lat: 40.71, lon: -74.01 },
  { id: 'london', name: 'London', lat: 51.51, lon: -0.13 },
  { id: 'tokyo', name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { id: 'reykjavik', name: 'Reykjavík', lat: 64.15, lon: -21.94 },
  { id: 'sydney', name: 'Sydney', lat: -33.87, lon: 151.21 },
]
/** Hourly + daily, yesterday through 6 days ahead, in the city's local time. */
export function openMeteoUrl(c: City): string {
  const p = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,cloud_cover,uv_index',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,daylight_duration,weather_code',
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
    timezone: 'auto',
    past_days: '1',
    forecast_days: '7',
  })
  return `https://api.open-meteo.com/v1/forecast?${p}`
}
export function airQualityUrl(c: City): string {
  return `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${c.lat}&longitude=${c.lon}&hourly=pm2_5,us_aqi&timezone=auto&forecast_days=3`
}
/** Daily history for "is this normal?" comparisons. Dates are YYYY-MM-DD. */
export function openMeteoArchiveUrl(c: City, start: string, end: string, daily = 'temperature_2m_max,temperature_2m_min'): string {
  return `https://archive-api.open-meteo.com/v1/archive?latitude=${c.lat}&longitude=${c.lon}&start_date=${start}&end_date=${end}&daily=${daily}&timezone=auto`
}

// ── NOAA GML Mauna Loa CO₂ (monthly, since 1958) ────────────────────────────
export const CO2_MONTHLY = 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv'
export interface Co2Month {
  year: number
  month: number
  /** Decimal date, e.g. 2024.375. */
  t: number
  /** ppm, monthly mean */
  average: number
  /** ppm, seasonally adjusted */
  trend: number
}
/** Fetch with `as: 'text'`. */
export function parseCo2(text: string): Co2Month[] {
  return text
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('year'))
    .map((l) => l.split(','))
    .map((c) => ({ year: +c[0], month: +c[1], t: +c[2], average: +c[3], trend: +c[4] }))
    .filter((r) => r.average > 0)
}

// ── Wikipedia pageviews ─────────────────────────────────────────────────────
/** Top 1000 articles for a UTC day. A day's list appears some hours after it ends: try yesterday, fall back to the day before. */
export function wikiTopUrl(day: Date): string {
  const y = day.getUTCFullYear()
  const m = String(day.getUTCMonth() + 1).padStart(2, '0')
  const d = String(day.getUTCDate()).padStart(2, '0')
  return `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${d}`
}
export interface WikiArticle {
  article: string
  title: string
  views: number
  rank: number
}
const WIKI_NOISE = /^(Main_Page|Special:|Wikipedia:|Portal:|File:|Help:|Talk:|User:|Template:|Category:|-$)/
export function parseWikiTop(raw: any): WikiArticle[] {
  return (raw.items[0].articles as any[])
    .filter((a) => !WIKI_NOISE.test(a.article))
    .map((a, i) => ({ article: a.article, title: a.article.replace(/_/g, ' '), views: a.views, rank: i + 1 }))
}
export function wikiArticleDailyUrl(article: string, days = 30): string {
  const end = new Date(Date.now() - 86400_000)
  const start = new Date(end.getTime() - (days - 1) * 86400_000)
  const f = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
  return `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(article)}/daily/${f(start)}/${f(end)}`
}

// ── Citi Bike (NYC bike share, GBFS, live) ──────────────────────────────────
export const CITIBIKE_INFO = 'https://gbfs.citibikenyc.com/gbfs/en/station_information.json'
export const CITIBIKE_STATUS = 'https://gbfs.citibikenyc.com/gbfs/en/station_status.json'
export interface StationInfo {
  id: string
  name: string
  lat: number
  lon: number
  capacity: number
}
export function parseStationInfo(raw: any): StationInfo[] {
  return (raw.data.stations as any[]).map((s) => ({ id: s.station_id, name: s.name, lat: s.lat, lon: s.lon, capacity: s.capacity }))
}
export interface StationStatus {
  id: string
  bikes: number
  ebikes: number
  docks: number
  renting: boolean
  reported: number
}
export function parseStationStatus(raw: any): { updated: number; stations: Map<string, StationStatus> } {
  const m = new Map<string, StationStatus>()
  for (const s of raw.data.stations as any[]) {
    m.set(s.station_id, {
      id: s.station_id,
      bikes: s.num_bikes_available,
      ebikes: s.num_ebikes_available ?? 0,
      docks: s.num_docks_available,
      renting: s.is_renting === 1,
      reported: s.last_reported * 1000,
    })
  }
  return { updated: raw.last_updated * 1000, stations: m }
}

// ── Hacker News ─────────────────────────────────────────────────────────────
export const HN_TOP = 'https://hacker-news.firebaseio.com/v0/topstories.json'
export const hnItem = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`

// ── World Bank snapshot (public/data) ───────────────────────────────────────
export const LIFE_EXPECTANCY = `${import.meta.env.BASE_URL}data/life-expectancy.json`
export interface LifeCountry {
  iso3: string
  name: string
  region: string
  income: string
  /** year → years of life expectancy at birth */
  series: Record<string, number>
}
export interface LifeData {
  source: string
  fetched: string
  world: Record<string, number>
  countries: LifeCountry[]
}

// ── World Bank indicators snapshot (public/data) ────────────────────────────
export const WORLD_INDICATORS = `${import.meta.env.BASE_URL}data/world-indicators.json`
/** Indicator codes in the snapshot. */
export type IndicatorCode =
  | 'SP.POP.TOTL'
  | 'NY.GDP.PCAP.CD'
  | 'SP.DYN.LE00.IN'
  | 'SP.DYN.TFRT.IN'
  | 'SP.DYN.IMRT.IN'
  | 'IT.NET.USER.ZS'
  | 'SP.URB.TOTL.IN.ZS'
  | 'EG.ELC.ACCS.ZS'
  | 'EG.FEC.RNEW.ZS'
  | 'EN.GHG.CO2.PC.CE.AR5'
export interface IndicatorCountry {
  iso3: string
  name: string
  region: string
  income: string
  /** code → year → value, 2000 to latest; gaps are missing years */
  values: Partial<Record<IndicatorCode, Record<string, number>>>
}
export interface WorldIndicators {
  source: string
  fetched: string
  indicators: Record<IndicatorCode, { label: string; source: string }>
  countries: IndicatorCountry[]
}
/** Latest available [year, value] for one indicator, or undefined. */
export function latest(c: IndicatorCountry, code: IndicatorCode): [number, number] | undefined {
  const s = c.values[code]
  if (!s) return undefined
  const y = Object.keys(s).sort().at(-1)
  return y ? [+y, s[y]] : undefined
}
