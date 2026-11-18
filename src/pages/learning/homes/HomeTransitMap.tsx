import { useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, CircleDot, Clock, MapPin, Route, TrainFront } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatusItem, StatusSpacer, StatusStrip } from '@/components/layout/StatusStrip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormatBadge, PersonChip } from '@/features/learning/components'
import { HUB, PERSON_BY_ID, formatMinutes } from '@/features/learning/data'
import {
  LINES,
  LINE_BY_ID,
  SERVICE,
  STATIONS,
  STATION_BY_ID,
  linesAt,
  type LabelPos,
  type Line,
  type Station,
} from '@/features/learning/transit-map-data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Home D: the curriculum as a transit map. Each learning path is a line, each
 * course a station, and shared courses are interchanges. Priya's record shows
 * as visited stations and a "you are here".
 */

const U = 40
const lineColor = (l: Line) => `var(--series-${l.series})`
const CURRENT = STATIONS.find((s) => s.status === 'current')!

function statusText(s: Station) {
  if (s.status === 'done') return 'Visited'
  if (s.status === 'current') return `You are here · ${s.progress}% through`
  if (s.status === 'started') return `${s.progress}% through`
  return 'Not visited yet'
}

/** A polyline with rounded bends, for 45/90-degree routes. */
function roundedPath(points: [number, number][], radius = 18) {
  const p = points.map(([x, y]) => [x * U, y * U] as const)
  let d = `M ${p[0][0]} ${p[0][1]}`
  for (let i = 1; i < p.length - 1; i++) {
    const [px, py] = p[i - 1]
    const [x, y] = p[i]
    const [nx, ny] = p[i + 1]
    const inLen = Math.hypot(x - px, y - py)
    const outLen = Math.hypot(nx - x, ny - y)
    const r = Math.min(radius, inLen / 2, outLen / 2)
    const ax = x - ((x - px) / inLen) * r
    const ay = y - ((y - py) / inLen) * r
    const bx = x + ((nx - x) / outLen) * r
    const by = y + ((ny - y) / outLen) * r
    d += ` L ${ax} ${ay} Q ${x} ${y} ${bx} ${by}`
  }
  const last = p[p.length - 1]
  return `${d} L ${last[0]} ${last[1]}`
}

