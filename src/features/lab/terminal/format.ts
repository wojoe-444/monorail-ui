/** HH:MM:SS in UTC. */
export function utcTime(t: number): string {
  return new Date(t).toISOString().slice(11, 19)
}

/** HH:MM in UTC. */
export function utcHm(t: number): string {
  return new Date(t).toISOString().slice(11, 16)
}

/** "Nov 17" in UTC. */
export function utcDay(t: number): string {
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** Compact age: 12s / 4m / 3h / 2d. */
export function ago(t: number | undefined, now = Date.now()): string {
  if (!t) return '—'
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 172_800) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86_400)}d`
}

const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

/** A bar of block characters, `width` cells at 100%, resolved to eighths of a cell. */
export function blockBar(frac: number, width: number): string {
  const cells = Math.max(0, Math.min(1, frac)) * width
  const full = Math.floor(cells)
  return '█'.repeat(full) + EIGHTHS[Math.round((cells - full) * 8) % 8]
}

/** Round tick values covering [min, max], about `count` of them. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6)
  return out
}

/** UTC midnights strictly inside [t0, t1]. */
export function utcMidnights(t0: number, t1: number): number[] {
  const out: number[] = []
  const d = new Date(t0)
  d.setUTCHours(24, 0, 0, 0)
  for (let t = d.getTime(); t < t1; t += 86_400_000) out.push(t)
  return out
}
