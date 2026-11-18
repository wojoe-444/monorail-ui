import { useEffect, useState, type ReactNode } from 'react'
import { Info, Lightbulb, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

import { LINE_BY_ID, type LineId } from './data'

/**
 * A rail line tag. Neutral on purpose: line identity colors would need their
 * own palette tokens, which is a decision for after a layout is picked.
 */
export function LineChip({ id, short }: { id: LineId; short?: boolean }) {
  const line = LINE_BY_ID[id]
  return <Badge variant="outline">{short ? line.name.replace(' Line', '') : line.name}</Badge>
}

/** An internal wiki link with a hover preview card. */
export function WikiLink({ to, title, summary, children }: { to: string; title: string; summary: string; children: ReactNode }) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a href={href(to)} className="font-medium text-primary underline-offset-4 hover:underline">
          {children}
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
      </HoverCardContent>
    </HoverCard>
  )
}

export interface TocItem {
  id: string
  label: string
  depth?: 0 | 1
}

/** Which section heading is nearest the top of the viewport. */
export function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -65% 0px' },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])
  return active
}

/**
 * "On this page" list. Uses buttons that scroll, not #anchors, because the
 * hash already holds the route.
 */
export function TableOfContents({ items, title = 'Contents', className }: { items: TocItem[]; title?: string; className?: string }) {
  const [ids] = useState(() => items.map((i) => i.id))
  const active = useActiveHeading(ids)
  return (
    <nav aria-label={title} className={className}>
      <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</div>
      <ul className="flex flex-col border-l">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={cn(
                '-ml-px block w-full border-l-2 py-1 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                item.depth === 1 ? 'pl-6' : 'pl-3',
                active === item.id
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const CALLOUT = {
  info: { icon: Info, className: 'bg-info-soft text-info-soft-foreground' },
  warning: { icon: TriangleAlert, className: 'bg-warning-soft text-warning-soft-foreground' },
  tip: { icon: Lightbulb, className: 'bg-primary-soft text-primary-soft-foreground' },
} as const

/** A boxed note inside article prose. */
export function Callout({ tone = 'info', title, children }: { tone?: keyof typeof CALLOUT; title: string; children: ReactNode }) {
  const { icon: Icon, className } = CALLOUT[tone]
  return (
    <div className={cn('flex gap-3 rounded-lg p-4 text-sm', className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="mt-1 opacity-90">{children}</div>
      </div>
    </div>
  )
}

/** Section heading in article prose; offset so the sticky top bar doesn't cover it. */
export function ProseHeading({ id, children, level = 2 }: { id: string; children: ReactNode; level?: 2 | 3 }) {
  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <Tag id={id} className={cn('scroll-mt-24 font-semibold tracking-tight', level === 2 ? 'mt-2 border-b pb-2 text-lg' : 'text-base')}>
      {children}
    </Tag>
  )
}

/** Label / value rows, e.g. an infobox. */
export function FactList({ rows, className }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn('divide-y text-sm', className)}>
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[7rem_1fr] gap-3 py-2 first:pt-0 last:pb-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Simple vertical bars in one series color, for small inline charts. */
export function MiniBars({ data, labels, className }: { data: number[]; labels: string[]; className?: string }) {
  const max = Math.max(...data)
  return (
    <div className={cn('flex h-32 items-end gap-1.5', className)} role="img" aria-label="Bar chart">
      {data.map((v, i) => (
        <div key={labels[i]} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm"
            style={{ height: `${(v / max) * 100}%`, background: 'var(--series-1)' }}
            title={`${labels[i]}: ${v.toLocaleString('en-US')}`}
          />
          <span className="text-xs text-muted-foreground">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}
