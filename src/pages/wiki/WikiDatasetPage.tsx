import { ArrowRight, Clock3, Copy, Database, FileText, GitCommitHorizontal, ShieldCheck, Table2 } from 'lucide-react'

import { Sparkline } from '@/components/charts/Sparkline'
import { StatTile } from '@/components/charts/StatTile'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTabs } from '@/components/layout/PageTabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Callout, FactList } from '@/features/wiki/components'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'

/*
 * Layout D · Dataset reference. A data dictionary page split into tabs:
 * what it is, its columns, a sample, quality checks and a changelog.
 * Best for technical reference that people come back to for one part.
 */

const COLUMNS = [
  {
    name: 'station_id',
    type: 'integer',
    nullable: false,
    desc: "Parent station id. Stable across renames; joins to GTFS stops' parent_station.",
    example: '40380',
  },
  {
    name: 'stationname',
    type: 'text',
    nullable: false,
    desc: 'Station name as shown on signage at the time of the record.',
    example: 'Clark/Lake',
  },
  {
    name: 'date',
    type: 'date',
    nullable: false,
    desc: 'Service date. Trips after midnight count toward the previous day.',
    example: '2026-11-13',
  },
  { name: 'daytype', type: 'text', nullable: false, desc: 'W weekday, A Saturday, U Sunday or holiday.', example: 'W' },
  {
    name: 'rides',
    type: 'integer',
    nullable: false,
    desc: 'Entries through fare control. Transfers inside the paid area are not counted.',
    example: '15402',
  },
]

const SAMPLE = [
  [40380, 'Clark/Lake', '2026-11-13', 'W', 15402],
  [41450, 'Chicago', '2026-11-13', 'W', 13188],
  [41660, 'Lake', '2026-11-13', 'W', 12604],
  [41320, 'Belmont', '2026-11-13', 'W', 11873],
  [40380, 'Clark/Lake', '2026-11-14', 'A', 6211],
  [41450, 'Chicago', '2026-11-14', 'A', 9842],
]

const CHECKS = [
  { name: 'Freshness < 48 h', pass: true, detail: 'Last load 2026-11-16 06:10' },
  { name: 'No duplicate (station_id, date)', pass: true, detail: '0 duplicates' },
  { name: 'Every active station reported', pass: false, detail: '2 stations missing on 2026-11-11' },
  { name: 'daytype in (W, A, U)', pass: true, detail: '0 invalid values' },
]

const CHANGES = [
  { when: '2026-10-02', who: 'J. Ruiz', what: 'Washington/Wabash history back-filled to 2017.' },
  { when: '2026-06-18', who: 'J. Ruiz', what: 'Holidays recoded from W to U to match the schedule.' },
  { when: '2025-12-01', who: 'Data Platform', what: 'Moved to the nightly pipeline; load time now 06:00.' },
]

const TABS: PageTab[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'schema', label: 'Schema', icon: Table2, count: COLUMNS.length },
  { id: 'quality', label: 'Quality', icon: ShieldCheck, count: CHECKS.filter((c) => !c.pass).length },
  { id: 'changelog', label: 'Changelog', icon: GitCommitHorizontal },
]

export function WikiDatasetPage() {
  const [tab] = usePageTab(TABS)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Layout D · Dataset reference"
        title="Daily 'L' station entries"
        description="One row per station per service day: how many people entered through fare control."
        actions={
          <>
            <Button variant="outline">
              <Copy />
              Copy table name
            </Button>
            <Button>
              Open in query tool
              <ArrowRight />
            </Button>
          </>
        }
      />
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="success">Certified</Badge>
        <Badge variant="secondary">Refreshed daily</Badge>
        <Badge variant="secondary">Public</Badge>
        <span className="font-mono text-xs text-muted-foreground">ridership.rail_station_daily</span>
      </div>

      <PageTabs tabs={TABS} aria-label="Dataset sections" />

      {tab === 'overview' && <Overview />}
      {tab === 'schema' && <Schema />}
      {tab === 'quality' && <Quality />}
      {tab === 'changelog' && <Changelog />}
    </div>
  )
}

function Overview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Rows" value="1.27M" hint="since 2001" />
        <StatTile label="Stations" value="145" hint="active today" />
        <StatTile label="Last load" value="06:10" hint="today, on schedule" />
        <StatTile
          label="Weekday total"
          value="418k"
          delta={0.04}
          deltaLabel="vs last year"
          trend={<Sparkline data={[380, 386, 391, 398, 402, 410, 418]} className="text-primary" />}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About this dataset</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm leading-relaxed">
            <p>
              Entries are counted at fare control by the fare system and summed per station per service day. A rider who transfers between
              lines without leaving the paid area is counted once, at the station they entered.
            </p>
            <Callout tone="tip" title="Use for">
              Station comparisons and trends over time. For trips by origin and destination, use the fare tap dataset.
            </Callout>
            <Callout tone="warning" title="Known caveat">
              Stations closed for reconstruction show as missing rows, not zeros. Fill gaps before computing averages.
            </Callout>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <FactList
              rows={[
                ['Owner', 'Ridership Analytics'],
                ['Steward', 'J. Ruiz'],
                ['Source', 'Fare system'],
                ['Grain', 'Station × day'],
                ['Coverage', '2001 – present'],
                ['Update', 'Daily, 06:00'],
                ['Access', 'Public'],
              ]}
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lineage</CardTitle>
          <CardDescription>Where the rows come from and where they go.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2 md:flex-row md:items-center">
            {['Fare gates', 'fare.tap_events', 'ridership.rail_station_daily', 'Ridership dashboard · Open data portal'].map(
              (step, i, all) => (
                <li key={step} className="flex items-center gap-2 md:contents">
                  <div
                    className={
                      i === 2
                        ? 'rounded-lg bg-primary-soft px-3 py-2 font-mono text-xs text-primary-soft-foreground'
                        : 'rounded-lg border px-3 py-2 font-mono text-xs'
                    }
                  >
                    {step}
                  </div>
                  {i < all.length - 1 && <ArrowRight className="size-4 shrink-0 rotate-90 text-muted-foreground md:rotate-0" />}
                </li>
              ),
            )}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

function Schema() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Column</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {COLUMNS.map((c) => (
                <tr key={c.name} className="align-top">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="font-mono">
                      {c.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.desc}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4 text-muted-foreground" />
            Sample rows
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[32rem] font-mono text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.name} className="pr-4 pb-2 font-medium">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((r, i) => (
                <tr key={i} className="border-t">
                  {r.map((v, j) => (
                    <td key={j} className="py-1.5 pr-4 tabular-nums">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function Quality() {
  const passed = CHECKS.filter((c) => c.pass).length
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Checks passing</CardTitle>
          <CardDescription>
            {passed} of {CHECKS.length} on the last load.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress aria-label="Checks passing" value={(passed / CHECKS.length) * 100} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardContent>
          <ul className="divide-y">
            {CHECKS.map((c) => (
              <li key={c.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                </div>
                <Badge variant={c.pass ? 'success' : 'warning'}>{c.pass ? 'Pass' : 'Attention'}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function Changelog() {
  return (
    <Card>
      <CardContent>
        <ol className="flex flex-col">
          {CHANGES.map((c) => (
            <li key={c.when} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Clock3 className="size-3.5" />
                </div>
                <div className="mt-1 w-px flex-1 bg-border" />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="text-sm font-medium">{c.what}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="tabular-nums">{c.when}</span> · {c.who}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
