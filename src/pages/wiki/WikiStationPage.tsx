import { Accessibility, ArrowRight, ArrowUpRight, CircleCheck, Database, Pencil, Star, TrainFront, TriangleAlert } from 'lucide-react'

import { Sparkline } from '@/components/charts/Sparkline'
import { StatTile } from '@/components/charts/StatTile'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FactList, LineChip, MiniBars } from '@/features/wiki/components'
import { LINE_BY_ID, STATIONS, fmt } from '@/features/wiki/data'
import { href } from '@/lib/router'

/*
 * Layout C · Entity profile. A bento of cards about one thing (a station):
 * key numbers first, then short facts, related entities and linked data.
 * Best for pages people scan rather than read top to bottom.
 */

const station = STATIONS[0]
const HOURS = ['5a', '6a', '7a', '8a', '9a', '10a', '12p', '2p', '4p', '5p', '6p', '8p', '10p']
const BY_HOUR = [180, 640, 1500, 2100, 1300, 700, 820, 760, 1450, 2350, 1600, 650, 300]

export function WikiStationPage() {
  const nearby = STATIONS.filter((s) => s.area === 'Loop' && s.id !== station.id)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Layout C · Entity profile"
        title={station.name}
        description="Loop elevated and Dearborn subway transfer station at Clark and Lake streets."
        actions={
          <>
            <Button variant="outline">
              <Star />
              Watch
            </Button>
            <Button>
              <Pencil />
              Edit
            </Button>
          </>
        }
      />

      <div className="-mt-4 flex flex-wrap items-center gap-2">
        {station.lines.map((l) => (
          <LineChip key={l} id={l} />
        ))}
        <Badge variant="success">
          <Accessibility />
          Accessible
        </Badge>
        <span className="font-mono text-xs text-muted-foreground">station_id {station.id}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Avg. weekday entries"
          value={fmt(station.weekday)}
          delta={0.06}
          deltaLabel="vs last year"
          trend={<Sparkline data={[12.1, 12.8, 13.4, 13.9, 14.2, 14.8, 15.4]} className="text-primary" />}
        />
        <StatTile label="Lines served" value={String(station.lines.length)} hint="Most in the system" />
        <StatTile label="System rank" value="#1" hint="by weekday entries, 2026" />
        <StatTile label="Open work orders" value="3" delta={0.5} upIsGood={false} deltaLabel="vs last month" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entries by hour</CardTitle>
            <CardDescription>Average weekday, last 90 days. Two commute peaks, evening the larger.</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniBars data={BY_HOUR} labels={HOURS} className="h-40" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facts</CardTitle>
          </CardHeader>
          <CardContent>
            <FactList
              rows={[
                ['Opened', `${station.opened} (elevated)`],
                ['Subway', '1951 (Dearborn)'],
                ['Structure', 'Elevated + subway'],
                ['Platforms', '2 side (Loop) · 1 island (subway)'],
                ['Neighborhood', station.area],
                ['Owner', 'Rail Operations · Loop'],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrainFront className="size-4 text-muted-foreground" />
              Lines here
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {station.lines.map((id) => {
                const l = LINE_BY_ID[id]
                return (
                  <li key={id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <a href={href('/wiki/article')} className="text-sm font-medium hover:underline">
                      {l.name}
                    </a>
                    <span className="truncate text-xs text-muted-foreground">to {l.terminals[0]}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="size-4 text-muted-foreground" />
              Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Status ok>Elevators to both Loop platforms</Status>
            <Status ok>Elevator to Blue Line subway</Status>
            <Status ok={false}>Lake St. east entrance: stairs only</Status>
            <p className="text-xs text-muted-foreground">Status from the elevator feed, checked 5 min ago.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintainers</CardTitle>
            <CardDescription>Ask these people before large edits.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              ['AN', 'A. Novak', 'Station manager'],
              ['JR', 'J. Ruiz', 'Ridership data'],
            ].map(([ini, name, role]) => (
              <div key={name} className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="text-xs">{ini}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{role}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Nearby in the Loop</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <a href={href('/wiki/stations')}>
                  All stations
                  <ArrowRight />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {nearby.map((s) => (
              <a
                key={s.id}
                href={href('/wiki/station')}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-accent hover:text-accent-foreground"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.lines.map((l) => LINE_BY_ID[l].name.replace(' Line', '')).join(' · ')}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fmt(s.weekday)}</span>
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" />
              Data about this station
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {["Daily 'L' station entries", 'Elevator status feed', 'GTFS stops'].map((d) => (
              <a key={d} href={href('/wiki/dataset')} className="flex items-center justify-between gap-2 text-sm font-medium hover:underline">
                <span className="truncate">{d}</span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Status({ ok, children }: { ok: boolean; children: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      )}
      <span>{children}</span>
    </div>
  )
}
