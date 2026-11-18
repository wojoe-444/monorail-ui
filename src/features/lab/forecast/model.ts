/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Open-Meteo payloads, parsed into plain rows, and the small vocabulary the
 * page writes its sentences with. Every claim on the page is computed here or
 * in the page from these rows; nothing is hard-coded.
 *
 * Times stay as the API's city-local strings ("2026-11-17T14:00"), so the
 * page never has to reason about time zones.
 */

export interface Hour {
  time: string
  temp: number
  feels: number
  /** precipitation probability, % */
  pop: number
  /** mm */
  precip: number
  /** km/h */
  wind: number
  /** % */
  cloud: number
  uv: number
}
export interface Day {
  date: string
  max: number
  min: number
  /** mm */
  precip: number
  pop: number
  sunrise: string
  sunset: string
  /** seconds */
  daylight: number
  code: number
}
export interface Forecast {
  tzAbbr: string
  current: { time: string; temp: number; feels: number; code: number; wind: number; humidity: number }
  hours: Hour[]
  /** days[0] is yesterday, days[1] today. */
  days: Day[]
}

export function parseForecast(raw: any): Forecast {
  const h = raw.hourly
  const d = raw.daily
  return {
    tzAbbr: raw.timezone_abbreviation,
    current: {
      time: raw.current.time,
      temp: raw.current.temperature_2m,
      feels: raw.current.apparent_temperature,
      code: raw.current.weather_code,
      wind: raw.current.wind_speed_10m,
      humidity: raw.current.relative_humidity_2m,
    },
    hours: (h.time as string[]).map((time, i) => ({
      time,
      temp: h.temperature_2m[i],
      feels: h.apparent_temperature[i],
      pop: h.precipitation_probability[i] ?? 0,
      precip: h.precipitation[i] ?? 0,
      wind: h.wind_speed_10m[i],
      cloud: h.cloud_cover[i],
      uv: h.uv_index[i] ?? 0,
    })),
    days: (d.time as string[]).map((date, i) => ({
      date,
      max: d.temperature_2m_max[i],
      min: d.temperature_2m_min[i],
      precip: d.precipitation_sum[i] ?? 0,
      pop: d.precipitation_probability_max[i] ?? 0,
      sunrise: d.sunrise[i],
      sunset: d.sunset[i],
      daylight: d.daylight_duration[i],
      code: d.weather_code[i],
    })),
  }
}

export interface AirHour {
  time: string
  aqi: number | null
  pm25: number | null
}
export function parseAir(raw: any): AirHour[] {
  return (raw.hourly.time as string[]).map((time, i) => ({ time, aqi: raw.hourly.us_aqi[i], pm25: raw.hourly.pm2_5[i] }))
}

/** Daily highs, date → °C. */
export function parseArchive(raw: any): Map<string, number> {
  const m = new Map<string, number>()
  const t = raw.daily.time as string[]
  const v = raw.daily.temperature_2m_max as (number | null)[]
  t.forEach((d, i) => {
    if (v[i] != null) m.set(d, v[i]!)
  })
  return m
}

export const ARCHIVE_FIRST = 1995
export const ARCHIVE_LAST = 2024

export interface YearValue {
  year: number
  /** Mean daily high over the 7 days centred on this calendar date. */
  value: number
}
/** One value per year: the mean high of the week centred on `date`'s month and day. */
export function sameWeekHighs(archive: Map<string, number>, date: string): YearValue[] {
  const [, m, d] = date.split('-').map(Number)
  const out: YearValue[] = []
  for (let y = ARCHIVE_FIRST; y <= ARCHIVE_LAST; y++) {
    const vals: number[] = []
    for (let k = -3; k <= 3; k++) {
      const key = new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10)
      const v = archive.get(key)
      if (v != null) vals.push(v)
    }
    if (vals.length >= 4) out.push({ year: y, value: vals.reduce((s, v) => s + v, 0) / vals.length })
  }
  return out
}

// ── Units ───────────────────────────────────────────────────────────────────

export type Unit = 'c' | 'f'
export const temp = (c: number, u: Unit) => Math.round(u === 'f' ? c * 1.8 + 32 : c)
/** “−3°” with a true minus sign. */
export const deg = (c: number, u: Unit) => `${temp(c, u) < 0 ? '−' : ''}${Math.abs(temp(c, u))}°`
/** A temperature difference, not a temperature. */
export const degDelta = (c: number, u: Unit) => `${Math.round(Math.abs(u === 'f' ? c * 1.8 : c))}°`
export const speed = (kmh: number, u: Unit) => (u === 'f' ? `${Math.round(kmh / 1.609)} mph` : `${Math.round(kmh)} km/h`)
export function rain(mm: number, u: Unit) {
  if (u === 'f') {
    const inch = mm / 25.4
    return inch < 0.05 ? 'a trace' : `${inch.toFixed(inch < 1 ? 2 : 1)} in`
  }
  return mm < 0.5 ? 'a trace' : `${mm < 10 ? mm.toFixed(1).replace(/\.0$/, '') : Math.round(mm)} mm`
}

