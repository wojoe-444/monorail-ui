/**
 * The character grid: 40 columns, built from rows of styled segments. Every
 * row is padded or cut to exactly 40 characters, so pages line up like a
 * real paged-text service. Block characters do the charts.
 */

export const COLS = 40
/** Content rows between the header row and the fastext row. */
export const ROWS = 23

export type Tone = 'fg' | 'muted' | 'primary' | 'highlight' | 'success' | 'warning' | 'danger' | 'info' | 's1' | 's2' | 's3' | 's4'
export type Bg = 'primary' | 'highlight' | 'muted' | 'success' | 'warning' | 'danger' | 'info'

export interface Seg {
  t: string
  tone?: Tone
  bg?: Bg
  bold?: boolean
  /** A page number this segment links to. */
  go?: number
  /** An outside link (opens in a new tab). */
  href?: string
  /** Block characters draw as thin horizontal bars (60% of the line) instead of full cells. */
  thin?: boolean
}

export interface Row {
  segs: Seg[]
  /** Double height: the row draws over the row below it too. */
  dh?: boolean
}

export type Screen = Row[]

const len = (s: string) => [...s].length

export function fit(s: string, n: number): string {
  const chars = [...s]
  return chars.length > n ? chars.slice(0, Math.max(0, n - 1)).join('') + '…' : s
}
export const padR = (s: string, n: number) => fit(s, n) + ' '.repeat(Math.max(0, n - len(fit(s, n))))
export const padL = (s: string, n: number) => ' '.repeat(Math.max(0, n - len(fit(s, n)))) + fit(s, n)
export const center = (s: string, n = COLS) => {
  const f = fit(s, n)
  const left = Math.floor((n - len(f)) / 2)
  return ' '.repeat(left) + f + ' '.repeat(n - left - len(f))
}

export const s = (t: string, tone?: Tone, extra: Omit<Seg, 't' | 'tone'> = {}): Seg => ({ t, tone, ...extra })

/** A row of segments, padded or cut to exactly 40 characters. */
export function row(...parts: (Seg | string | false | null | undefined)[]): Row {
  const segs: Seg[] = []
  let used = 0
  for (const p of parts) {
    if (!p) continue
    const seg = typeof p === 'string' ? { t: p } : p
    const room = COLS - used
    if (room <= 0) break
    const t = len(seg.t) > room ? [...seg.t].slice(0, room).join('') : seg.t
    segs.push({ ...seg, t })
    used += len(t)
  }
  if (used < COLS) segs.push({ t: ' '.repeat(COLS - used) })
  return { segs }
}

export const blank = (): Row => row('')

/** A full-width colored bar with a title, the classic section header. */
export function bar(title: string, bg: Bg = 'primary', right = ''): Row {
  const inner = COLS - 2
  const r = right ? ` ${right}` : ''
  return row(s(` ${padR(title, inner - len(r))}${r} `, undefined, { bg, bold: true }))
}

export function dh(r: Row): Row {
  return { ...r, dh: true }
}

/** Left text and right text on one row, with dot leaders between when `dots`. */
export function lr(left: Seg | string, right: Seg | string, dots = false): Row {
  const L = typeof left === 'string' ? { t: left } : left
  const R = typeof right === 'string' ? { t: right } : right
  const gap = Math.max(1, COLS - len(L.t) - len(R.t))
  const fill = dots ? ' ' + '.'.repeat(Math.max(0, gap - 2)) + ' ' : ' '.repeat(gap)
  return row(L, s(fill, 'muted'), R)
}

/** Wrap prose into lines of at most `width` characters. */
export function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    if (!line) line = fit(w, width)
    else if (len(line) + 1 + len(w) <= width) line += ' ' + w
    else {
      out.push(line)
      line = fit(w, width)
    }
  }
  if (line) out.push(line)
  return out
}

const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']
/** Horizontal bar resolved to eighths of a cell. */
export function hbar(frac: number, width: number): string {
  const cells = Math.max(0, Math.min(1, frac)) * width
  const full = Math.floor(cells)
  const rest = EIGHTHS[Math.round((cells - full) * 8) % 8]
  return '█'.repeat(full) + rest
}

const RISE = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
/** One character per value, ▁ to █, scaled to [min, max]. */
export function spark(values: number[], min = Math.min(...values), max = Math.max(...values)): string {
  return values.map((v) => RISE[Math.max(0, Math.min(7, Math.round(((v - min) / (max - min || 1)) * 7)))]).join('')
}

const UP = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
/**
 * Vertical column chart in block characters: `height` rows, one column per
 * value, each row one step of the scale resolved to eighths. `tone` colors a
 * column; `label` fills a left gutter for each row (axis ticks).
 */
export function columns(
  values: (number | null)[],
  opts: { height: number; max: number; tone: (i: number) => Tone; gutter?: number; label?: (rowFromTop: number) => string },
): Row[] {
  const { height, max, tone, gutter = 0, label } = opts
  const rows: Row[] = []
  for (let r = 0; r < height; r++) {
    const level = height - r - 1 // 0 is the bottom row
    const segs: Seg[] = []
    if (gutter) segs.push(s(padL(label?.(r) ?? '', gutter - 1) + '│', 'muted'))
    let run = ''
    let runTone: Tone | undefined
    const flush = () => {
      if (run) segs.push(s(run, runTone))
      run = ''
    }
    values.forEach((v, i) => {
      let ch = ' '
      if (v !== null && v > 0) {
        const cells = (Math.min(v, max) / max) * height
        if (cells >= level + 1) ch = '█'
        else if (cells > level) ch = UP[Math.max(1, Math.round((cells - level) * 8))]
      }
      const t = ch === ' ' ? undefined : tone(i)
      if (t !== runTone) flush()
      runTone = t
      run += ch
    })
    flush()
    rows.push(row(...segs))
  }
  return rows
}

export function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`
  return String(Math.round(n))
}

export const upper = (x: string) => x.toUpperCase()

/** Split a list into screens of `per` rows each, with a builder per screen. */
export function paginate<T>(items: T[], per: number, max = 5): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length && out.length < max; i += per) out.push(items.slice(i, i + per))
  return out.length ? out : [[]]
}
