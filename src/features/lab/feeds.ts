/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CARBON_GENERATION,
  CARBON_REGIONAL,
  CARBON_BASE,
  SWPC_KP_1M,
  SWPC_KP_FORECAST,
  SWPC_XRAY_1D,
  USGS_DAY_ALL,
  USGS_MONTH,
  carbonWindowUrl,
  openMeteoUrl,
  parseCarbon,
  parseGeneration,
  parseKpForecast,
  parseQuakes,
  parseRegional,
  parseWikiTop,
  parseXray,
  wikiTopUrl,
  type CarbonRegion,
  type CarbonSlot,
  type City,
  type FuelShare,
  type KpPoint,
  type Quake,
  type WikiArticle,
  type XrayPoint,
} from './sources'
import { useLiveData, type LiveData } from './useLiveData'

/**
 * Shared feed hooks for pages that read several sources at once (Briefing,
 * Diff, Inbox, Ask, Pages). Each hook owns one cache key (prefixed `feed:`),
 * so every page calling it shares a single fetch and a single parser. Pages
 * that need a different shape should derive it with useMemo, not re-parse.
 */

const MIN = 60_000

// ── Earthquakes ─────────────────────────────────────────────────────────────
/** M2.5+ worldwide, past 30 days, oldest first. ~1.4 MB. */
export const useQuakesMonth = () => useLiveData<Quake[]>(USGS_MONTH, { key: 'feed:quakes-month', parse: parseQuakes, refreshMs: 5 * MIN })
/** Every magnitude, past 24h, oldest first (mostly US networks below M4.5). */
export const useQuakesDay = () => useLiveData<Quake[]>(USGS_DAY_ALL, { key: 'feed:quakes-day', parse: parseQuakes, refreshMs: 2 * MIN })

// ── Space weather ───────────────────────────────────────────────────────────
export const useKpForecast = () => useLiveData<KpPoint[]>(SWPC_KP_FORECAST, { key: 'feed:kp-forecast', parse: parseKpForecast, refreshMs: 15 * MIN })
/** Latest estimated planetary Kp (minute data). */
export const useKpNow = () =>
  useLiveData<{ time: number; kp: number }>(SWPC_KP_1M, {
    key: 'feed:kp-now',
    parse: (r: any[]) => {
      const last = r[r.length - 1]
      return { time: Date.parse(last.time_tag + 'Z'), kp: last.estimated_kp }
    },
    refreshMs: 5 * MIN,
  })
export const useXray = () => useLiveData<XrayPoint[]>(SWPC_XRAY_1D, { key: 'feed:xray', parse: parseXray, refreshMs: 5 * MIN })

// ── GB grid ─────────────────────────────────────────────────────────────────
/** Half-hour slots: 24h back, 24h+ ahead. The URL is rounded to the half hour, so it's stable. */
export const useCarbonWindow = () =>
  useLiveData<CarbonSlot[]>(carbonWindowUrl(new Date(), 24), { key: 'feed:carbon-window', parse: parseCarbon, refreshMs: 10 * MIN })
export const useGenerationNow = () =>
  useLiveData<{ from: number; mix: FuelShare[] }>(CARBON_GENERATION, { key: 'feed:generation-now', parse: parseGeneration, refreshMs: 10 * MIN })
export const useRegions = () => useLiveData<CarbonRegion[]>(CARBON_REGIONAL, { key: 'feed:regions', parse: parseRegional, refreshMs: 10 * MIN })

export interface MixSlot {
  from: number
  to: number
  mix: FuelShare[]
}
/** Generation mix for each half hour of the past 24h. */
export function useGenerationDay(): LiveData<MixSlot[]> {
  const end = new Date()
  end.setUTCMinutes(end.getUTCMinutes() < 30 ? 0 : 30, 0, 0)
  const start = new Date(end.getTime() - 24 * 3600_000)
  const f = (d: Date) => d.toISOString().slice(0, 16) + 'Z'
  return useLiveData<MixSlot[]>(`${CARBON_BASE}/generation/${f(start)}/${f(end)}`, {
    key: 'feed:generation-day',
    parse: (r: any) => (r.data as any[]).map((d) => ({ from: Date.parse(d.from), to: Date.parse(d.to), mix: d.generationmix })),
    refreshMs: 30 * MIN,
  })
}

// ── Weather ─────────────────────────────────────────────────────────────────
export interface Weather {
  timezone: string
  current: { time: string; temp: number; feels: number; code: number; wind: number; humidity: number }
  hourly: { time: string[]; temp: number[]; feels: number[]; rainChance: number[]; rain: number[]; wind: number[]; cloud: number[]; uv: number[] }
  daily: {
    time: string[]
    max: number[]
    min: number[]
    rain: number[]
    rainChance: number[]
    sunrise: string[]
    sunset: string[]
    daylight: number[]
    code: number[]
  }
}
/** Open-Meteo, yesterday through 6 days ahead, local times (ISO without offset), °C and km/h. */
export const useWeather = (c: City) =>
  useLiveData<Weather>(openMeteoUrl(c), {
    key: `feed:weather:${c.id}`,
    refreshMs: 15 * MIN,
    parse: (r: any) => ({
      timezone: r.timezone,
      current: {
        time: r.current.time,
        temp: r.current.temperature_2m,
        feels: r.current.apparent_temperature,
        code: r.current.weather_code,
        wind: r.current.wind_speed_10m,
        humidity: r.current.relative_humidity_2m,
      },
      hourly: {
        time: r.hourly.time,
        temp: r.hourly.temperature_2m,
        feels: r.hourly.apparent_temperature,
        rainChance: r.hourly.precipitation_probability,
        rain: r.hourly.precipitation,
        wind: r.hourly.wind_speed_10m,
        cloud: r.hourly.cloud_cover,
        uv: r.hourly.uv_index,
      },
      daily: {
        time: r.daily.time,
        max: r.daily.temperature_2m_max,
        min: r.daily.temperature_2m_min,
        rain: r.daily.precipitation_sum,
        rainChance: r.daily.precipitation_probability_max,
        sunrise: r.daily.sunrise,
        sunset: r.daily.sunset,
        daylight: r.daily.daylight_duration,
        code: r.daily.weather_code,
      },
    }),
  })

