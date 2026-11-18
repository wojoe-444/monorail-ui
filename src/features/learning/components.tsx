import type { ReactNode } from 'react'
import {
  CalendarClock,
  Clapperboard,
  FileText,
  FlaskConical,
  GraduationCap,
  Headphones,
  ListChecks,
  Route,
  Signpost,
  SquareCheckBig,
  TableProperties,
  type LucideIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { FORMAT_LABELS, PERSON_BY_ID, TOPIC_BY_ID, type Format, type Item } from './data'

export const FORMAT_ICONS: Record<Format, LucideIcon> = {
  howto: ListChecks,
  video: Clapperboard,
  article: FileText,
  course: GraduationCap,
  path: Route,
  live: CalendarClock,
  podcast: Headphones,
  cheatsheet: TableProperties,
  quiz: SquareCheckBig,
  lab: FlaskConical,
  guide: Signpost,
}

/** Neutral format tag with its icon. Formats aren't statuses, so no status hues. */
export function FormatBadge({ format, className }: { format: Format; className?: string }) {
  const Icon = FORMAT_ICONS[format]
  return (
    <Badge variant="outline" className={className}>
      <Icon />
      {FORMAT_LABELS[format]}
    </Badge>
  )
}

/** Small avatar + name (+ role) for an author id from PEOPLE. */
export function PersonChip({ id, showRole, size = 'sm' }: { id: string; showRole?: boolean; size?: 'sm' | 'md' }) {
  const p = PERSON_BY_ID[id]
  if (!p) return null
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar className={size === 'sm' ? 'size-6' : 'size-8'}>
        <AvatarFallback className="bg-primary-soft text-[10px] font-semibold text-primary-soft-foreground">{p.initials}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium">{p.name}</span>
        {showRole && <span className="truncate text-xs text-muted-foreground">{p.role}</span>}
      </span>
    </span>
  )
}

/* ---------- Cover art ---------- */

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let s = seed || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

type Motif = 'rings' | 'bars' | 'grid' | 'waves' | 'arcs' | 'steps'

const FORMAT_MOTIF: Record<Format, Motif> = {
  howto: 'steps',
  video: 'bars',
  article: 'waves',
  course: 'grid',
  path: 'arcs',
  live: 'rings',
  podcast: 'waves',
  cheatsheet: 'grid',
  quiz: 'rings',
  lab: 'bars',
  guide: 'arcs',
}

/**
 * Generated cover art: an abstract geometric drawing seeded by a string, in
 * one chart series color. Stands in for thumbnails and hero images, so the
 * mockups need no image files and follow every palette and mode.
 *
 * `series` picks the color (1–6). `motif` picks the drawing; by default it
 * follows the item's format.
 */
export function Cover({
  seed,
  series = 1,
  motif = 'rings',
  className,
  children,
}: {
  seed: string
  series?: number
  motif?: Motif
  className?: string
  children?: ReactNode
}) {
  const r = rng(hash(seed))
  const c = `var(--series-${((series - 1) % 6) + 1})`
  const shapes: ReactNode[] = []
  if (motif === 'rings') {
    const cx = 20 + r() * 60
    const cy = 20 + r() * 60
    for (let i = 6; i > 0; i--)
      shapes.push(
        <circle key={i} cx={cx} cy={cy} r={i * 14} fill="none" stroke={c} strokeWidth={i % 2 ? 1.5 : 6} opacity={0.15 + i * 0.08} />,
      )
    shapes.push(<circle key="dot" cx={cx} cy={cy} r={6} fill={c} />)
  } else if (motif === 'bars') {
    for (let i = 0; i < 12; i++) {
      const h = 15 + r() * 70
      shapes.push(<rect key={i} x={4 + i * 8} y={100 - h} width={5} height={h} rx={1.5} fill={c} opacity={0.3 + r() * 0.7} />)
    }
  } else if (motif === 'grid') {
    for (let x = 0; x < 6; x++)
      for (let y = 0; y < 6; y++) {
        const v = r()
        if (v > 0.35)
          shapes.push(
            <rect
              key={`${x}-${y}`}
              x={6 + x * 15}
              y={6 + y * 15}
              width={12}
              height={12}
              rx={v > 0.8 ? 6 : 2}
              fill={c}
              opacity={0.15 + v * 0.75}
            />,
          )
      }
  } else if (motif === 'waves') {
    for (let i = 0; i < 7; i++) {
      const y = 18 + i * 12
      const a = 4 + r() * 10
      shapes.push(
        <path
          key={i}
          d={`M -5 ${y} Q 20 ${y - a} 45 ${y} T 95 ${y} T 145 ${y}`}
          fill="none"
          stroke={c}
          strokeWidth={2.5}
          opacity={0.25 + i * 0.1}
        />,
      )
    }
  } else if (motif === 'arcs') {
    for (let i = 0; i < 5; i++) {
      const rad = 20 + i * 16
      shapes.push(
        <path
          key={i}
          d={`M 0 ${100 - rad} A ${rad} ${rad} 0 0 1 ${rad} 100`}
          fill="none"
          stroke={c}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.25 + i * 0.15}
          transform={`rotate(${i % 2 ? 0 : 90 * Math.floor(r() * 2)} 50 50)`}
        />,
      )
    }
    shapes.push(<circle key="stop" cx={30 + r() * 50} cy={20 + r() * 30} r={5} fill={c} />)
  } else {
    for (let i = 0; i < 6; i++)
      shapes.push(<rect key={i} x={8 + i * 14} y={84 - i * 13} width={14} height={8 + i * 13} rx={2} fill={c} opacity={0.2 + i * 0.14} />)
  }
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-muted', className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <rect width="100" height="100" fill={c} opacity={0.12} />
        {shapes}
      </svg>
      {children && <div className="relative size-full">{children}</div>}
    </div>
  )
}

/** Cover art for an Item: color from its topic, drawing from its format. */
export function ItemCover({ item, className, children }: { item: Item; className?: string; children?: ReactNode }) {
  return (
    <Cover seed={item.id} series={TOPIC_BY_ID[item.topic].series} motif={FORMAT_MOTIF[item.format]} className={className}>
      {children}
    </Cover>
  )
}