// ── Words ───────────────────────────────────────────────────────────────────

/** "2026-11-17T14:00" → "2 pm"; midnight and noon by name. */
export function hourWord(time: string): string {
  const h = Number(time.slice(11, 13))
  if (h === 0) return 'midnight'
  if (h === 12) return 'noon'
  return `${h % 12} ${h < 12 ? 'am' : 'pm'}`
}
/** "6:44 am" */
export function clockWord(time: string): string {
  const h = Number(time.slice(11, 13))
  const m = time.slice(14, 16)
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'am' : 'pm'}`
}
/** hourWord, plus "tomorrow" when the hour falls after today. */
export function whenWord(time: string, today: string): string {
  const w = hourWord(time)
  return time.slice(0, 10) > today ? `${w} tomorrow` : w
}
export function partOfDay(time: string): string {
  const h = Number(time.slice(11, 13))
  if (h < 5) return 'overnight'
  if (h < 9) return 'early morning'
  if (h < 12) return 'mid-morning'
  if (h < 14) return 'midday'
  if (h < 17) return 'afternoon'
  if (h < 19) return 'late afternoon'
  if (h < 22) return 'evening'
  return 'late evening'
}
export function weekday(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
}
export function weekdayShort(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "mid-November" */
export function seasonWord(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${d <= 10 ? 'early' : d <= 20 ? 'mid' : 'late'}-${MONTHS[m - 1]}`
}
export function monthName(m: number) {
  return MONTHS[m - 1]
}

/** WMO weather code → a phrase that fits "It’s 9° and ___ in London". */
export function conditionWord(code: number): string {
  if (code === 0) return 'clear'
  if (code === 1) return 'mostly clear'
  if (code === 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'foggy'
  if (code >= 51 && code <= 57) return 'drizzling'
  if (code >= 61 && code <= 67) return 'raining'
  if (code >= 71 && code <= 77) return 'snowing'
  if (code >= 80 && code <= 82) return 'showery'
  if (code === 85 || code === 86) return 'snowing on and off'
  if (code >= 95) return 'stormy'
  return 'unsettled'
}

export function skyWord(cloud: number): string {
  if (cloud < 20) return 'clear skies'
  if (cloud < 45) return 'mostly sunny skies'
  if (cloud < 70) return 'a mix of sun and cloud'
  if (cloud < 88) return 'mostly cloudy skies'
  return 'grey, overcast skies'
}

/** Beaufort scale in words, from km/h. */
export function windWord(kmh: number): string {
  const scale: [number, string][] = [
    [2, 'calm'],
    [6, 'light air'],
    [12, 'light breeze'],
    [20, 'gentle breeze'],
    [29, 'moderate breeze'],
    [39, 'fresh breeze'],
    [50, 'strong breeze'],
    [62, 'near gale'],
    [75, 'gale'],
    [89, 'strong gale'],
  ]
  for (const [max, w] of scale) if (kmh < max) return w
  return 'storm-force wind'
}

export function uvWord(uv: number): string {
  if (uv < 3) return 'low'
  if (uv < 6) return 'moderate'
  if (uv < 8) return 'high'
  if (uv < 11) return 'very high'
  return 'extreme'
}

/** US AQI category, with the status tone it carries. */
export function aqiCategory(aqi: number): { word: string; tone: 'success' | 'warning' | 'destructive' } {
  if (aqi <= 50) return { word: 'good', tone: 'success' }
  if (aqi <= 100) return { word: 'moderate', tone: 'warning' }
  if (aqi <= 150) return { word: 'unhealthy for sensitive groups', tone: 'warning' }
  if (aqi <= 200) return { word: 'unhealthy', tone: 'destructive' }
  if (aqi <= 300) return { word: 'very unhealthy', tone: 'destructive' }
  return { word: 'hazardous', tone: 'destructive' }
}

export function duration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h === 0 ? `${m} min` : `${h} h ${m} min`
}

/** Days from `date` to the next solstice (21 Jun / 21 Dec), and which one. */
export function nextSolstice(date: string): { days: number; month: number } {
  const [y, m, d] = date.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  const candidates = [Date.UTC(y, 5, 21), Date.UTC(y, 11, 21), Date.UTC(y + 1, 5, 21)]
  const next = candidates.find((c) => c >= t)!
  return { days: Math.round((next - t) / 86400_000), month: new Date(next).getUTCMonth() + 1 }
}
