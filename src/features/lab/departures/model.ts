import type { Launch } from '@/features/lab/feeds'

/**
 * Launch Library rows turned into departures-board text: short operator and
 * site names, airport-style statuses, a region for filtering, and times that
 * respect how precise the launch date really is.
 */

const OPERATORS: Record<string, string> = {
  'China Aerospace Science and Technology Corporation': 'CASC',
  'Space Exploration Technologies Corp.': 'SpaceX',
  SpaceX: 'SpaceX',
  'Russian Federal Space Agency (ROSCOSMOS)': 'Roscosmos',
  'Russian Space Forces': 'RU Space Forces',
  'Indian Space Research Organization': 'ISRO',
  'United Launch Alliance': 'ULA',
  'Rocket Lab': 'Rocket Lab',
  'Rocket Lab Ltd': 'Rocket Lab',
  Arianespace: 'Arianespace',
  'Avio S.p.A': 'Avio',
  'Isar Aerospace': 'Isar',
  'Blue Origin': 'Blue Origin',
  'Japan Aerospace Exploration Agency': 'JAXA',
  'Mitsubishi Heavy Industries': 'MHI',
  'Northrop Grumman Space Systems': 'Northrop',
  'Firefly Aerospace': 'Firefly',
  'Galactic Energy': 'Galactic Energy',
  'CAS Space': 'CAS Space',
  'Agency for Defense Development': 'ADD Korea',
  LandSpace: 'LandSpace',
  ExPace: 'ExPace',
  'China Rocket Company Limited': 'China Rocket',
  'Relativity Space': 'Relativity',
  'Virgin Galactic': 'Virgin Galactic',
  'National Aeronautics and Space Administration': 'NASA',
}

export function operator(name: string): string {
  if (OPERATORS[name]) return OPERATORS[name]
  if (name.length <= 14) return name
  const initials = name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w) && !['Of', 'The', 'And'].includes(w))
    .map((w) => w[0])
    .join('')
  return initials.length >= 2 ? initials : name.slice(0, 14)
}

const COUNTRY: [RegExp, string][] = [
  [/USA$/, 'US'],
  [/China$/, 'CN'],
  [/Russian Federation$/, 'RU'],
  [/Kazakhstan$/, 'KZ'],
  [/New Zealand$/, 'NZ'],
  [/India$/, 'IN'],
  [/French Guiana$/, 'GF'],
  [/Japan$/, 'JP'],
  [/Andøya/, 'NO'],
  [/Korea/, 'KR'],
  [/Iran/, 'IR'],
  [/United Kingdom|Scotland|Shetland/, 'UK'],
  [/Australia$/, 'AU'],
]

export function countryCode(location: string): string {
  for (const [re, code] of COUNTRY) if (re.test(location)) return code
  return ''
}

const SITE_TRIM =
  / (Satellite Launch Center|Space Launch Site|Cosmodrome|SFS|SFB|Space Force Station|Space Force Base|Space Center|Space Centre|Spaceport|Launch Complex \d+)$/

const SITE_NAMES: Record<string, string> = {
  'Guiana Space Centre': 'Kourou',
  'Satish Dhawan Space Centre': 'Sriharikota',
  'Rocket Lab Launch Complex 1': 'Mahia',
  'SpaceX Starbase': 'Starbase',
  'Kennedy Space Center': 'Kennedy',
}

/** "Cape Canaveral, US" from "Cape Canaveral SFS, FL, USA". */
export function site(location: string): string {
  const first = location.split(',')[0].trim()
  const name = SITE_NAMES[first] ?? first.replace(SITE_TRIM, '')
  const cc = countryCode(location)
  return cc ? `${name}, ${cc}` : name
}

export type Region = 'all' | 'us' | 'cn' | 'ru' | 'rest'
export const REGIONS: { value: Region; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'us', label: 'US' },
  { value: 'cn', label: 'China' },
  { value: 'ru', label: 'Russia' },
  { value: 'rest', label: 'Rest of world' },
]

export function regionOf(l: Launch): Exclude<Region, 'all'> {
  const cc = countryCode(l.location)
  if (cc === 'US') return 'us'
  if (cc === 'CN') return 'cn'
  if (cc === 'RU' || cc === 'KZ') return 'ru'
  return 'rest'
}

