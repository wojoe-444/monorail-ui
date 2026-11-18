/**
 * Sun and moon, computed in the browser.
 *
 * Sun: the NOAA solar calculator equations (Meeus-based), good to about a
 * minute for sunrise/sunset at these latitudes. Moon: Meeus, Astronomical
 * Algorithms ch. 49 (phase times, main periodic terms only), good to a few
 * minutes. Equinoxes and solstices: Meeus ch. 27 mean values, good to about
 * an hour, which is plenty for a date.
 */

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const DAY = 86400_000

export const jdOf = (ms: number) => ms / DAY + 2440587.5
export const msOfJd = (jd: number) => (jd - 2440587.5) * DAY

// ── Sun ─────────────────────────────────────────────────────────────────────

function sunParams(jd: number) {
  const t = (jd - 2451545) / 36525
  const l0 = (((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360) + 360) % 360
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
  const c = Math.sin(rad(m)) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(rad(2 * m)) * (0.019993 - 0.000101 * t) + Math.sin(rad(3 * m)) * 0.000289
  const trueLong = l0 + c
  const omega = 125.04 - 1934.136 * t
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega))
  const e0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const eps = e0 + 0.00256 * Math.cos(rad(omega))
  const dec = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))))
  const y = Math.tan(rad(eps / 2)) ** 2
  const eqTime =
    4 *
    deg(
      y * Math.sin(2 * rad(l0)) -
        2 * e * Math.sin(rad(m)) +
        4 * e * y * Math.sin(rad(m)) * Math.cos(2 * rad(l0)) -
        0.5 * y * y * Math.sin(4 * rad(l0)) -
        1.25 * e * e * Math.sin(2 * rad(m)),
    )
  return { dec, eqTime }
}

/** Zenith angles for each event. */
export const ZENITH = { official: 90.833, civil: 96, nautical: 102, astronomical: 108 } as const
export type Zenith = keyof typeof ZENITH

/**
 * Hour angle (degrees) for a zenith, or a polar flag: 'up' when the sun never
 * sinks to that zenith (midnight sun), 'down' when it never climbs to it.
 */
function hourAngle(lat: number, dec: number, zenith: number): number | 'up' | 'down' {
  const cosH = Math.cos(rad(zenith)) / (Math.cos(rad(lat)) * Math.cos(rad(dec))) - Math.tan(rad(lat)) * Math.tan(rad(dec))
  if (cosH > 1) return 'down'
  if (cosH < -1) return 'up'
  return deg(Math.acos(cosH))
}

export type SunEvent = number | 'up' | 'down'

/**
 * Rise or set for the calendar date `ymd` (the city's local date), in UTC ms.
 * Longitude east-positive. Two passes: the second recomputes the sun at the
 * first estimate, which tightens the time to well under a minute.
 */
function riseSet(ymd: string, lat: number, lon: number, zenith: number, rise: boolean): SunEvent {
  const midnight = Date.parse(`${ymd}T00:00:00Z`)
  // Start from local noon, roughly, so far-east and far-west cities pick the right day.
  let jd = jdOf(midnight + (12 - lon / 15) * 3600_000)
  let minutes = 0
  for (let pass = 0; pass < 2; pass++) {
    const { dec, eqTime } = sunParams(jd)
    const ha = hourAngle(lat, dec, zenith)
    if (typeof ha !== 'number') return ha
    const delta = lon + (rise ? ha : -ha)
    minutes = 720 - 4 * delta - eqTime
    jd = jdOf(midnight + minutes * 60_000)
  }
  return midnight + minutes * 60_000
}

export function solarNoon(ymd: string, lon: number): number {
  const midnight = Date.parse(`${ymd}T00:00:00Z`)
  let minutes = 720 - 4 * lon
  for (let pass = 0; pass < 2; pass++) {
    const { eqTime } = sunParams(jdOf(midnight + minutes * 60_000))
    minutes = 720 - 4 * lon - eqTime
  }
  return midnight + minutes * 60_000
}

export interface SunDay {
  rise: SunEvent
  set: SunEvent
  noon: number
  /** ms of daylight (sunrise to sunset); 0 or 24h at the poles */
  daylight: number
  civil: { dawn: SunEvent; dusk: SunEvent }
  nautical: { dawn: SunEvent; dusk: SunEvent }
  astronomical: { dawn: SunEvent; dusk: SunEvent }
  /** Sun's altitude at solar noon, degrees */
  noonAltitude: number
}

