import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { experiment } from '@/features/lab/catalog'
import { SourceLine } from '@/features/lab/LabKit'
import type { LiveData } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

/**
 * Shared pieces for the narrative views: the experiment header, an article
 * row (kicker / measure / sidenote, the Forecast, Written grid), and the
 * small vocabulary every view writes with.
 */

export function NarrativeHeader({
  id,
  feeds,
  href,
  actions,
}: {
  id: string
  feeds: LiveData<unknown>[]
  href?: string
  actions?: ReactNode
}) {
  const e = experiment(id)
  return (
    <div className="flex flex-col gap-3">
      <PageHeader eyebrow="Experiment · Narrative" title={e.title} description={e.thesis} actions={actions} />
      <SourceLine source={e.source} href={href} feeds={feeds} />
    </div>
  )
}

/** A row of an article: kicker in the left margin, prose in the measure, sidenote on the right. */
export function Row({
  kicker,
  children,
  note,
  lede,
  className,
}: {
  kicker?: ReactNode
  children: ReactNode
  note?: ReactNode
  lede?: boolean
  className?: string
}) {
  return (
    <section className={cn('grid grid-cols-1 gap-x-10 gap-y-3 lg:grid-cols-[7rem_minmax(0,64ch)_16rem]', className)}>
      <div className={cn('pt-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase', lede && 'lg:pt-2.5')}>{kicker}</div>
      <div
        className={cn(
          'text-pretty',
          lede ? 'text-xl leading-snug font-medium tracking-tight sm:text-2xl sm:leading-snug' : 'text-base leading-relaxed text-foreground/85 sm:text-[17px] sm:leading-8',
        )}
      >
        {children}
      </div>
      <aside className="min-w-0 lg:pt-1.5">{note}</aside>
    </section>
  )
}

// ── Words ───────────────────────────────────────────────────────────────────

/** "a, b and c" from nodes. */
export function joinList(parts: ReactNode[], last = 'and'): ReactNode {
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return (
    <>
      {parts.slice(0, -1).map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 2 ? ', ' : ''}
        </span>
      ))}{' '}
      {last} {parts.at(-1)}
    </>
  )
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

/** 1.2 billion / 55.1 million / 830,000 */
export function bigNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)} billion`
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)} million`
  if (n >= 1e4) return `${Math.round(n / 1000).toLocaleString('en-US')},000`
  return Math.round(n).toLocaleString('en-US')
}

export function money(n: number): string {
  if (n >= 100_000) return `$${Math.round(n / 1000).toLocaleString('en-US')}K`
  if (n >= 10_000) return `$${Math.round(n / 100) / 10}K`.replace(/\.0K$/, 'K')
  return `$${Math.round(n).toLocaleString('en-US')}`
}

/** Number words for small counts, digits above ten. */
export function countWord(n: number): string {
  const w = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
  return n <= 10 ? w[n] : n.toLocaleString('en-US')
}

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

/** UK clock time, "02:30". */
export function ukClock(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' })
}
/** UK hour as a phrase: "half past two in the morning"-lite: "2:30 am". */
export function ukWords(ms: number): string {
  const w = new Date(ms).toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit' }).toLowerCase()
  return w === '12:00 pm' ? 'noon' : w === '12:00 am' ? 'midnight' : w
}
export function ukPartOfDay(ms: number): string {
  const h = Number(new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }))
  if (h < 5) return 'overnight'
  if (h < 9) return 'early morning'
  if (h < 12) return 'mid-morning'
  if (h < 14) return 'midday'
  if (h < 17) return 'afternoon'
  if (h < 20) return 'evening'
  return 'late evening'
}

/** Pearson correlation of two equal-length series. */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 3) return 0
  const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n
  const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

export function median(vals: number[]): number {
  const s = [...vals].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