export type Tone = 'success' | 'info' | 'warning' | 'destructive' | 'neutral'
export interface BoardStatus {
  label: string
  tone: Tone
  meaning: string
}

export function boardStatus(l: Launch): BoardStatus {
  switch (l.status) {
    case 'Go':
      return { label: 'ON TIME', tone: 'success', meaning: 'Go for launch: T-0 confirmed' }
    case 'TBC':
      return { label: 'EXPECTED', tone: 'info', meaning: 'To be confirmed: date likely but not official' }
    case 'TBD':
      return { label: 'SCHEDULED', tone: 'neutral', meaning: 'To be determined: date is a placeholder' }
    case 'Hold':
      return { label: 'HOLD', tone: 'warning', meaning: 'Countdown on hold' }
    case 'In Flight':
      return { label: 'IN FLIGHT', tone: 'info', meaning: 'Launched; flight in progress' }
    case 'Success':
      return { label: 'DEPARTED', tone: 'success', meaning: 'Launch successful' }
    case 'Failure':
      return { label: 'FAILED', tone: 'destructive', meaning: 'Launch failed' }
    case 'Partial Failure':
      return { label: 'PARTIAL', tone: 'warning', meaning: 'Partial failure' }
    default:
      return { label: (l.statusName || l.status || '—').toUpperCase().slice(0, 10), tone: 'neutral', meaning: l.statusName }
  }
}

/** Is the T-0 good to the hour or better? Only those get countdowns and land on day strips. */
export const isFirm = (l: Launch) => ['Second', 'Minute', 'Hour'].includes(l.precision)
/** Good to the day or better. */
export const isDated = (l: Launch) => isFirm(l) || l.precision === 'Day'

const MON = (t: number) => new Date(t).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
const DAY = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
const HM = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/** T-0 cell, in local time, honest about precision: "18 NOV 17:50", "~17:00", "NET 25 NOV", "NOV", "Q4". */
export function t0Text(l: Launch): string {
  if (l.precision === 'Second' || l.precision === 'Minute') return `${DAY(l.net)} ${HM(l.net)}`
  if (l.precision === 'Hour') return `${DAY(l.net)} ~${HM(l.net).slice(0, 2)}:00`
  if (l.precision === 'Day') return `NET ${DAY(l.net)}`
  if (l.precision === 'Month') return `NET ${MON(l.net)}`
  const q = l.precision.match(/Quarter (\d)/)
  if (q) return `NET Q${q[1]}`
  const h = l.precision.match(/Half (\d)/)
  if (h) return `NET H${h[1]}`
  return `NET ${new Date(l.net).getFullYear()}`
}

/** Countdown cell: "IN 42M", "IN 3H 12M", "IN 2D 04H", "~6D", or "—" when the date is a placeholder. */
export function inText(l: Launch, now: number): string {
  const ms = l.net - now
  if (l.status === 'In Flight') return 'LIFTED OFF'
  if (!isDated(l)) return '—'
  if (ms < 0) return isFirm(l) ? 'DUE' : '—'
  const m = Math.floor(ms / 60_000)
  if (l.precision === 'Day') return `~${Math.max(1, Math.round(ms / 86_400_000))}D`
  if (m < 60) return `IN ${m}M`
  const h = Math.floor(m / 60)
  if (h < 24) return `IN ${h}H ${String(m % 60).padStart(2, '0')}M`
  return `IN ${Math.floor(h / 24)}D ${String(h % 24).padStart(2, '0')}H`
}

export function agoText(t: number, now: number): string {
  const h = Math.floor((now - t) / 3_600_000)
  if (h < 1) return 'JUST NOW'
  if (h < 48) return `${h}H AGO`
  return `${Math.floor(h / 24)}D AGO`
}

export const localDayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export const fmtWindow = (l: Launch) =>
  l.windowStart && l.windowEnd && l.windowEnd > l.windowStart ? `${HM(l.windowStart)}–${HM(l.windowEnd)}` : l.windowStart ? HM(l.windowStart) : '—'
