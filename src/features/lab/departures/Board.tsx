import { Fragment, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, Clock, PauseCircle, Rocket, XCircle } from 'lucide-react'

import type { Launch } from '@/features/lab/feeds'
import { cn } from '@/lib/utils'

import { agoText, boardStatus, fmtWindow, inText, operator, site, t0Text, type BoardStatus, type Tone } from './model'

// ── Split-flap text ────────────────────────────────────────────────────────

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** One character that flips down whenever it changes (and once, staggered, on first paint). */
function FlapChar({ ch, delay }: { ch: string; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reducedMotion() || ch === ' ') return
    el.animate(
      [
        { transform: 'perspective(200px) rotateX(-88deg)', opacity: 0.15 },
        { transform: 'perspective(200px) rotateX(12deg)', opacity: 1, offset: 0.75 },
        { transform: 'perspective(200px) rotateX(0deg)', opacity: 1 },
      ],
      { duration: 320, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' },
    )
  }, [ch, delay])
  return (
    <span ref={ref} aria-hidden className="inline-block whitespace-pre" style={{ transformOrigin: '50% 60%' }}>
      {ch}
    </span>
  )
}

/** Text that changes like a departures board: each character flips on its own. */
export function FlapText({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={cn('inline-block whitespace-pre', className)}>
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => (
        <FlapChar key={i} ch={ch} delay={delay + i * 14} />
      ))}
    </span>
  )
}

/** A digit on its own split-flap tile, for the hero countdown. */
export function FlapTile({ ch, className }: { ch: string; className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-8 w-5 items-center justify-center overflow-hidden rounded-md bg-muted font-mono text-lg font-semibold text-foreground shadow-elevation-1 sm:h-16 sm:w-12 sm:text-5xl',
        className,
      )}
    >
      <FlapChar ch={ch} delay={0} />
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-background/70" />
    </span>
  )
}

// ── Status pill ────────────────────────────────────────────────────────────

const TONE: Record<Tone, string> = {
  success: 'bg-success-soft text-success-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  destructive: 'bg-destructive-soft text-destructive-soft-foreground',
  neutral: 'bg-secondary text-secondary-foreground',
}

const ICON: Record<string, typeof Clock> = {
  'ON TIME': CheckCircle2,
  EXPECTED: Clock,
  SCHEDULED: CalendarClock,
  HOLD: PauseCircle,
  'IN FLIGHT': Rocket,
  DEPARTED: CheckCircle2,
  FAILED: XCircle,
  PARTIAL: AlertTriangle,
}

export function StatusPill({ s, delay = 0, className }: { s: BoardStatus; delay?: number; className?: string }) {
  const Icon = ICON[s.label] ?? CircleDashed
  return (
    <span title={s.meaning} className={cn('inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold tracking-wider', TONE[s.tone], className)}>
      <Icon className="size-3 shrink-0" aria-hidden />
      <FlapText text={s.label} delay={delay} />
    </span>
  )
}

// ── Boards ─────────────────────────────────────────────────────────────────

type Kind = 'departures' | 'arrivals'

/**
 * The board. Rows are buttons: click, Enter or Space opens the launch's
 * details under it. Phone width keeps T-0, rocket (with mission under it)
 * and status.
 */
