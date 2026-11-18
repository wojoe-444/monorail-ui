import type { CarbonSlot, Co2Month } from '@/features/lab/sources'

import { argExtreme, changePoints, firstCross, highestSince, rankNotes, spikes, steepest, type Note, type Pt } from './engine'

/**
 * Dataset builders for Margin Notes: turn a feed into points, run the
 * detectors, and word each finding as a sentence. Every number in a note
 * comes from the series; nothing is hand-written per dataset except which
 * detectors are worth running and the units.
 */

export interface DatasetView {
  pts: Pt[]
  notes: Note[]
  unit: string
  yLabel: string
  log: boolean
  fmtV: (v: number) => string
  fmtT: (t: number) => string
  /** Time axis ticks. */
  ticks: (t0: number, t1: number) => { t: number; label: string }[]
  /** Where the forecast starts, if part of the series is a forecast. */
  nowT?: number
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const signed = (v: number, digits = 1, unit = '') => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}${unit}`

// ── CO₂ ─────────────────────────────────────────────────────────────────────

const monthYear = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function co2View(rows: Co2Month[]): DatasetView {
  const pts: Pt[] = rows.map((r) => ({ t: Date.UTC(r.year, r.month - 1, 15), v: r.average }))
  const trend: Pt[] = rows.map((r) => ({ t: Date.UTC(r.year, r.month - 1, 15), v: r.trend }))
  const fmtV = (v: number) => `${v.toFixed(1)} ppm`
  const notes: Note[] = []
  const last = pts.length - 1
  const yearAgo = pts[last - 12]

  const first = pts[0]
  notes.push({
    id: 'start',
    kind: 'start',
    t: first.t,
    v: first.v,
    importance: 0.55,
    title: 'Records begin',
    text: `${fmtV(first.v)} in ${monthYear(first.t)}, the first monthly mean at Mauna Loa.`,
    side: 'bottom',
  })

  const hi = argExtreme(pts, 'max')
  // How often the annual peak set a new all-time record over the last 20 years.
  const years = new Map<number, number>()
  rows.forEach((r) => years.set(r.year, Math.max(years.get(r.year) ?? 0, r.average)))
  const yrs = [...years.entries()].sort((a, b) => a[0] - b[0])
  let runMax = 0
  let records = 0
  const recent = yrs.slice(-21, -1)
  for (const [y, m] of yrs) {
    if (m > runMax) {
      if (recent.some(([ry]) => ry === y)) records++
      runMax = m
    }
  }
  notes.push({
    id: 'high',
    kind: 'high',
    t: pts[hi].t,
    v: pts[hi].v,
    importance: 0.86,
    title: 'Record high',
    text: `${fmtV(pts[hi].v)} in ${monthYear(pts[hi].t)}. The yearly peak set a new record in ${records} of the last ${recent.length} years.`,
    side: 'top',
  })

  if (yearAgo && hi !== last) {
    const d = pts[last].v - yearAgo.v
    notes.push({
      id: 'now',
      kind: 'now',
      t: pts[last].t,
      v: pts[last].v,
      importance: 0.95,
      title: 'Latest',
      text: `${fmtV(pts[last].v)} in ${monthYear(pts[last].t)}, ${signed(d)} ppm on the same month a year earlier.`,
      side: 'bottom',
    })
  }

  for (const [th, imp] of [
    [350, 0.72],
    [400, 0.8],
    [420, 0.6],
  ] as const) {
    const i = firstCross(pts, th)
    if (i === undefined) continue
    notes.push({
      id: `cross${th}`,
      kind: 'cross',
      t: pts[i].t,
      v: pts[i].v,
      importance: imp,
      title: `Past ${th} ppm`,
      text: `The first month above ${th}: ${monthYear(pts[i].t)}, ${Math.round((pts[i].t - first.t) / 3.156e10)} years after records began.`,
    })
  }

  // Annual growth from the seasonally adjusted trend.
  const growth: Pt[] = []
  for (let i = 12; i < trend.length; i++) growth.push({ t: trend[i].t, v: trend[i].v - trend[i - 12].v })
  if (growth.length > 24) {
    const gi = argExtreme(growth, 'max')
    const g = growth[gi]
    const pi = pts.findIndex((p) => p.t === g.t)
    notes.push({
      id: 'rise',
      kind: 'rise',
      t: g.t,
      v: pts[pi]?.v ?? 0,
      t0: g.t - 3.156e10,
      t1: g.t,
      importance: 0.76,
      title: 'Fastest year',
      text: `${signed(g.v)} ppm in the 12 months to ${monthYear(g.t)}, the biggest annual rise on record.`,
      side: 'top',
    })
    const from1960 = growth.findIndex((p) => new Date(p.t).getUTCFullYear() >= 1960)
    const si = argExtreme(growth, 'min', Math.max(0, from1960))
    const s = growth[si]
    const spi = pts.findIndex((p) => p.t === s.t)
    notes.push({
      id: 'slow',
      kind: 'fall',
      t: s.t,
      v: pts[spi]?.v ?? 0,
      t0: s.t - 3.156e10,
      t1: s.t,
      importance: 0.58,
      title: 'Slowest year',
      text: `Only ${signed(s.v)} ppm in the 12 months to ${monthYear(s.t)}, the smallest rise since 1960.`,
      side: 'bottom',
    })

    // Change points in yearly growth: when the pace itself stepped up.
    const annual = new Map<number, number[]>()
    growth.forEach((p) => {
      const y = new Date(p.t).getUTCFullYear()
      annual.set(y, [...(annual.get(y) ?? []), p.v])
    })
    const ys = [...annual.keys()].sort((a, b) => a - b)
    const gv = ys.map((y) => annual.get(y)!.reduce((a, b) => a + b, 0) / annual.get(y)!.length)
    for (const cp of changePoints(gv, 8, 2)) {
      const y = ys[cp.i]
      const t = Date.UTC(y, 0, 15)
      const pi2 = pts.findIndex((p) => p.t >= t)
      notes.push({
        id: `shift${y}`,
        kind: 'shift',
        t,
        v: pts[pi2]?.v ?? 0,
        importance: 0.45 + Math.min(0.3, cp.score * 0.12),
        title: cp.after > cp.before ? 'The pace picks up' : 'The pace eases',
        text: `Annual growth averaged ${cp.before.toFixed(1)} ppm a year before ${y} and ${cp.after.toFixed(1)} after.`,
      })
    }
  }

  // The seasonal breath over the latest 12 months.
  const yr = pts.slice(-12)
  const yMax = yr.reduce((a, b) => (b.v > a.v ? b : a))
  const yMin = yr.reduce((a, b) => (b.v < a.v ? b : a))
  notes.push({
    id: 'swing',
    kind: 'swing',
    t: yMin.t,
    v: yMin.v,
    t0: yr[0].t,
    t1: yr[yr.length - 1].t,
    importance: 0.5,
    title: 'The yearly breath',
    text: `${(yMax.v - yMin.v).toFixed(1)} ppm between ${new Date(yMax.t).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })}’s high and ${new Date(yMin.t).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })}’s low over the last year.`,
    side: 'bottom',
  })

  return {
    pts,
    notes: rankNotes(notes, 3.156e10 * 1.5),
    unit: 'ppm',
    yLabel: 'CO₂, parts per million',
    log: false,
    fmtV,
    fmtT: monthYear,
    ticks: (t0, t1) => {
      const out: { t: number; label: string }[] = []
      for (let y = Math.ceil(new Date(t0).getUTCFullYear() / 10) * 10; y <= new Date(t1).getUTCFullYear(); y += 10) out.push({ t: Date.UTC(y, 0, 1), label: String(y) })
      return out
    },
  }
}

// ── GB grid ─────────────────────────────────────────────────────────────────

const ukTime = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
const ukDay = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Europe/London' })
const ukWhen = (t: number) => `${ukTime(t)} ${ukDay(t)}`
function partOfDay(t: number): string {
  const h = +new Date(t).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/London' })
  if (h >= 16 && h < 21) return 'the evening peak'
  if (h >= 6 && h < 10) return 'the morning ramp'
  if (h >= 10 && h < 16) return 'the middle of the day'
  return 'the small hours'
}

export function gridView(slots: CarbonSlot[], now: number): DatasetView {
  const pts: Pt[] = slots.map((s) => ({ t: s.from, v: s.actual ?? s.forecast, forecast: s.actual == null }))
  const fmtV = (v: number) => `${Math.round(v)} g`
  const notes: Note[] = []
  const nowI = Math.max(0, slots.findIndex((s) => s.from <= now && now < s.to))
  const fc = (i: number) => (pts[i].forecast ? ', forecast' : '')

  notes.push({
    id: 'now',
    kind: 'now',
    t: pts[nowI].t,
    v: pts[nowI].v,
    importance: 0.95,
    title: 'Now',
    text: `${fmtV(pts[nowI].v)} of CO₂ per kWh, rated ${slots[nowI].index}.`,
  })
  const hi = argExtreme(pts, 'max')
  notes.push({
    id: 'high',
    kind: 'high',
    t: pts[hi].t,
    v: pts[hi].v,
    importance: 0.86,
    title: 'Dirtiest half hour',
    text: `${fmtV(pts[hi].v)} at ${ukWhen(pts[hi].t)}${fc(hi)}, during ${partOfDay(pts[hi].t)}.`,
    side: 'top',
  })
  const lo = argExtreme(pts, 'min')
  notes.push({
    id: 'low',
    kind: 'low',
    t: pts[lo].t,
    v: pts[lo].v,
    importance: 0.86,
    title: 'Cleanest half hour',
    text: `${fmtV(pts[lo].v)} at ${ukWhen(pts[lo].t)}${fc(lo)}, ${Math.round((1 - pts[lo].v / pts[hi].v) * 100)}% cleaner than the worst.`,
    side: 'bottom',
  })
  const up = steepest(pts, 6, 'up')
  if (up && up.delta > 0) {
    notes.push({
      id: 'rise',
      kind: 'rise',
      t: pts[up.i1].t,
      v: pts[up.i1].v,
      t0: pts[up.i0].t,
      t1: pts[up.i1].t,
      importance: 0.7,
      title: 'Fastest climb',
      text: `${signed(up.delta, 0, ' g')} in three hours, to ${fmtV(pts[up.i1].v)} by ${ukWhen(pts[up.i1].t)}.`,
      side: 'top',
    })
  }
  const down = steepest(pts, 6, 'down')
  if (down && down.delta < 0) {
    notes.push({
      id: 'fall',
      kind: 'fall',
      t: pts[down.i1].t,
      v: pts[down.i1].v,
      t0: pts[down.i0].t,
      t1: pts[down.i1].t,
      importance: 0.66,
      title: 'Fastest clean-up',
      text: `${signed(down.delta, 0, ' g')} in three hours, down to ${fmtV(pts[down.i1].v)} by ${ukWhen(pts[down.i1].t)}.`,
      side: 'bottom',
    })
  }
  // Index category changes.
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].index === slots[i - 1].index) continue
    const worse = pts[i].v > pts[i - 1].v
    notes.push({
      id: `cat${i}`,
      kind: 'category',
      t: pts[i].t,
      v: pts[i].v,
      importance: 0.4 + (/high/.test(slots[i].index) ? 0.12 : 0),
      title: `${worse ? 'Up' : 'Down'} to “${slots[i].index}”`,
      text: `From “${slots[i - 1].index}” at ${ukWhen(pts[i].t)}${fc(i)}.`,
    })
  }
  // Forecast vs actual, where both exist.
  let miss: { i: number; d: number } | undefined
  slots.forEach((s, i) => {
    if (s.actual == null) return
    const d = s.actual - s.forecast
    if (!miss || Math.abs(d) > Math.abs(miss.d)) miss = { i, d }
  })
  if (miss && Math.abs(miss.d) >= 8) {
    const s = slots[miss.i]
    notes.push({
      id: 'miss',
      kind: 'miss',
      t: s.from,
      v: s.actual!,
      importance: 0.5 + Math.min(0.2, Math.abs(miss.d) / 200),
      title: 'Biggest forecast miss',
      text: `${fmtV(s.actual!)} measured against ${fmtV(s.forecast)} forecast at ${ukWhen(s.from)}: ${miss.d > 0 ? 'dirtier' : 'cleaner'} by ${Math.abs(miss.d)} g.`,
    })
  }
  for (const cp of changePoints(pts.map((p) => p.v), 8, 2)) {
    notes.push({
      id: `shift${cp.i}`,
      kind: 'shift',
      t: pts[cp.i].t,
      v: pts[cp.i].v,
      importance: 0.4 + Math.min(0.25, cp.score * 0.1),
      title: cp.after > cp.before ? 'The level steps up' : 'The level steps down',
      text: `Averaging ${fmtV(cp.before)} before ${ukWhen(pts[cp.i].t)} and ${fmtV(cp.after)} after.`,
    })
  }
  return {
    pts,
    notes: rankNotes(notes, 75 * 60_000),
    unit: 'gCO₂/kWh',
    yLabel: 'Carbon intensity, gCO₂/kWh',
    log: false,
    fmtV,
    fmtT: ukWhen,
    nowT: pts[nowI].t,
    ticks: (t0, t1) => {
      const out: { t: number; label: string }[] = []
      const step = 6 * 3600_000
      for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) out.push({ t, label: ukTime(t) === '00:00' ? ukDay(t) : ukTime(t) })
      return out
    },
  }
}

// ── Wikipedia article ───────────────────────────────────────────────────────

const dayLabel = (t: number) => new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const views = (v: number) => `${compact.format(v)} views`

export function wikiView(pts: Pt[], title: string): DatasetView {
  const notes: Note[] = []
  const vals = pts.map((p) => p.v)
  const sorted = [...vals].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] || 1
  const last = pts.length - 1
  const hi = argExtreme(pts, 'max')
  const isLatest = hi === last
  notes.push({
    id: 'high',
    kind: 'high',
    t: pts[hi].t,
    v: pts[hi].v,
    importance: 0.95,
    title: isLatest ? 'Peak, and the latest day' : 'Peak',
    text: `${views(pts[hi].v)} on ${dayLabel(pts[hi].t)}, ${Math.round(pts[hi].v / median).toLocaleString()}× a typical day for “${title}” over these ${pts.length} days.`,
    side: 'top',
  })
  if (!isLatest) {
    const since = highestSince(pts, last)
    notes.push({
      id: 'now',
      kind: 'now',
      t: pts[last].t,
      v: pts[last].v,
      importance: 0.8,
      title: 'Latest',
      text: `${views(pts[last].v)} on ${dayLabel(pts[last].t)}${since === undefined ? ', the most yet' : since === last - 1 ? '' : `, the most since ${dayLabel(pts[since].t)}`}; ${pts[last].v >= pts[last - 1].v ? 'up' : 'down'} ${Math.abs(Math.round((pts[last].v / pts[last - 1].v - 1) * 100))}% on the day before.`,
      side: 'bottom',
    })
  }
  const lo = argExtreme(pts, 'min')
  notes.push({
    id: 'low',
    kind: 'low',
    t: pts[lo].t,
    v: pts[lo].v,
    importance: 0.42,
    title: 'Quietest day',
    text: `${views(pts[lo].v)} on ${dayLabel(pts[lo].t)}.`,
    side: 'bottom',
  })
  const jump = steepest(pts, 1, 'up')
  if (jump && jump.delta > median) {
    notes.push({
      id: 'rise',
      kind: 'rise',
      t: pts[jump.i1].t,
      v: pts[jump.i1].v,
      t0: pts[jump.i0].t,
      t1: pts[jump.i1].t,
      importance: 0.72,
      title: 'Biggest one-day jump',
      text: `${signed(jump.delta / 1000, 0, 'K')} views from ${dayLabel(pts[jump.i0].t)} to ${dayLabel(pts[jump.i1].t)}.`,
      side: 'top',
    })
  }
  const sp = spikes(vals, 7)
    .filter((s) => s.z > 4 && s.i !== hi)
    .sort((a, b) => b.z - a.z)
    .slice(0, 3)
  for (const s of sp) {
    notes.push({
      id: `spike${s.i}`,
      kind: 'spike',
      t: pts[s.i].t,
      v: pts[s.i].v,
      importance: 0.5 + Math.min(0.2, s.z / 60),
      title: 'Spike',
      text: `${views(pts[s.i].v)} on ${dayLabel(pts[s.i].t)}, ${s.ratio.toFixed(s.ratio < 10 ? 1 : 0)}× the week around it.`,
      side: 'top',
    })
  }
  const cross = firstCross(pts, median * 10)
  if (cross !== undefined && cross !== hi) {
    notes.push({
      id: 'cross',
      kind: 'cross',
      t: pts[cross].t,
      v: pts[cross].v,
      importance: 0.6,
      title: 'Ten times normal',
      text: `The first day above ${compact.format(median * 10)} views, ten times the typical day: ${dayLabel(pts[cross].t)}.`,
    })
  }
  for (const cp of changePoints(vals.map((v) => Math.log10(Math.max(1, v))), 5, 2)) {
    const before = 10 ** cp.before
    const after = 10 ** cp.after
    notes.push({
      id: `shift${cp.i}`,
      kind: 'shift',
      t: pts[cp.i].t,
      v: pts[cp.i].v,
      importance: 0.45 + Math.min(0.25, cp.score * 0.1),
      title: after > before ? 'A new baseline' : 'Back to quiet',
      text: `Typical days ran about ${compact.format(before)} views before ${dayLabel(pts[cp.i].t)} and ${compact.format(after)} after.`,
    })
  }
  return {
    pts,
    notes: rankNotes(notes, 1.5 * 86400_000),
    unit: 'views',
    yLabel: 'Daily views (log scale)',
    log: true,
    fmtV: (v) => views(v),
    fmtT: dayLabel,
    ticks: (t0, t1) => {
      const out: { t: number; label: string }[] = []
      const step = 7 * 86400_000
      for (let t = t1; t >= t0; t -= step) out.unshift({ t, label: new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) })
      return out
    },
  }
}
