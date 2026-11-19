import { useRef, useState } from 'react'
import {
  BookOpen,
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  MapPin,
  MessagesSquare,
  Play,
  Presentation,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { Cover, PersonChip } from '@/features/learning/components'
import { PERSON_BY_ID } from '@/features/learning/data'
import { KIND_LABELS, NOW, SESSIONS, ZONES, type Session, type SessionKind, type Zone } from '@/features/learning/live-data'
import { href, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/* ---------- Time helpers (everything in the picked zone) ---------- */

const DAY = 86_400_000
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const KIND_ICONS: Record<SessionKind, LucideIcon> = {
  workshop: Users,
  office: MessagesSquare,
  reading: BookOpen,
  talk: Presentation,
}

/** A Date whose UTC fields read as wall-clock time in `zone`. */
function wall(t: number, zone: Zone) {
  return new Date(t + zone.offset * 60_000)
}
function dayKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}
function hhmm(d: Date) {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
function startOf(s: Session) {
  return Date.parse(s.start)
}
function timeRange(s: Session, zone: Zone) {
  const a = wall(startOf(s), zone)
  const b = wall(startOf(s) + s.minutes * 60_000, zone)
  return `${hhmm(a)}–${hhmm(b)} ${zone.abbr}`
}
function dateLabel(s: Session, zone: Zone) {
  const d = wall(startOf(s), zone)
  return `${DOW[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** Mondays (as UTC midnights) from the week of Nov 2 to the week of Dec 14. */
const WEEKS = Array.from({ length: 7 }, (_, i) => Date.UTC(2026, 10, 2) + i * 7 * DAY)
const THIS_WEEK = 2

/* ---------- Seat state ---------- */

type Mine = 'claimed' | 'waitlist'

function seatsLeft(s: Session, mine?: Mine) {
  return s.seats - s.taken - (mine === 'claimed' ? 1 : 0)
}

function isPast(s: Session) {
  return startOf(s) + s.minutes * 60_000 < NOW
}

export function LiveSessionsPage() {
  const initialView = useSearchParams().get('view')
  const [view, setView] = useState<'week' | 'month' | 'list'>(initialView === 'month' || initialView === 'list' ? initialView : 'week')
  const aside = useRef<HTMLDivElement>(null)
  const [zoneId, setZoneId] = useState('london')
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0]
  const [mine, setMine] = useState<Record<string, Mine>>({ 'reading-2': 'claimed', 'oncall-brief': 'claimed', 'feedback-lab': 'waitlist' })
  const [selectedId, setSelectedId] = useState('tokens-oh')
  const [week, setWeek] = useState(THIS_WEEK)
  const [month, setMonth] = useState(10)
  const [day, setDay] = useState(dayKey(wall(NOW, zone)))
  const [calendarAdded, setCalendarAdded] = useState(false)

  const selected = SESSIONS.find((s) => s.id === selectedId) ?? SESSIONS[0]

  function toggle(s: Session) {
    setMine((m) => {
      const next = { ...m }
      if (m[s.id]) delete next[s.id]
      else next[s.id] = seatsLeft(s) > 0 ? 'claimed' : 'waitlist'
      return next
    })
    setCalendarAdded(false)
  }

  const upcoming = SESSIONS.filter((s) => !isPast(s))
  const yours = upcoming.filter((s) => mine[s.id])
  const recordings = SESSIONS.filter((s) => isPast(s) && s.recording).reverse()
  /** Pick a session; on narrow screens, where the detail card sits below the calendar, bring it into view. */
  function select(id: string) {
    setSelectedId(id)
    if (window.matchMedia('(max-width: 1279px)').matches) aside.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const ctx = { zone, mine, selectedId, onSelect: select, onToggle: toggle }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Live sessions"
        description="Workshops, office hours and reading groups with the people who do the work. Claim a seat; recordings land here afterwards."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="live-zone" className="text-sm whitespace-nowrap text-muted-foreground">
              Times in
            </Label>
            <NativeSelect id="live-zone" value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="w-44">
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label} ({z.abbr})
                </option>
              ))}
            </NativeSelect>
          </div>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-6">
          <Card className="order-1 min-w-0 gap-0 py-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
              {view === 'list' ? (
                <div className="text-sm font-medium">
                  {upcoming.length} upcoming sessions <span className="font-normal text-muted-foreground">· to Dec 17</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={view === 'week' ? 'Previous week' : 'Previous month'}
                    disabled={view === 'week' ? week === 0 : month === 10}
                    onClick={() => (view === 'week' ? setWeek((w) => w - 1) : setMonth(10))}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={view === 'week' ? 'Next week' : 'Next month'}
                    disabled={view === 'week' ? week === WEEKS.length - 1 : month === 11}
                    onClick={() => (view === 'week' ? setWeek((w) => w + 1) : setMonth(11))}
                  >
                    <ChevronRight />
                  </Button>
                  <span className="ml-1 text-sm font-medium whitespace-nowrap tabular-nums">
                    {view === 'week' ? weekLabel(WEEKS[week]) : `${MONTHS_LONG[month]} 2026`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      setWeek(THIS_WEEK)
                      setMonth(10)
                      setDay(dayKey(wall(NOW, zone)))
                    }}
                  >
                    Today
                  </Button>
                </div>
              )}
              <Segmented
                aria-label="Calendar view"
                value={view}
                onChange={setView}
                options={[
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                  { value: 'list', label: 'List' },
                ]}
              />
            </div>

            {view === 'week' && <WeekView monday={WEEKS[week]} {...ctx} />}
            {view === 'month' && <MonthView month={month} day={day} onDay={setDay} {...ctx} />}
            {view === 'list' && <ListView sessions={upcoming} {...ctx} />}
          </Card>
          <Card className="order-3 gap-4">
            <CardHeader>
              <CardTitle>Missed it? Recordings</CardTitle>
              <CardDescription>
                Recorded sessions come with chapters and a transcript. Reading groups aren’t recorded, so people speak freely.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {recordings.map((s) => (
                <a
                  key={s.id}
                  href={href('/learn/video')}
                  className="group flex min-w-0 flex-col gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Cover
                    seed={s.id}
                    series={s.kind === 'office' ? 4 : 2}
                    motif="rings"
                    className="aspect-video transition-shadow group-hover:shadow-elevation-2"
                  >
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid size-9 place-items-center rounded-full bg-background/85 text-foreground shadow-elevation-1">
                        <Play className="size-4 translate-x-px fill-current" />
                      </span>
                    </span>
                    <span className="absolute right-2 bottom-2 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[11px] text-foreground tabular-nums">
                      {s.recording} min
                    </span>
                  </Cover>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="line-clamp-2 text-sm leading-snug font-medium group-hover:underline">{s.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {dateLabel(s, zone)} · {PERSON_BY_ID[s.host].name}
                    </span>
                  </span>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        <div ref={aside} className="order-2 flex min-w-0 scroll-mt-14 flex-col gap-6 xl:sticky xl:top-14 xl:order-none">
          <SessionDetail session={selected} zone={zone} mine={mine[selected.id]} onToggle={() => toggle(selected)} />

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Your sessions</CardTitle>
              <CardDescription>
                {yours.filter((s) => mine[s.id] === 'claimed').length} seats claimed
                {yours.some((s) => mine[s.id] === 'waitlist') && `, ${yours.filter((s) => mine[s.id] === 'waitlist').length} on a waitlist`}
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-3">
              {yours.length === 0 && <p className="px-3 text-sm text-muted-foreground">Nothing yet. Claim a seat and it shows up here.</p>}
              {yours.map((s) => {
                const d = wall(startOf(s), zone)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <DateTile d={d} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{s.title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {mine[s.id] === 'waitlist' ? (
                          <span className="text-warning-soft-foreground">Waitlist, #{(s.waitlist ?? 0) + 1} in line</span>
                        ) : (
                          timeRange(s, zone)
                        )}
                      </span>
                    </span>
                  </button>
                )
              })}
              {yours.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mx-3 mt-2 self-start"
                  onClick={() => setCalendarAdded(true)}
                  disabled={calendarAdded}
                >
                  {calendarAdded ? <Check /> : <CalendarPlus />}
                  {calendarAdded ? 'Added to your calendar' : 'Add all to calendar'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function weekLabel(monday: number) {
  const a = new Date(monday)
  const b = new Date(monday + 4 * DAY)
  const same = a.getUTCMonth() === b.getUTCMonth()
  return `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()} – ${same ? '' : MONTHS[b.getUTCMonth()] + ' '}${b.getUTCDate()}`
}

/* ---------- Shared bits ---------- */

interface ViewCtx {
  zone: Zone
  mine: Record<string, Mine>
  selectedId: string
  onSelect: (id: string) => void
  onToggle: (s: Session) => void
}

function DateTile({ d }: { d: Date }) {
  return (
    <span className="flex w-11 shrink-0 flex-col items-center rounded-md border bg-card py-1 leading-none">
      <span className="text-[10px] font-semibold tracking-wide text-primary uppercase">{MONTHS[d.getUTCMonth()]}</span>
      <span className="mt-0.5 text-base font-semibold tabular-nums">{d.getUTCDate()}</span>
    </span>
  )
}

function KindBadge({ kind }: { kind: SessionKind }) {
  const Icon = KIND_ICONS[kind]
  return (
    <Badge variant="outline">
      <Icon />
      {KIND_LABELS[kind]}
    </Badge>
  )
}

/** "3 seats left" in the warning hue when nearly full, the waitlist when full. */
function Seats({ s, mine, className }: { s: Session; mine?: Mine; className?: string }) {
  if (isPast(s)) return <span className={cn('text-muted-foreground', className)}>{s.recording ? 'Recorded' : 'Ended'}</span>
  if (mine === 'claimed')
    return (
      <span className={cn('inline-flex items-center gap-1 text-success', className)}>
        <Check className="size-3.5" /> You have a seat
      </span>
    )
  const left = seatsLeft(s, mine)
  if (left <= 0)
    return (
      <span className={cn('inline-flex items-center gap-1 text-muted-foreground', className)}>
        <Hourglass className="size-3.5" />
        {mine === 'waitlist' ? `Waitlist, you’re #${(s.waitlist ?? 0) + 1}` : `Full · ${s.waitlist ?? 0} waiting`}
      </span>
    )
  return (
    <span className={cn('tabular-nums', left <= 3 ? 'font-medium text-warning-soft-foreground' : 'text-muted-foreground', className)}>
      {left === 1 ? 'Last seat' : `${left} of ${s.seats} seats left`}
    </span>
  )
}