/** Pie wedge from 12 o'clock, for stations part-way through. */
function wedge(cx: number, cy: number, r: number, pct: number) {
  const a = (Math.min(pct, 99.9) / 100) * Math.PI * 2
  const x = cx + r * Math.sin(a)
  const y = cy - r * Math.cos(a)
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y} Z`
}

const LABEL: Record<LabelPos, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end'; up: boolean }> = {
  n: { dx: 0, dy: -16, anchor: 'middle', up: true },
  s: { dx: 0, dy: 26, anchor: 'middle', up: false },
  ne: { dx: 10, dy: -14, anchor: 'start', up: true },
  nw: { dx: -10, dy: -14, anchor: 'end', up: true },
  se: { dx: 12, dy: 26, anchor: 'start', up: false },
  sw: { dx: -12, dy: 26, anchor: 'end', up: false },
  e: { dx: 16, dy: 4, anchor: 'start', up: false },
  w: { dx: -16, dy: 4, anchor: 'end', up: false },
}

function StationLabel({ s, interchange, strong }: { s: Station; interchange: boolean; strong: boolean }) {
  const L = LABEL[s.pos]
  const extra = interchange ? 4 : 0
  const x = s.x * U + L.dx + Math.sign(L.dx) * extra
  const first = s.y * U + L.dy + (L.up ? -extra - (s.label.length - 1) * 15 : extra)
  return (
    <text
      x={x}
      y={first}
      textAnchor={L.anchor}
      className={cn('fill-foreground text-[12.5px]', strong ? 'font-semibold' : 'font-medium')}
      stroke="var(--card)"
      strokeWidth={4}
      strokeLinejoin="round"
      style={{ paintOrder: 'stroke' }}
    >
      {s.label.map((t, i) => (
        <tspan key={t} x={x} dy={i === 0 ? 0 : 15}>
          {t}
        </tspan>
      ))}
    </text>
  )
}

function Check({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  return (
    <path
      d={`M ${cx - size} ${cy} L ${cx - size / 3} ${cy + size * 0.7} L ${cx + size} ${cy - size * 0.6}`}
      fill="none"
      stroke="var(--card)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function StationMark({
  s,
  selected,
  dimmed,
  onSelect,
}: {
  s: Station
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
}) {
  const lines = linesAt(s.id)
  const interchange = lines.length > 1
  const color = lineColor(lines[0])
  const cx = s.x * U
  const cy = s.y * U
  const visited = s.status === 'done' || s.status === 'current'

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(s.id)
    }
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${s.title}. ${lines.map((l) => l.name).join(' and ')} ${interchange ? 'lines' : 'line'}. ${statusText(s)}.`}
      onClick={() => onSelect(s.id)}
      onKeyDown={onKey}
      className={cn('group cursor-pointer outline-none transition-opacity', dimmed && 'opacity-25')}
    >
      <circle cx={cx} cy={cy} r={20} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={18}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={2.5}
        className="opacity-0 group-focus-visible:opacity-100"
      />
      {selected && (
        <circle
          cx={cx}
          cy={cy}
          r={interchange ? 17 : 15}
          fill="var(--primary)"
          fillOpacity={0.14}
          stroke="var(--primary)"
          strokeWidth={2}
        />
      )}
      {s.status === 'current' && (
        <circle
          cx={cx}
          cy={cy}
          r={11}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
          className="origin-center animate-ping [transform-box:fill-box] motion-reduce:animate-none"
        />
      )}
      {interchange ? (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={10.5}
            fill={visited ? 'var(--foreground)' : 'var(--card)'}
            stroke="var(--foreground)"
            strokeWidth={3}
          />
          {visited && <Check cx={cx} cy={cy} size={4.5} />}
          {s.status === 'started' && <path d={wedge(cx, cy, 6.5, s.progress ?? 0)} fill="var(--foreground)" />}
        </>
      ) : (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill={visited ? color : 'var(--card)'}
            stroke={color}
            strokeWidth={3}
            className="group-hover:stroke-[4.5]"
          />
          {visited && <Check cx={cx} cy={cy} size={3.6} />}
          {s.status === 'started' && <path d={wedge(cx, cy, 5, s.progress ?? 0)} fill={color} />}
        </>
      )}
      <StationLabel s={s} interchange={interchange} strong={selected || s.status === 'current'} />
    </g>
  )
}

function YouAreHere({ s }: { s: Station }) {
  const cx = s.x * U
  const top = s.y * U - 46
  return (
    <g aria-hidden className="pointer-events-none">
      <rect x={cx - 46} y={top} width={92} height={24} rx={6} fill="var(--primary)" />
      <path d={`M ${cx - 6} ${top + 24} L ${cx} ${top + 31} L ${cx + 6} ${top + 24} Z`} fill="var(--primary)" />
      <text x={cx} y={top + 16} textAnchor="middle" className="fill-primary-foreground text-[12px] font-semibold">
        You are here
      </text>
    </g>
  )
}