export function sunDay(ymd: string, lat: number, lon: number): SunDay {
  const ev = (z: Zenith) => ({ dawn: riseSet(ymd, lat, lon, ZENITH[z], true), dusk: riseSet(ymd, lat, lon, ZENITH[z], false) })
  const rise = riseSet(ymd, lat, lon, ZENITH.official, true)
  const set = riseSet(ymd, lat, lon, ZENITH.official, false)
  const noon = solarNoon(ymd, lon)
  const daylight =
    typeof rise === 'number' && typeof set === 'number' ? set - rise : rise === 'up' ? DAY : 0
  const { dec } = sunParams(jdOf(noon))
  return { rise, set, noon, daylight, civil: ev('civil'), nautical: ev('nautical'), astronomical: ev('astronomical'), noonAltitude: 90 - Math.abs(lat - dec) }
}

/** Daylight in hours for every day of `year`. */
export function daylightYear(year: number, lat: number, lon: number): { ymd: string; hours: number }[] {
  const out: { ymd: string; hours: number }[] = []
  for (let t = Date.UTC(year, 0, 1); t < Date.UTC(year + 1, 0, 1); t += DAY) {
    const ymd = new Date(t).toISOString().slice(0, 10)
    out.push({ ymd, hours: sunDay(ymd, lat, lon).daylight / 3600_000 })
  }
  return out
}

// ── Seasons ─────────────────────────────────────────────────────────────────

export type SeasonEvent = 'March equinox' | 'June solstice' | 'September equinox' | 'December solstice'

/** Mean equinox/solstice instants for a year (Meeus table 27.B, years 2000–3000). */
export function seasons(year: number): { name: SeasonEvent; at: number }[] {
  const y = (year - 2000) / 1000
  const jde = [
    2451623.80984 + 365242.37404 * y + 0.05169 * y ** 2 - 0.00411 * y ** 3 - 0.00057 * y ** 4,
    2451716.56767 + 365241.62603 * y + 0.00325 * y ** 2 + 0.00888 * y ** 3 - 0.0003 * y ** 4,
    2451810.21715 + 365242.01767 * y - 0.11575 * y ** 2 + 0.00337 * y ** 3 + 0.00078 * y ** 4,
    2451900.05952 + 365242.74049 * y - 0.06223 * y ** 2 - 0.00823 * y ** 3 + 0.00032 * y ** 4,
  ]
  const names: SeasonEvent[] = ['March equinox', 'June solstice', 'September equinox', 'December solstice']
  return jde.map((j, i) => ({ name: names[i], at: msOfJd(j) }))
}

export function nextSeason(now: number): { name: SeasonEvent; at: number } {
  const y = new Date(now).getUTCFullYear()
  return [...seasons(y), ...seasons(y + 1)].find((s) => s.at > now)!
}

// ── Moon ────────────────────────────────────────────────────────────────────

export type PhaseKind = 'new' | 'first' | 'full' | 'last'
export const PHASE_NAMES: Record<PhaseKind, string> = { new: 'New moon', first: 'First quarter', full: 'Full moon', last: 'Last quarter' }
const SYNODIC = 29.530588861

/** Instant of the lunar phase with Meeus index k (integer = new, +.25 first, +.5 full, +.75 last). */
export function phaseTime(k: number): number {
  const T = k / 1236.85
  let jde = 2451550.09766 + SYNODIC * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2
  const M = rad(2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3)
  const Mp = rad(201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4)
  const F = rad(160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4)
  const Om = rad(124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3)
  const s = Math.sin
  const frac = ((k % 1) + 1) % 1
  if (frac < 0.01 || frac > 0.99 || Math.abs(frac - 0.5) < 0.01) {
    const full = Math.abs(frac - 0.5) < 0.01
    jde +=
      (full ? -0.40614 : -0.4072) * s(Mp) +
      (full ? 0.17302 : 0.17241) * E * s(M) +
      (full ? 0.01614 : 0.01608) * s(2 * Mp) +
      (full ? 0.01043 : 0.01039) * s(2 * F) +
      (full ? 0.00734 : 0.00739) * E * s(Mp - M) -
      (full ? 0.00515 : 0.00514) * E * s(Mp + M) +
      (full ? 0.00209 : 0.00208) * E * E * s(2 * M) -
      0.00111 * s(Mp - 2 * F) -
      0.00057 * s(Mp + 2 * F) +
      0.00056 * E * s(2 * Mp + M) -
      0.00042 * s(3 * Mp) +
      0.00042 * E * s(M + 2 * F) +
      0.00038 * E * s(M - 2 * F) -
      0.00024 * E * s(2 * Mp - M) -
      0.00017 * s(Om)
  } else {
    jde +=
      -0.62801 * s(Mp) +
      0.17172 * E * s(M) -
      0.01183 * E * s(Mp + M) +
      0.00862 * s(2 * Mp) +
      0.00804 * s(2 * F) +
      0.00454 * E * s(Mp - M) +
      0.00204 * E * E * s(2 * M) -
      0.0018 * s(Mp - 2 * F) -
      0.0007 * s(Mp + 2 * F) -
      0.0004 * s(3 * Mp) -
      0.00034 * E * s(2 * Mp - M) +
      0.00032 * E * s(M + 2 * F) +
      0.00032 * E * s(M - 2 * F) -
      0.00028 * E * E * s(Mp + 2 * M) +
      0.00027 * E * s(2 * Mp + M) -
      0.00017 * s(Om)
    const c = Math.cos
    const W = 0.00306 - 0.00038 * E * c(M) + 0.00026 * c(Mp) - 0.00002 * c(Mp - M) + 0.00002 * c(Mp + M) + 0.00002 * c(2 * F)
    jde += frac < 0.5 ? W : -W
  }
  // JDE is Terrestrial Time; UTC is ~69 s behind. Close enough to leave.
  return msOfJd(jde)
}

