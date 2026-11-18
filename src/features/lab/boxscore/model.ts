/* eslint-disable @typescript-eslint/no-explicit-any */
import { CARBON_BASE } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'

/*
 * The GB grid's day as a game. Players are fuels, teams are low-carbon /
 * fossil / imports, the game is one UK calendar day (00:00–24:00 Europe/
 * London), split into four six-hour periods. One request covers the day
 * before yesterday through now, so "yesterday" (final) and "today" (live)
 * each have a previous day to compare with.
 */

export const UK = 'Europe/London'
const HALF = 30 * 60_000

export const FUELS = ['wind', 'nuclear', 'gas', 'imports', 'biomass', 'solar', 'hydro', 'coal', 'other'] as const
export type Fuel = (typeof FUELS)[number]
export const FUEL_LABEL: Record<Fuel, string> = {
  wind: 'Wind',
  nuclear: 'Nuclear',
  gas: 'Gas',
  imports: 'Imports',
  biomass: 'Biomass',
  solar: 'Solar',
  hydro: 'Hydro',
  coal: 'Coal',
  other: 'Other',
}

export type TeamKey = 'low' | 'fossil' | 'imports'
export const TEAMS: { key: TeamKey; label: string; code: string; fuels: Fuel[] }[] = [
  { key: 'low', label: 'Low-carbon', code: 'LC', fuels: ['wind', 'nuclear', 'solar', 'hydro', 'biomass'] },
  { key: 'fossil', label: 'Fossil', code: 'FOS', fuels: ['gas', 'coal', 'other'] },
  { key: 'imports', label: 'Imports', code: 'IMP', fuels: ['imports'] },
]
export const teamOf = (f: Fuel) => TEAMS.find((t) => t.fuels.includes(f))!

export interface GenSlot {
  from: number
  mix: Record<Fuel, number>
}
export interface IntSlot {
  from: number
  v: number
  actual: boolean
}

/** UTC ms of 00:00 UK time on the UK calendar day containing t. */
export function ukDayStart(t: number): number {
  const [y, m, d] = new Date(t).toLocaleDateString('en-CA', { timeZone: UK }).split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d)
  const h = +new Date(guess).toLocaleString('en-GB', { timeZone: UK, hour: '2-digit', hour12: false })
  return h === 0 ? guess : guess - h * 3600_000
}
export const ukNextDay = (start: number) => ukDayStart(start + 26 * 3600_000)
export const ukHm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: UK })
export const ukDateLong = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: UK })

const iso = (t: number) => new Date(t).toISOString().slice(0, 16) + 'Z'

export function useBoxData(now: number) {
  const start = ukDayStart(ukDayStart(ukDayStart(now) - 1) - 1) // the day before yesterday, 00:00 UK
  const end = Math.floor(now / HALF) * HALF
  const range = `${iso(start)}/${iso(end)}`
  const gen = useLiveData<GenSlot[]>(`${CARBON_BASE}/generation/${range}`, {
    key: `boxscore:gen:${range}`,
    parse: (r: any) =>
      (r.data as any[]).map((d) => {
        const mix = Object.fromEntries(FUELS.map((f) => [f, 0])) as Record<Fuel, number>
        for (const g of d.generationmix as { fuel: Fuel; perc: number }[]) if (g.fuel in mix) mix[g.fuel] = g.perc
        return { from: Date.parse(d.from), mix }
      }),
  })
  const int = useLiveData<IntSlot[]>(`${CARBON_BASE}/intensity/${range}`, {
    key: `boxscore:int:${range}`,
    parse: (r: any) =>
      (r.data as any[])
        .filter((d) => d.intensity.actual != null || d.intensity.forecast != null)
        .map((d) => ({ from: Date.parse(d.from), v: d.intensity.actual ?? d.intensity.forecast, actual: d.intensity.actual != null })),
  })
  return { gen, int }
}

// ── game ────────────────────────────────────────────────────────────────────

