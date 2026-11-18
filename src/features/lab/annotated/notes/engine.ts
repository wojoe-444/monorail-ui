/**
 * The annotation engine behind Margin Notes. Detectors read a series and
 * return candidate notes, each with an importance score; dataset builders
 * (./datasets.ts) word them as sentences; `rankNotes` orders them, drops the
 * weaker of any two that crowd the same moment, and numbers what's left.
 *
 * Detectors are deliberately simple and explainable: extremes, the steepest
 * run over a window, change points by binary segmentation on the mean,
 * spikes against a rolling median (scored with the median absolute deviation),
 * first crossings of a threshold, and "highest since".
 */

export interface Pt {
  t: number
  v: number
  /** A forecast value rather than a measurement. */
  forecast?: boolean
}

export type NoteKind = 'now' | 'start' | 'high' | 'low' | 'rise' | 'fall' | 'shift' | 'spike' | 'dip' | 'cross' | 'miss' | 'swing' | 'category'

export const KIND_LABEL: Record<NoteKind, string> = {
  now: 'latest',
  start: 'start',
  high: 'record high',
  low: 'record low',
  rise: 'steepest rise',
  fall: 'steepest fall',
  shift: 'change point',
  spike: 'spike',
  dip: 'dip',
  cross: 'threshold',
  miss: 'forecast miss',
  swing: 'range',
  category: 'category change',
}

export interface Note {
  id: string
  kind: NoteKind
  /** Anchor: the point the note's leader lands on. */
  t: number
  v: number
  /** Optional span the note is about (a run, a season, a segment). */
  t0?: number
  t1?: number
  /** 0–1-ish; higher is more important. */
  importance: number
  title: string
  text: string
  /** Which margin to prefer; otherwise chosen from where the point sits. */
  side?: 'top' | 'bottom'
  /** Rank after ranking (1 = most important). */
  rank?: number
}

export function argExtreme(pts: Pt[], which: 'max' | 'min', from = 0, to = pts.length): number {
  let best = from
  for (let i = from; i < to; i++) if (which === 'max' ? pts[i].v > pts[best].v : pts[i].v < pts[best].v) best = i
  return best
}

/** The run of `w` steps with the largest rise (or fall). */
export function steepest(pts: Pt[], w: number, dir: 'up' | 'down'): { i0: number; i1: number; delta: number } | undefined {
  let best: { i0: number; i1: number; delta: number } | undefined
  for (let i = 0; i + w < pts.length; i++) {
    const d = pts[i + w].v - pts[i].v
    if (!best || (dir === 'up' ? d > best.delta : d < best.delta)) best = { i0: i, i1: i + w, delta: d }
  }
  return best
}

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1)
function sse(lo: number, hi: number, pre: number[], pre2: number[]) {
  const n = hi - lo
  if (n <= 0) return 0
  const s = pre[hi] - pre[lo]
  const s2 = pre2[hi] - pre2[lo]
  return s2 - (s * s) / n
}

/**
 * Change points in the mean by binary segmentation: split where the drop in
 * squared error is largest, recurse on the pieces, keep up to `max` splits.
 * Score = jump in mean divided by the series' overall standard deviation.
 */
export function changePoints(vals: number[], minSeg: number, max: number): { i: number; before: number; after: number; score: number }[] {
  const pre = [0]
  const pre2 = [0]
  for (const v of vals) {
    pre.push(pre[pre.length - 1] + v)
    pre2.push(pre2[pre2.length - 1] + v * v)
  }
  const sd = Math.sqrt(Math.max(1e-12, sse(0, vals.length, pre, pre2) / vals.length))
  const out: { i: number; before: number; after: number; score: number }[] = []
  const segs: [number, number][] = [[0, vals.length]]
  while (out.length < max && segs.length) {
    let best: { gain: number; i: number; seg: number } | undefined
    segs.forEach(([lo, hi], s) => {
      const total = sse(lo, hi, pre, pre2)
      for (let i = lo + minSeg; i <= hi - minSeg; i++) {
        const gain = total - sse(lo, i, pre, pre2) - sse(i, hi, pre, pre2)
        if (!best || gain > best.gain) best = { gain, i, seg: s }
      }
    })
    if (!best) break
    const [lo, hi] = segs[best.seg]
    const before = mean(vals.slice(lo, best.i))
    const after = mean(vals.slice(best.i, hi))
    const score = Math.abs(after - before) / sd
    if (score < 0.5) break
    out.push({ i: best.i, before, after, score })
    segs.splice(best.seg, 1, [lo, best.i], [best.i, hi])
  }
  return out
}

/** Residual from a centred rolling median, in robust z units (MAD). */
export function spikes(vals: number[], w: number): { i: number; z: number; ratio: number; base: number }[] {
  const half = Math.floor(w / 2)
  const base = vals.map((_, i) => {
    const win = vals.slice(Math.max(0, i - half), Math.min(vals.length, i + half + 1)).sort((a, b) => a - b)
    return win[Math.floor(win.length / 2)]
  })
  const resid = vals.map((v, i) => v - base[i])
  const absr = resid.map(Math.abs).sort((a, b) => a - b)
  const mad = absr[Math.floor(absr.length / 2)] || 1e-9
  return vals.map((v, i) => ({ i, z: resid[i] / (1.4826 * mad), ratio: base[i] ? v / base[i] : Infinity, base: base[i] }))
}

/** First index where the series goes from below `th` to at-or-above it. */
export function firstCross(pts: Pt[], th: number): number | undefined {
  for (let i = 1; i < pts.length; i++) if (pts[i - 1].v < th && pts[i].v >= th) return i
  return undefined
}

/** The last earlier point at or above this one's value, or undefined if it's the highest ever. */
export function highestSince(pts: Pt[], i: number): number | undefined {
  for (let j = i - 1; j >= 0; j--) if (pts[j].v >= pts[i].v) return j
  return undefined
}

/**
 * Order by importance, drop the weaker of two notes within `minGap` of each
 * other (in t units), and number the rest.
 */
export function rankNotes(notes: Note[], minGap: number): Note[] {
  const kept: Note[] = []
  for (const n of [...notes].sort((a, b) => b.importance - a.importance)) {
    if (kept.some((k) => Math.abs(k.t - n.t) < minGap)) continue
    kept.push(n)
  }
  return kept.map((n, i) => ({ ...n, rank: i + 1 }))
}