/** WMO weather code → plain words. */
export function weatherWords(code: number): string {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code <= 48) return 'foggy'
  if (code <= 57) return 'drizzly'
  if (code <= 67) return 'rainy'
  if (code <= 77) return 'snowy'
  if (code <= 82) return 'showery'
  if (code <= 86) return 'snow showers'
  return 'stormy'
}

// ── Wikipedia ───────────────────────────────────────────────────────────────
const dayUtc = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400_000)

/** Top articles for one UTC day (`daysAgo` = 1 is yesterday). Errors with 404 until Wikimedia publishes it. */
export const useWikiDay = (daysAgo: number) =>
  useLiveData<WikiArticle[]>(wikiTopUrl(dayUtc(daysAgo)), { key: `feed:wiki:${wikiTopUrl(dayUtc(daysAgo))}`, parse: parseWikiTop, persistMs: 6 * 3600_000 })

/** The most recent published day: yesterday if it's out, else the day before. */
export function useWikiLatest(): LiveData<{ date: Date; articles: WikiArticle[] }> & { daysAgo: number } {
  const a = useWikiDay(1)
  const b = useWikiDay(2)
  const useA = !!a.data
  const pick = useA ? a : b
  const daysAgo = useA ? 1 : 2
  const waiting = !a.data && !a.error
  return {
    ...pick,
    data: !waiting && pick.data ? { date: dayUtc(daysAgo), articles: pick.data } : undefined,
    loading: waiting || (!a.data && b.loading),
    error: !a.data && a.error && b.error ? b.error : undefined,
    reload: () => {
      a.reload()
      b.reload()
    },
    daysAgo,
  }
}

// ── Rocket launches (The Space Devs, Launch Library 2) ──────────────────────
export interface Launch {
  id: string
  name: string
  rocket: string
  mission: string
  missionType: string
  /** T-0, ms */
  net: number
  windowStart: number
  windowEnd: number
  /** Go / TBD / TBC / Success / Failure / Hold / In Flight / Partial Failure */
  status: string
  statusName: string
  /** How precise `net` is: Second / Minute / Hour / Day / Month … */
  precision: string
  provider: string
  pad: string
  location: string
  orbit: string | null
}
function parseLaunches(r: any): Launch[] {
  return (r.results as any[]).map((l) => ({
    id: l.id,
    name: l.name,
    rocket: String(l.name).split('|')[0].trim(),
    mission: l.mission ?? String(l.name).split('|')[1]?.trim() ?? '',
    missionType: l.mission_type ?? '',
    net: Date.parse(l.net),
    windowStart: Date.parse(l.window_start),
    windowEnd: Date.parse(l.window_end),
    status: l.status?.abbrev ?? '',
    statusName: l.status?.name ?? '',
    precision: l.net_precision?.name ?? '',
    provider: l.lsp_name ?? '',
    pad: l.pad ?? '',
    location: l.location ?? '',
    orbit: l.orbit ?? null,
  }))
}
/** The free API allows ~15 calls an hour, so these persist for 10 minutes across reloads. */
export const useLaunchesUpcoming = () =>
  useLiveData<Launch[]>('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=30&mode=list', {
    key: 'feed:launches-upcoming',
    parse: parseLaunches,
    persistMs: 10 * MIN,
    refreshMs: 10 * MIN,
  })
export const useLaunchesPrevious = () =>
  useLiveData<Launch[]>('https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=20&mode=list', {
    key: 'feed:launches-previous',
    parse: parseLaunches,
    persistMs: 30 * MIN,
    refreshMs: 30 * MIN,
  })

// ── Tides (NOAA CO-OPS) ─────────────────────────────────────────────────────
export interface Tide {
  /** local station time, "YYYY-MM-DD HH:mm" */
  t: string
  /** feet above MLLW */
  v: number
  type: 'H' | 'L'
}
/** High/low predictions for 3 days from today. Station 8518750 is The Battery, New York. */
export function useTides(station = '8518750'): LiveData<Tide[]> {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return useLiveData<Tide[]>(
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&station=${station}&begin_date=${ymd}&range=72&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json`,
    {
      key: `feed:tides:${station}:${ymd}`,
      parse: (r: any) => (r.predictions as any[]).map((p) => ({ t: p.t, v: +p.v, type: p.type })),
      refreshMs: 60 * MIN,
    },
  )
}

// ── Hacker News ─────────────────────────────────────────────────────────────
export { useHackerNews, type HnStory } from './terminal/useHackerNews'
