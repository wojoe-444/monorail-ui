/**
 * Collision-free label placement, shared by the annotated views.
 *
 * Greedy by priority: the most important label picks first, from a ranked
 * list of candidate boxes around its anchor (tight positions first, then
 * rings further out that need a leader line). A box is accepted when it stays
 * inside the bounds and hits no placed label and no obstacle (the marks
 * themselves). Labels with no free candidate are deferred, not squeezed in.
 * A uniform grid keeps the hit tests cheap at a few hundred labels.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad

export class RectIndex {
  private cells = new Map<number, Rect[]>()
  constructor(private cell = 48) {}
  private keys(r: Rect): number[] {
    const out: number[] = []
    const x0 = Math.floor(r.x / this.cell)
    const x1 = Math.floor((r.x + r.w) / this.cell)
    const y0 = Math.floor(r.y / this.cell)
    const y1 = Math.floor((r.y + r.h) / this.cell)
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) out.push(i * 100_003 + j)
    return out
  }
  add(r: Rect) {
    for (const k of this.keys(r)) {
      const list = this.cells.get(k)
      if (list) list.push(r)
      else this.cells.set(k, [r])
    }
  }
  hits(r: Rect, pad = 0, ignore?: Rect): boolean {
    for (const k of this.keys({ x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 })) {
      for (const o of this.cells.get(k) ?? []) if (o !== ignore && overlaps(r, o, pad)) return true
    }
    return false
  }
}

export interface LabelRequest {
  id: string
  /** Anchor: the mark the label explains. */
  x: number
  y: number
  /** Radius of the mark, so tight positions clear it. */
  r: number
  w: number
  h: number
  priority: number
  /** Allow positions further out with a leader line (default true). */
  leader?: boolean
  /** Extra rings (px beyond the tight ring) to try; default [10, 22, 38]. */
  rings?: number[]
}

export interface Placed {
  id: string
  rect: Rect
  /** Leader from the mark's edge to the nearest point of the label box, if displaced. */
  leader?: { x1: number; y1: number; x2: number; y2: number }
  /** Text anchor implied by the side the label sits on. */
  side: 'left' | 'right' | 'center'
}

const TIGHT: [number, number][] = [
  [1, 0], // E
  [-1, 0], // W
  [0.72, -0.72], // NE
  [-0.72, -0.72], // NW
  [0.72, 0.72], // SE
  [-0.72, 0.72], // SW
  [0, -1], // N
  [0, 1], // S
]

/** Box for a label whose nearest edge sits `d` from the anchor in direction (dx, dy). */
function boxAt(q: LabelRequest, dx: number, dy: number, d: number): Rect {
  const cx = q.x + dx * d
  const cy = q.y + dy * d
  const x = dx > 0.3 ? cx : dx < -0.3 ? cx - q.w : cx - q.w / 2
  const y = dy > 0.3 ? cy : dy < -0.3 ? cy - q.h : cy - q.h / 2
  return { x, y, w: q.w, h: q.h }
}

function nearestOnRect(px: number, py: number, r: Rect): [number, number] {
  return [Math.max(r.x, Math.min(px, r.x + r.w)), Math.max(r.y, Math.min(py, r.y + r.h))]
}

export function placeLabels(
  requests: LabelRequest[],
  opts: { bounds: Rect; obstacles?: Rect[]; pad?: number; taken?: RectIndex },
): { placed: Placed[]; deferred: string[]; index: RectIndex } {
  const pad = opts.pad ?? 2
  const labels = opts.taken ?? new RectIndex()
  const marks = new RectIndex()
  for (const o of opts.obstacles ?? []) marks.add(o)
  const b = opts.bounds
  const inside = (r: Rect) => r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h
  const placed: Placed[] = []
  const deferred: string[] = []

  for (const q of [...requests].sort((a, c) => c.priority - a.priority)) {
    const own: Rect = { x: q.x - q.r, y: q.y - q.r, w: q.r * 2, h: q.r * 2 }
    const tries: { rect: Rect; dx: number; dy: number; lead: boolean }[] = []
    for (const [dx, dy] of TIGHT) tries.push({ rect: boxAt(q, dx, dy, q.r + 3), dx, dy, lead: false })
    if (q.leader !== false) {
      for (const ring of q.rings ?? [10, 22, 38]) {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2
          const dx = Math.cos(a)
          const dy = Math.sin(a)
          tries.push({ rect: boxAt(q, dx, dy, q.r + 3 + ring), dx, dy, lead: true })
        }
      }
    }
    let ok: (typeof tries)[number] | undefined
    for (const t of tries) {
      if (!inside(t.rect)) continue
      if (labels.hits(t.rect, pad)) continue
      if (marks.hits(t.rect, 0.5, own)) continue
      ok = t
      break
    }
    if (!ok) {
      deferred.push(q.id)
      continue
    }
    labels.add(ok.rect)
    const side = ok.dx > 0.3 ? 'right' : ok.dx < -0.3 ? 'left' : 'center'
    let leader: Placed['leader']
    if (ok.lead) {
      const [x2, y2] = nearestOnRect(q.x, q.y, ok.rect)
      const len = Math.hypot(x2 - q.x, y2 - q.y) || 1
      leader = { x1: q.x + ((x2 - q.x) / len) * (q.r + 1), y1: q.y + ((y2 - q.y) / len) * (q.r + 1), x2, y2 }
    }
    placed.push({ id: q.id, rect: ok.rect, leader, side })
  }
  return { placed, deferred, index: labels }
}

/** 1D spread: keep sorted positions at least `gap` apart inside [lo, hi]. */
export function spread(ys: number[], gap: number, lo: number, hi: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  const out = order.map((o) => o.y)
  for (let k = 0; k < out.length; k++) out[k] = Math.max(out[k], k ? out[k - 1] + gap : lo)
  for (let k = out.length - 1; k >= 0; k--) out[k] = Math.min(out[k], k < out.length - 1 ? out[k + 1] - gap : hi)
  const res: number[] = new Array(ys.length)
  order.forEach((o, k) => (res[o.i] = out[k]))
  return res
}