function TransitMap({ selected, onSelect, focusLine }: { selected: string; onSelect: (id: string) => void; focusLine: string | null }) {
  const focused = focusLine ? LINE_BY_ID[focusLine] : null
  return (
    <svg
      viewBox="-30 12 1290 560"
      role="group"
      aria-label="Curriculum map: learning paths drawn as transit lines"
      className="block h-auto w-full min-w-[60rem] select-none"
    >
      <defs>
        <pattern id="map-grid" width={U} height={U} patternUnits="userSpaceOnUse">
          <circle cx={U / 2} cy={U / 2} r={1} fill="var(--border)" />
        </pattern>
      </defs>
      <rect x={-30} y={12} width={1290} height={560} fill="url(#map-grid)" />
      {/* Casings first so lines that meet at an interchange read as separate. */}
      {LINES.map((l) => (
        <path
          key={`${l.id}-case`}
          d={roundedPath(l.route)}
          fill="none"
          stroke="var(--card)"
          strokeWidth={13}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {LINES.map((l) => (
        <path
          key={l.id}
          d={roundedPath(l.route)}
          fill="none"
          stroke={lineColor(l)}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-opacity"
          opacity={focused && focused.id !== l.id ? 0.15 : 1}
        />
      ))}
      {STATIONS.map((s) => (
        <StationMark
          key={s.id}
          s={s}
          selected={s.id === selected}
          dimmed={!!focused && !focused.stops.includes(s.id)}
          onSelect={onSelect}
        />
      ))}
      <YouAreHere s={CURRENT} />
    </svg>
  )
}

function LineSwatch({ line, className }: { line: Line; className?: string }) {
  return (
    <span aria-hidden className={cn('inline-block h-1.5 w-5 shrink-0 rounded-full', className)} style={{ background: lineColor(line) }} />
  )
}

function StationDetail({ s, onSelect }: { s: Station; onSelect: (id: string) => void }) {
  const lines = linesAt(s.id)
  return (
    <div className="flex flex-col gap-4 border-t px-6 pt-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <FormatBadge format={s.format} />
          {lines.length > 1 && (
            <Badge variant="secondary">
              <TrainFront />
              Change here
            </Badge>
          )}
          {s.status === 'done' && <Badge variant="success">Visited</Badge>}
          {s.status === 'current' && (
            <Badge variant="primary">
              <MapPin />
              You are here · {s.progress}%
            </Badge>
          )}
          {s.status === 'started' && <Badge variant="outline">{s.progress}% through</Badge>}
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{s.summary}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <PersonChip id={s.author} />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {formatMinutes(s.minutes)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 lg:w-96">
        {lines.map((l) => {
          const i = l.stops.indexOf(s.id)
          const prev = l.stops[i - 1]
          const next = l.stops[i + 1]
          return (
            <div key={l.id} className="flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-1.5 text-sm">
              <LineSwatch line={l} />
              <span className="min-w-0 flex-1 truncate font-medium">{l.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={!prev}
                aria-label={prev ? `Previous stop: ${STATION_BY_ID[prev].title}` : 'No previous stop'}
                onClick={() => prev && onSelect(prev)}
              >
                <ArrowLeft />
              </Button>
              <span className="w-10 text-center text-xs text-muted-foreground tabular-nums">
                {i + 1}/{l.stops.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={!next}
                aria-label={next ? `Next stop: ${STATION_BY_ID[next].title}` : 'End of the line'}
                onClick={() => next && onSelect(next)}
              >
                <ArrowRight />
              </Button>
            </div>
          )
        })}
        {s.path ? (
          <Button variant="outline" asChild>
            <a href={href(s.path)}>
              Open {s.status === 'todo' ? '' : 'and continue'}
              <ArrowRight />
            </a>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            No mockup for this stop
          </Button>
        )}
      </div>
    </div>
  )
}

function StopDots({ line }: { line: Line }) {
  return (
    <span className="relative flex h-3 min-w-0 flex-1 items-center justify-between" aria-hidden>
      <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full opacity-30" style={{ background: lineColor(line) }} />
      {line.stops.map((id) => {
        const s = STATION_BY_ID[id]
        const filled = s.status === 'done' || s.status === 'current'
        return (
          <span
            key={id}
            className={cn(
              'relative size-3 rounded-full border-2',
              s.status === 'current' && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
            )}
            style={{ borderColor: lineColor(line), background: filled ? lineColor(line) : 'var(--card)' }}
          />
        )
      })}
    </span>
  )
}

const TONE = {
  good: 'bg-success',
  works: 'bg-warning',
  info: 'bg-info',
} as const

export function HomeTransitMap() {
  const [selected, setSelected] = useState(CURRENT.id)
  const [focusLine, setFocusLine] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const visited = STATIONS.filter((s) => s.status === 'done').length
  const started = STATIONS.filter((s) => s.status === 'started' || s.status === 'current').length
  const complete = LINES.filter((l) => l.stops.every((id) => STATION_BY_ID[id].status === 'done'))

  const showLine = (id: string) => {
    setFocusLine(id)
    setSelected(LINE_BY_ID[id].stops.find((s) => STATION_BY_ID[s].status !== 'done') ?? LINE_BY_ID[id].stops[0])
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={HUB.name}
        title="Where are you headed?"
        description="Every learning path is a line and every course a station. Where lines meet, one course counts for both."
        actions={
          <Button asChild>
            <a href={href('/learn/course')}>
              <CircleDot />
              Continue: {CURRENT.label.join(' ')}
            </a>
          </Button>
        }
      />

      <StatusStrip aria-label="Your journey">
        <StatusItem value={visited} label="stations visited" />
        <StatusItem value={started} label="in progress" />
        <StatusItem
          value={complete.length}
          label={complete.length === 1 ? 'line complete' : 'lines complete'}
          title={complete.map((l) => l.name).join(', ')}
        />
        <StatusSpacer />
        <StatusItem icon={MapPin} label={`You are on the ${linesAt(CURRENT.id)[0].name} line`} className="max-sm:hidden" />
      </StatusStrip>

      <div ref={mapRef} className="scroll-mt-24">
        <Card className="gap-4 pb-5">
          <CardHeader>
            <CardTitle>Network map</CardTitle>
            <CardDescription>Choose a station to see what’s there. Choose a line to ride it alone. Surveyed Nov 15.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="group"
              aria-label="Highlight a line"
              className="-mx-6 flex gap-1.5 overflow-x-auto px-6 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
            >
              <Button variant={focusLine ? 'ghost' : 'secondary'} size="sm" aria-pressed={!focusLine} onClick={() => setFocusLine(null)}>
                All lines
              </Button>
              {LINES.map((l) => (
                <Button
                  key={l.id}
                  variant={focusLine === l.id ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={focusLine === l.id}
                  onClick={() => setFocusLine(focusLine === l.id ? null : l.id)}
                >
                  <LineSwatch line={l} />
                  {l.name}
                </Button>
              ))}
            </div>
          </CardContent>
          <div className="overflow-x-auto px-2 [scrollbar-width:thin]">
            <TransitMap selected={selected} onSelect={setSelected} focusLine={focusLine} />
          </div>
          <p className="px-6 text-xs text-muted-foreground sm:hidden">Scroll the map sideways to see every line.</p>
          <StationDetail s={STATION_BY_ID[selected]} onSelect={setSelected} />
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="gap-0 pb-2">
          <CardHeader className="pb-4">
            <CardTitle>Lines</CardTitle>
            <CardDescription>Six paths through the curriculum, each with an owner who keeps it running.</CardDescription>
          </CardHeader>
          <ul className="divide-y border-t">
            {LINES.map((l) => {
              const done = l.stops.filter((id) => STATION_BY_ID[id].status === 'done').length
              return (
                <li key={l.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:gap-5">
                  <div className="flex min-w-0 items-start gap-3 sm:w-64 sm:shrink-0">
                    <span aria-hidden className="mt-1 h-8 w-1.5 shrink-0 rounded-full" style={{ background: lineColor(l) }} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.blurb}</div>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <StopDots line={l} />
                    <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {done}/{l.stops.length}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => showLine(l.id)}>
                      <Route />
                      Show on map
                    </Button>
                    {l.path && (
                      <Button variant="soft" size="sm" asChild>
                        <a href={href(l.path)}>Open path</a>
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Service updates</CardTitle>
            <CardDescription>What changed on the map, and what’s closed for works.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4">
              {SERVICE.map((n) => {
                const l = LINE_BY_ID[n.line]
                return (
                  <li key={n.line} className="flex gap-3">
                    <span aria-hidden className="mt-1.5 h-4 w-1.5 shrink-0 rounded-full" style={{ background: lineColor(l) }} />
                    <div className="min-w-0 text-sm">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium">{l.name}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn('size-2 rounded-full', TONE[n.tone])} />
                          {n.label}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{n.text}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
          <CardContent className="border-t pt-4 text-xs text-muted-foreground">
            Lines are drawn by their owners and checked each quarter by{' '}
            <span className="font-medium text-foreground">{PERSON_BY_ID.sol.name}</span>. Spot a wrong turn? Tell the owner on the station’s
            page.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
