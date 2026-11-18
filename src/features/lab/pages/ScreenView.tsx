import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

import type { Bg, Row, Seg, Tone } from './screen'

/**
 * Draws rows of segments as a fixed character grid. The grid is sized in
 * `ch` and `em`, so the parent sets one font size and every cell scales
 * together and stays crisp. Double-height rows draw scaled over two lines.
 */

const TONE: Record<Tone, string> = {
  fg: 'text-card-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  highlight: 'text-highlight-soft-foreground',
  success: 'text-success-soft-foreground',
  warning: 'text-warning-soft-foreground',
  danger: 'text-destructive-soft-foreground',
  info: 'text-info-soft-foreground',
  s1: '',
  s2: '',
  s3: '',
  s4: '',
}
const SERIES: Partial<Record<Tone, string>> = { s1: 'var(--series-1)', s2: 'var(--series-2)', s3: 'var(--series-3)', s4: 'var(--series-4)' }

const BG: Record<Bg, string> = {
  primary: 'bg-primary text-primary-foreground',
  highlight: 'bg-highlight text-highlight-foreground',
  muted: 'bg-muted text-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  danger: 'bg-destructive-soft text-destructive-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
}

const UP = '▁▂▃▄▅▆▇█'
const LEFT = '▏▎▍▌▋▊▉'
const BLOCKS = /[▁▂▃▄▅▆▇█▏▎▍▌▋▊▉]/

/**
 * Block characters drawn as cells rather than glyphs: a font's █ never quite
 * fills the line, so stacked rows would show seams. Each cell is exactly one
 * character wide and one line tall. Column charts keep a 1px gap each side
 * so neighboring bars read apart; horizontal bars (`thin`) sit at 60% height.
 */
function renderText(t: string, thin: boolean) {
  if (!BLOCKS.test(t)) return t
  const out: (string | React.ReactElement)[] = []
  let text = ''
  ;[...t].forEach((ch, i) => {
    const up = UP.indexOf(ch)
    const left = LEFT.indexOf(ch)
    if (up < 0 && left < 0) {
      text += ch
      return
    }
    if (text) out.push(text)
    text = ''
    const full = ch === '█'
    const h = thin ? 60 : up >= 0 ? ((up + 1) / 8) * 100 : 100
    const w = left >= 0 ? ((left + 1) / 8) * 100 : 100
    out.push(
      <span
        key={i}
        aria-hidden
        style={{ display: 'inline-flex', width: '1ch', height: '1.25em', verticalAlign: 'top', alignItems: thin ? 'center' : 'flex-end' }}
      >
        <span
          style={{
            display: 'block',
            background: 'currentColor',
            height: `${h}%`,
            width: thin || left >= 0 ? `${w}%` : 'calc(100% - 2px)',
            marginLeft: thin || left >= 0 ? 0 : 1,
            borderRadius: !thin && (full || up >= 0) ? 0 : undefined,
          }}
        />
      </span>,
    )
  })
  if (text) out.push(text)
  return out
}

function SegView({ seg, onGo }: { seg: Seg; onGo: (n: number) => void }) {
  const cls = cn(seg.bg ? BG[seg.bg] : seg.tone ? TONE[seg.tone] : 'text-card-foreground', seg.bold && 'font-bold')
  const style: CSSProperties | undefined = seg.tone && SERIES[seg.tone] && !seg.bg ? { color: SERIES[seg.tone] } : undefined
  if (seg.go !== undefined)
    return (
      <button
        type="button"
        onClick={() => onGo(seg.go!)}
        className={cn(cls, 'cursor-pointer rounded-sm whitespace-pre underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring')}
        style={style}
        aria-label={`Go to page ${seg.go}`}
      >
        {renderText(seg.t, !!seg.thin)}
      </button>
    )
  if (seg.href)
    return (
      <a href={seg.href} target="_blank" rel="noreferrer" className={cn(cls, 'whitespace-pre underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring')} style={style}>
        {renderText(seg.t, !!seg.thin)}
      </a>
    )
  return (
    <span className={cn(cls, 'whitespace-pre')} style={style}>
      {renderText(seg.t, !!seg.thin)}
    </span>
  )
}

export function RowView({ row, onGo }: { row: Row; onGo: (n: number) => void }) {
  return (
    <div className="overflow-hidden whitespace-pre" style={{ height: row.dh ? '2.5em' : '1.25em', lineHeight: '1.25em' }}>
      <div style={row.dh ? { transform: 'scaleY(2)', transformOrigin: 'top' } : undefined}>
        {row.segs.map((seg, i) => (
          <SegView key={i} seg={seg} onGo={onGo} />
        ))}
      </div>
    </div>
  )
}

/** Content rows, padded to a fixed height; a double-height row uses two. */
export function GridRows({ rows, height, onGo }: { rows: Row[]; height: number; onGo: (n: number) => void }) {
  const out: Row[] = []
  let used = 0
  for (const r of rows) {
    const h = r.dh ? 2 : 1
    if (used + h > height) break
    out.push(r)
    used += h
  }
  return (
    <div style={{ height: `${height * 1.25}em` }}>
      {out.map((r, i) => (
        <RowView key={i} row={r} onGo={onGo} />
      ))}
    </div>
  )
}