export interface Stat {
  avg: number
  high: number
  highAt: number
  low: number
  lowAt: number
}
export interface Player extends Stat {
  fuel: Fuel
  team: TeamKey
  /** Hours with a share above 0.5% */
  min: number
  vsPrev: number | null
  spark: number[]
  dnp: boolean
}
export interface Team extends Stat {
  key: TeamKey
  label: string
  code: string
  vsPrev: number | null
  periods: (number | null)[]
  spark: number[]
}
export interface Game {
  start: number
  end: number
  live: boolean
  slots: GenSlot[]
  players: Player[]
  teams: Team[]
  periodLabels: string[]
  /** Index of the period in progress (live), else 4. */
  period: number
  intensity: (IntSlot & { mid: number })[]
  prevTeams: Record<TeamKey, number> | null
}

function stat(values: { t: number; v: number }[]): Stat {
  let hi = values[0]
  let lo = values[0]
  let sum = 0
  for (const x of values) {
    sum += x.v
    if (x.v > hi.v) hi = x
    if (x.v < lo.v) lo = x
  }
  return { avg: sum / values.length, high: hi.v, highAt: hi.t, low: lo.v, lowAt: lo.t }
}

const slotsIn = (slots: GenSlot[], a: number, b: number) => slots.filter((s) => s.from >= a && s.from < b)

export function buildGame(gen: GenSlot[], int: IntSlot[], dayStart: number, now: number): Game | null {
  const end = ukNextDay(dayStart)
  const live = end > now
  const slots = slotsIn(gen, dayStart, end)
  if (slots.length < 2) return null
  const prevStart = ukDayStart(dayStart - 1)
  const prev = slotsIn(gen, prevStart, dayStart)
  const prevAvg = (f: (s: GenSlot) => number) => (prev.length >= 24 ? prev.reduce((a, s) => a + f(s), 0) / prev.length : null)

  const players: Player[] = FUELS.map((fuel) => {
    const vals = slots.map((s) => ({ t: s.from, v: s.mix[fuel] }))
    const st = stat(vals)
    const p = prevAvg((s) => s.mix[fuel])
    return {
      fuel,
      team: teamOf(fuel).key,
      ...st,
      min: vals.filter((x) => x.v > 0.5).length / 2,
      vsPrev: p === null ? null : st.avg - p,
      spark: vals.map((x) => x.v),
      dnp: st.high < 0.05,
    }
  }).sort((a, b) => Number(a.dnp) - Number(b.dnp) || b.avg - a.avg)

  const period = live ? Math.min(3, Math.floor((now - dayStart) / (6 * 3600_000))) : 4
  const teams: Team[] = TEAMS.map((t) => {
    const share = (s: GenSlot) => t.fuels.reduce((a, f) => a + s.mix[f], 0)
    const vals = slots.map((s) => ({ t: s.from, v: share(s) }))
    const p = prevAvg(share)
    const periods = [0, 1, 2, 3].map((i) => {
      const ps = slotsIn(slots, dayStart + i * 6 * 3600_000, dayStart + (i + 1) * 6 * 3600_000)
      return ps.length ? ps.reduce((a, s) => a + share(s), 0) / ps.length : null
    })
    const st = stat(vals)
    return { key: t.key, label: t.label, code: t.code, ...st, vsPrev: p === null ? null : st.avg - p, periods, spark: vals.map((x) => x.v) }
  })

  const prevTeams =
    prev.length >= 24
      ? (Object.fromEntries(TEAMS.map((t) => [t.key, prev.reduce((a, s) => a + t.fuels.reduce((b, f) => b + s.mix[f], 0), 0) / prev.length])) as Record<TeamKey, number>)
      : null

  // Period labels in UK clock time (a 23- or 25-hour day shifts them, so read them off the clock).
  const periodLabels = [0, 1, 2, 3].map((i) => `${ukHm(dayStart + i * 6 * 3600_000).slice(0, 2)}–${i === 3 ? '24' : ukHm(dayStart + (i + 1) * 6 * 3600_000).slice(0, 2)}`)

  const intensity = int.filter((s) => s.from >= dayStart && s.from < end && s.from <= now).map((s) => ({ ...s, mid: s.from + HALF / 2 }))

  return { start: dayStart, end, live, slots, players, teams, periodLabels, period, intensity, prevTeams }
}

export const pct = (v: number) => (v >= 9.95 ? v.toFixed(0) : v.toFixed(1))