export function Board({ launches, kind, now, empty }: { launches: Launch[]; kind: Kind; now: number; empty: string }) {
  const [open, setOpen] = useState<string | null>(null)
  // The first paint flips in row by row; later changes flip in place.
  const firstPaint = useRef(true)
  useLayoutEffect(() => {
    const id = window.setTimeout(() => (firstPaint.current = false), 1500)
    return () => window.clearTimeout(id)
  }, [])
  const rows = useMemo(() => launches, [launches])

  const toggle = (id: string) => setOpen((o) => (o === id ? null : id))
  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle(id)
    }
  }

  if (rows.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{empty}</p>

  const head = 'px-2 py-2 text-left text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase'
  const cell = 'px-2 py-2 align-middle whitespace-nowrap'
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[11px] tracking-wide uppercase sm:text-[13px]">
        <thead>
          <tr className="border-b">
            <th className={cn(head, 'pl-4')}>{kind === 'departures' ? 'T-0' : 'Launched'}</th>
            <th className={cn(head, 'hidden md:table-cell')}>{kind === 'departures' ? 'In' : 'When'}</th>
            <th className={head}>Rocket</th>
            <th className={cn(head, 'hidden lg:table-cell')}>Mission</th>
            <th className={cn(head, 'hidden xl:table-cell')}>Operator</th>
            <th className={cn(head, 'hidden md:table-cell')}>From</th>
            <th className={cn(head, 'hidden pr-4 sm:table-cell')}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => {
            const d = firstPaint.current ? i * 45 : 0
            const s = boardStatus(l)
            const isOpen = open === l.id
            const when = kind === 'departures' ? inText(l, now) : agoText(l.net, now)
            return (
              <Fragment key={l.id}>
                <tr
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggle(l.id)}
                  onKeyDown={(e) => onKey(e, l.id)}
                  className={cn('cursor-pointer border-b outline-none hover:bg-accent focus-visible:bg-accent', isOpen && 'bg-accent')}
                >
                  <td className={cn(cell, 'pl-4 text-foreground tabular-nums')}>
                    <SplitT0 text={kind === 'departures' ? t0Text(l) : t0Text({ ...l, precision: 'Minute' })} delay={d} />
                  </td>
                  <td className={cn(cell, 'hidden text-muted-foreground tabular-nums md:table-cell')}>
                    <FlapText text={when} delay={d + 60} />
                  </td>
                  <td className={cn(cell, 'max-w-[14rem] text-foreground')}>
                    <FlapText text={fit(l.rocket, 22)} delay={d + 100} className="font-semibold" />
                    <div className="max-w-48 truncate text-[11px] text-muted-foreground normal-case sm:max-w-none lg:hidden">{l.mission}</div>
                    <div className="mt-1 sm:hidden">
                      <StatusPill s={s} delay={d + 300} />
                    </div>
                  </td>
                  <td className={cn(cell, 'hidden max-w-[18rem] text-foreground lg:table-cell')}>
                    <FlapText text={fit(l.mission, 28)} delay={d + 160} />
                  </td>
                  <td className={cn(cell, 'hidden text-muted-foreground xl:table-cell')}>
                    <FlapText text={fit(operator(l.provider), 16)} delay={d + 220} />
                  </td>
                  <td className={cn(cell, 'hidden text-muted-foreground md:table-cell')}>
                    <FlapText text={fit(site(l.location), 22)} delay={d + 260} />
                  </td>
                  <td className={cn(cell, 'hidden pr-4 sm:table-cell')}>
                    <StatusPill s={s} delay={d + 300} />
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b bg-accent/50">
                    <td colSpan={7} className="px-4 py-3 font-sans text-sm tracking-normal normal-case">
                      <Detail l={l} s={s} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Detail({ l, s }: { l: Launch; s: BoardStatus }) {
  const fmt = (t: number) => new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
  const items: [string, string][] = [
    ['Mission', `${l.mission}${l.missionType ? ` · ${l.missionType}` : ''}`],
    ['Operator', l.provider || '—'],
    ['Launch site', `${l.pad ? `${l.pad}, ` : ''}${l.location}`],
    ['T-0', `${fmt(l.net)} (good to the ${l.precision.toLowerCase() || 'unknown'})`],
    ['Window', fmtWindow(l)],
    ['Orbit', l.orbit ?? 'not published'],
    ['Status', `${s.label.toLowerCase()}: ${s.meaning}`],
  ]
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="flex min-w-0 gap-2">
          <dt className="w-24 shrink-0 text-xs text-muted-foreground">{k}</dt>
          <dd className="min-w-0 text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** T-0 on one line, or two on a phone (split at the last space: "18 NOV" / "17:50"). */
function SplitT0({ text, delay }: { text: string; delay: number }) {
  const i = text.lastIndexOf(' ')
  if (i < 0) return <FlapText text={text} delay={delay} />
  return (
    <>
      <FlapText text={text.slice(0, i)} delay={delay} />
      <br className="sm:hidden" />
      <span className="hidden sm:inline"> </span>
      <FlapText text={text.slice(i + 1)} delay={delay + i * 14} />
    </>
  )
}

export function fit(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}