export interface PhaseEvent {
  kind: PhaseKind
  at: number
}

/** Phase events from just before `now` onward. */
export function phasesAround(now: number, ahead = 8): { previous: PhaseEvent; next: PhaseEvent[] } {
  const yearFrac = 2000 + (now - Date.UTC(2000, 0, 6)) / (365.25 * DAY)
  let k = Math.floor((yearFrac - 2000) * 12.3685) - 1
  const kinds: PhaseKind[] = ['new', 'first', 'full', 'last']
  const events: PhaseEvent[] = []
  for (let i = 0; events.filter((e) => e.at > now).length < ahead; i++) {
    const kk = k + i * 0.25
    events.push({ kind: kinds[i % 4], at: phaseTime(kk) })
  }
  const past = events.filter((e) => e.at <= now)
  return { previous: past[past.length - 1], next: events.filter((e) => e.at > now) }
}

export interface MoonNow {
  /** days since the last new moon */
  age: number
  /** 0–1 lit fraction of the disc */
  illumination: number
  /** 0–360°, 0 new, 90 first quarter, 180 full, 270 last */
  phaseAngle: number
  waxing: boolean
  name: string
}

/**
 * Where the moon is in its cycle, interpolating the phase angle between the
 * actual phase instants on either side of now (more accurate than assuming
 * a uniform month), then illumination = (1 − cos angle) / 2.
 */
export function moonNow(now: number): MoonNow {
  const { previous, next } = phasesAround(now, 4)
  const angleOf: Record<PhaseKind, number> = { new: 0, first: 90, full: 180, last: 270 }
  const a0 = angleOf[previous.kind]
  const t = (now - previous.at) / (next[0].at - previous.at)
  const phaseAngle = (a0 + 90 * t) % 360
  const illumination = (1 - Math.cos(rad(phaseAngle))) / 2
  // Age from the last new moon (walk back through the events we have).
  const lastNew = previous.kind === 'new' ? previous.at : phasesBack(now)
  const age = (now - lastNew) / DAY
  const nearest = [previous, next[0]].reduce((a, b) => (Math.abs(a.at - now) < Math.abs(b.at - now) ? a : b))
  const name =
    Math.abs(nearest.at - now) < 0.75 * DAY
      ? PHASE_NAMES[nearest.kind]
      : phaseAngle < 90
        ? 'Waxing crescent'
        : phaseAngle < 180
          ? 'Waxing gibbous'
          : phaseAngle < 270
            ? 'Waning gibbous'
            : 'Waning crescent'
  return { age, illumination, phaseAngle, waxing: phaseAngle < 180, name }
}

function phasesBack(now: number): number {
  // The new moon that started this cycle: the latest k with integer index before now.
  let k = Math.floor(((now - Date.UTC(2000, 0, 6)) / DAY) / SYNODIC) + 1
  while (phaseTime(k) > now) k--
  return phaseTime(k)
}

/** Days in the cycle until a phase angle (degrees), for "full in 3 days". */
export const SYNODIC_DAYS = SYNODIC

// ── Calendar ────────────────────────────────────────────────────────────────

export function dayOfYear(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DAY) + 1
}
export function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}
/** ISO-8601 week number. */
export function isoWeek(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dow)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - yearStart) / DAY + 1) / 7)
}