function ClaimButton({
  s,
  mine,
  onToggle,
  primary,
  className,
}: {
  s: Session
  mine?: Mine
  onToggle: () => void
  primary?: boolean
  className?: string
}) {
  if (isPast(s))
    return s.recording ? (
      <Button variant="outline" size="sm" asChild className={className}>
        <a href={href('/learn/video')}>
          <Play /> Watch recording
        </a>
      </Button>
    ) : null
  const full = seatsLeft(s) <= 0
  if (mine === 'claimed')
    return (
      <Button variant="outline" size="sm" aria-pressed onClick={onToggle} className={className} title="Release your seat">
        <Check /> Seat claimed
      </Button>
    )
  if (mine === 'waitlist')
    return (
      <Button variant="secondary" size="sm" aria-pressed onClick={onToggle} className={className} title="Leave the waitlist">
        <Hourglass /> On waitlist
      </Button>
    )
  return (
    <Button variant={full ? 'outline' : primary ? 'default' : 'soft'} size="sm" onClick={onToggle} className={className}>
      {full ? 'Join waitlist' : 'Claim a seat'}
    </Button>
  )
}

/* ---------- Week ---------- */

function WeekView({ monday, zone, mine, selectedId, onSelect }: ViewCtx & { monday: number }) {
  const todayKey = dayKey(wall(NOW, zone))
  return (
    <div className="grid grid-cols-1 divide-y md:grid-cols-5 md:divide-x md:divide-y-0">
      {WEEKDAYS.map((name, i) => {
        const date = new Date(monday + i * DAY)
        const key = dayKey(date)
        const today = key === todayKey
        const items = SESSIONS.filter((s) => dayKey(wall(startOf(s), zone)) === key).sort((a, b) => startOf(a) - startOf(b))
        return (
          <div key={key} className={cn('flex min-w-0 flex-col gap-2 p-3 md:min-h-96', today && 'bg-primary-soft/40')}>
            <div className="flex items-baseline gap-2 px-1 pb-1">
              <span className={cn('text-xs font-semibold tracking-wide uppercase', today ? 'text-primary' : 'text-muted-foreground')}>
                {name}
              </span>
              <span className={cn('text-lg font-semibold tabular-nums', !today && 'text-foreground')}>{date.getUTCDate()}</span>
              {today && <span className="text-xs font-medium text-primary">Today</span>}
            </div>
            {items.length === 0 && <p className="px-1 text-xs text-muted-foreground">Nothing scheduled</p>}
            {items.map((s) => {
              const Icon = KIND_ICONS[s.kind]
              const past = isPast(s)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-current={s.id === selectedId ? 'true' : undefined}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-lg border bg-card p-2.5 text-left shadow-xs transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
                    s.id === selectedId && 'border-primary ring-1 ring-primary',
                    mine[s.id] === 'claimed' && 'border-l-4 border-l-success',
                    past && 'opacity-60',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                    <Icon className="size-3.5 shrink-0" />
                    {timeRange(s, zone)}
                  </span>
                  <span className="text-sm leading-snug font-medium">{s.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{PERSON_BY_ID[s.host].name}</span>
                  <Seats s={s} mine={mine[s.id]} className="text-xs" />
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Month ---------- */

function MonthView({
  month,
  day,
  onDay,
  zone,
  mine,
  selectedId,
  onSelect,
  onToggle,
}: ViewCtx & { month: number; day: string; onDay: (k: string) => void }) {
  const first = Date.UTC(2026, month, 1)
  const last = Date.UTC(2026, month + 1, 0)
  const firstDow = (new Date(first).getUTCDay() + 6) % 7
  const start = first - firstDow * DAY
  const rows: number[][] = []
  for (let w = start; w <= last; w += 7 * DAY) rows.push([0, 1, 2, 3, 4].map((i) => w + i * DAY))
  const todayKey = dayKey(wall(NOW, zone))
  const byDay = (k: string) => SESSIONS.filter((s) => dayKey(wall(startOf(s), zone)) === k).sort((a, b) => startOf(a) - startOf(b))
  const dayItems = byDay(day)
  const dayDate = rows.flat().find((t) => dayKey(new Date(t)) === day)

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-5 border-b bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 sm:px-3">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5">
        {rows.flat().map((t) => {
          const d = new Date(t)
          const k = dayKey(d)
          const inMonth = d.getUTCMonth() === month
          const items = byDay(k)
          const isToday = k === todayKey
          return (
            <div
              key={k}
              onClick={() => onDay(k)}
              className={cn(
                'flex min-h-16 min-w-0 cursor-pointer flex-col gap-1 border-r border-b p-1.5 text-left sm:min-h-24 sm:p-2 [&:nth-child(5n)]:border-r-0',
                !inMonth && 'bg-muted/40 text-muted-foreground',
                k === day && 'bg-primary-soft/50',
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDay(k)
                }}
                aria-label={`${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${items.length} ${items.length === 1 ? 'session' : 'sessions'}`}
                aria-pressed={k === day}
                className={cn(
                  'grid size-6 place-items-center rounded-full text-xs font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {d.getUTCDate()}
              </button>
              {/* Dots on phones, titles from sm up. */}
              <span className="flex flex-wrap gap-1 sm:hidden">
                {items.map((s) => (
                  <span
                    key={s.id}
                    className={cn(
                      'size-1.5 rounded-full',
                      mine[s.id] === 'claimed' ? 'bg-success' : isPast(s) ? 'bg-muted-foreground/40' : 'bg-primary',
                    )}
                  />
                ))}
              </span>
              <span className="hidden flex-col gap-1 sm:flex">
                {items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDay(k)
                      onSelect(s.id)
                    }}
                    className={cn(
                      'truncate rounded px-1.5 py-0.5 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      mine[s.id] === 'claimed'
                        ? 'bg-success-soft text-success-soft-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent',
                      isPast(s) && 'opacity-60',
                      s.id === selectedId && 'ring-1 ring-primary',
                    )}
                  >
                    <span className="tabular-nums">{hhmm(wall(startOf(s), zone))}</span> {s.title}
                  </button>
                ))}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-col gap-2 p-4 sm:px-6">
        <div className="text-sm font-medium">
          {dayDate !== undefined
            ? `${DOW[new Date(dayDate).getUTCDay()]} ${MONTHS[new Date(dayDate).getUTCMonth()]} ${new Date(dayDate).getUTCDate()}`
            : 'Pick a day'}
        </div>
        {dayItems.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
        <div className="flex flex-col divide-y">
          {dayItems.map((s) => (
            <SessionRow
              key={s.id}
              s={s}
              zone={zone}
              mine={mine[s.id]}
              selected={s.id === selectedId}
              onSelect={() => onSelect(s.id)}
              onToggle={() => onToggle(s)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- List ---------- */

function ListView({ sessions, zone, mine, selectedId, onSelect, onToggle }: ViewCtx & { sessions: Session[] }) {
  const groups = WEEKS.map((monday, i) => ({
    label: i === THIS_WEEK ? 'This week' : i === THIS_WEEK + 1 ? 'Next week' : `Week of ${weekLabel(monday)}`,
    items: sessions.filter((s) => {
      const t = wall(startOf(s), zone).getTime()
      return t >= monday && t < monday + 7 * DAY
    }),
  })).filter((g) => g.items.length)

  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h3 className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-6">
            {g.label}
          </h3>
          <div className="flex flex-col divide-y px-4 sm:px-6">
            {g.items.map((s) => (
              <SessionRow
                key={s.id}
                s={s}
                zone={zone}
                mine={mine[s.id]}
                selected={s.id === selectedId}
                onSelect={() => onSelect(s.id)}
                onToggle={() => onToggle(s)}
                withDate
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function SessionRow({
  s,
  zone,
  mine,
  selected,
  onSelect,
  onToggle,
  withDate,
}: {
  s: Session
  zone: Zone
  mine?: Mine
  selected: boolean
  onSelect: () => void
  onToggle: () => void
  withDate?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4',
        selected && '-mx-2 rounded-lg bg-primary-soft/40 px-2',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {withDate && <DateTile d={wall(startOf(s), zone)} />}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-medium hover:underline">{s.title}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {withDate && `${DOW[wall(startOf(s), zone).getUTCDay()]} · `}
              {timeRange(s, zone)}
            </span>
            <span>{KIND_LABELS[s.kind]}</span>
            <span>{PERSON_BY_ID[s.host].name}</span>
          </span>
        </span>
      </button>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Seats s={s} mine={mine} className="text-xs" />
        <ClaimButton s={s} mine={mine} onToggle={onToggle} className="sm:w-32" />
      </div>
    </div>
  )
}

/* ---------- Detail ---------- */

function SessionDetail({ session: s, zone, mine, onToggle }: { session: Session; zone: Zone; mine?: Mine; onToggle: () => void }) {
  const left = seatsLeft(s, mine)
  const filled = Math.min(100, ((s.seats - Math.max(0, left)) / s.seats) * 100)
  const starts = startOf(s) - NOW
  const soon = starts > 0 && starts < DAY ? `Starts in ${Math.round(starts / 3_600_000)} h` : null
  return (
    <Card className="gap-5">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={s.kind} />
          {soon && (
            <Badge variant="info">
              <Clock /> {soon}
            </Badge>
          )}
          {isPast(s) && <Badge variant="secondary">Ended</Badge>}
        </div>
        <CardTitle className="text-lg leading-snug">{s.title}</CardTitle>
        <CardDescription>{s.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PersonChip id={s.host} showRole size="md" />
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            <CalendarCheck className="size-4" aria-label="Date" />
          </dt>
          <dd>{dateLabel(s, zone)}, 2026</dd>
          <dt className="text-muted-foreground">
            <Clock className="size-4" aria-label="Time" />
          </dt>
          <dd className="tabular-nums">
            {timeRange(s, zone)} <span className="text-muted-foreground">· {s.minutes} min</span>
          </dd>
          <dt className="text-muted-foreground">
            <MapPin className="size-4" aria-label="Where" />
          </dt>
          <dd className="truncate">{s.where}</dd>
        </dl>
        {s.note && <p className="rounded-md bg-info-soft px-3 py-2 text-xs text-info-soft-foreground">{s.note}</p>}
        {!isPast(s) && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <Seats s={s} mine={mine} />
              <span className="text-muted-foreground tabular-nums">{s.seats} seats</span>
            </div>
            <Progress
              value={filled}
              aria-label="Seats taken"
              indicatorClassName={left <= 3 && mine !== 'claimed' ? 'bg-warning' : undefined}
            />
          </div>
        )}
        <ClaimButton s={s} mine={mine} onToggle={onToggle} primary className="h-9 w-full" />
        {mine === 'claimed' && (
          <p className="-mt-2 text-center text-xs text-muted-foreground">
            Can’t make it? Release your seat so someone on the waitlist gets it.
          </p>
        )}
        {mine === 'waitlist' && (
          <p className="-mt-2 text-center text-xs text-muted-foreground">
            We’ll email you if a seat opens up. Click again to leave the waitlist.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
