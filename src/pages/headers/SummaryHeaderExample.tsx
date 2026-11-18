import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CircleCheck, Download, TriangleAlert } from 'lucide-react'

import { SummaryHeader, type SummaryMetric } from '@/components/layout/SummaryHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'

/*
 * Example: header style B. SummaryHeader puts the headline numbers next to
 * the title; the time range in the header changes all of them.
 */

type Range = '24h' | '7d' | '30d' | '90d'

const RANGES: { value: Range; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: 'Quarter' },
]

const SCALE: Record<Range, number> = { '24h': 1 / 7, '7d': 1, '30d': 4.3, '90d': 12.9 }
const SERIES = [12, 15, 14, 18, 17, 22, 21, 25, 24, 28, 26, 31, 30, 34]

function metricsFor(range: Range): SummaryMetric[] {
  const s = SCALE[range]
  const offset = Object.keys(SCALE).indexOf(range)
  const trend = SERIES.slice(offset, offset + 9)
  return [
    {
      label: 'Sessions',
      value: Math.round(2418 * s).toLocaleString(),
      delta: (
        <>
          <ArrowUpRight />
          18% vs previous
        </>
      ),
      tone: 'good',
      trend,
    },
    {
      label: 'Active people',
      value: Math.min(80, Math.round(40 + 24 * Math.sqrt(s))),
      unit: '/80',
      delta: 'across 6 teams',
      trend: [40, 42, 41, 45, 47, 46, 50, 52, 55],
    },
    {
      label: 'Median response',
      value: '1.2',
      unit: 's',
      delta: (
        <>
          <TriangleAlert />
          slower on Tuesday
        </>
      ),
      tone: 'warning',
      trend: [8, 9, 14, 13, 9, 8, 9, 8, 7],
    },
    {
      label: 'Errors',
      value: '0.4',
      unit: '%',
      delta: (
        <>
          <CircleCheck />
          under target
        </>
      ),
      tone: 'good',
      trend: [9, 8, 8, 6, 6, 5, 4, 4, 3],
    },
  ]
}

const TEAMS = [
  { name: 'Design', share: 82 },
  { name: 'Platform', share: 64 },
  { name: 'Growth', share: 51 },
  { name: 'Support', share: 37 },
]

const SLOW = [
  { page: '/reports/quarterly', ms: 2400, change: 0.3 },
  { page: '/projects/import', ms: 1900, change: -0.1 },
  { page: '/settings/billing', ms: 1300, change: 0.12 },
  { page: '/inbox', ms: 900, change: -0.22 },
]

export function SummaryHeaderExample() {
  const [range, setRange] = useState<Range>('7d')

  return (
    <div className="flex flex-col gap-8">
      <SummaryHeader
        title="Usage"
        description="How the team used the workspace."
        controls={<Segmented value={range} onChange={setRange} options={RANGES} aria-label="Time range" />}
        actions={
          <Button variant="outline" size="icon" aria-label="Export">
            <Download />
          </Button>
        }
        metrics={metricsFor(range)}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Busiest teams</CardTitle>
            <CardDescription>Share of people active at least once.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {TEAMS.map((t) => (
              <div key={t.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span>{t.name}</span>
                  <span className="text-muted-foreground tabular-nums">{t.share}%</span>
                </div>
                <Progress value={t.share} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Slowest pages</CardTitle>
            <CardDescription>Median load time, change vs the previous period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {SLOW.map((p) => (
                <li key={p.page} className="flex items-center gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs">{p.page}</code>
                  <span className="tabular-nums">{(p.ms / 1000).toFixed(1)}s</span>
                  <span
                    className={`inline-flex w-16 items-center justify-end gap-0.5 text-xs tabular-nums ${p.change > 0 ? 'text-destructive' : 'text-success'}`}
                  >
                    {p.change > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {Math.abs(p.change * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
