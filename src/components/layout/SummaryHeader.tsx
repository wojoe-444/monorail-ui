import type { CSSProperties, ReactNode } from 'react'

import { Sparkline } from '@/components/charts/Sparkline'
import { cn } from '@/lib/utils'

export interface SummaryMetric {
  label: string
  value: ReactNode
  /** Small suffix after the value ("%", "s", "/80"). */
  unit?: string
  /** One short line under the value, e.g. "18% vs last week". May start with an icon. */
  delta?: ReactNode
  /** Color of the delta line. Status colors only mean good / needs attention / bad. */
  tone?: 'good' | 'warning' | 'bad' | 'neutral'
  /** Values for a small trend line next to the figure. */
  trend?: number[]
}

const TONE = {
  good: 'text-success',
  warning: 'text-warning-soft-foreground',
  bad: 'text-destructive',
  neutral: 'text-muted-foreground',
} as const

interface SummaryHeaderProps {
  title: string
  description?: string
  /** Controls that change every number, usually a `Segmented` time range. */
  controls?: ReactNode
  actions?: ReactNode
  /** Two to four headline numbers. */
  metrics: SummaryMetric[]
}

/**
 * Header style B: the title shares a row with the page's headline numbers,
 * in place of a separate row of KPI tiles. For dashboards, reports and
 * overview tabs.
 */
export function SummaryHeader({ title, description, controls, actions, metrics }: SummaryHeaderProps) {
  return (
    <header className="grid grid-cols-1 gap-6 border-b pb-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-8">
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        {controls && <div className="mt-4 flex flex-wrap items-center gap-2">{controls}</div>}
      </div>
      <dl
        className="grid grid-cols-2 gap-y-5 sm:[grid-template-columns:repeat(var(--metrics),minmax(0,1fr))]"
        style={{ '--metrics': metrics.length } as CSSProperties}
      >
        {metrics.map((m) => (
          <div key={m.label} className="flex min-w-0 flex-col border-l px-4 lg:px-5">
            <dt className="truncate text-xs font-medium text-muted-foreground">{m.label}</dt>
            <dd className="mt-1.5 flex items-end justify-between gap-2">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                {m.value}
                {m.unit && <span className="ml-0.5 text-sm font-medium text-muted-foreground">{m.unit}</span>}
              </span>
              {m.trend && <Sparkline data={m.trend} className="mb-1 hidden h-6 w-16 text-primary xl:block" />}
            </dd>
            {m.delta && (
              <dd className={cn('mt-1 flex items-center gap-1 text-xs [&_svg]:size-3.5', TONE[m.tone ?? 'neutral'])}>{m.delta}</dd>
            )}
          </div>
        ))}
      </dl>
    </header>
  )
}
