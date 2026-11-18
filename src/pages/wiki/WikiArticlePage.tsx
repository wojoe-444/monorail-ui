import { Bookmark, History, MessageSquare, Pencil, Share2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Sparkline } from '@/components/charts/Sparkline'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Callout, FactList, ProseHeading, TableOfContents, WikiLink, type TocItem } from '@/features/wiki/components'
import { LINE_BY_ID, STATIONS, fmt } from '@/features/wiki/data'
import { href } from '@/lib/router'

/*
 * Layout B · Classic article. The encyclopedia page: contents on the left,
 * long-form prose in the middle, a facts infobox on the right. On small
 * screens the infobox moves above the text and the contents list hides.
 */

const TOC: TocItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'route', label: 'Route' },
  { id: 'route-north', label: 'North Side Main Line', depth: 1 },
  { id: 'route-subway', label: 'State Street subway', depth: 1 },
  { id: 'route-south', label: 'Dan Ryan branch', depth: 1 },
  { id: 'history', label: 'History' },
  { id: 'service', label: 'Service' },
  { id: 'stations', label: 'Busiest stations' },
  { id: 'future', label: 'Future plans' },
]

const line = LINE_BY_ID.red

export function WikiArticlePage() {
  const busiest = STATIONS.filter((s) => s.lines.includes('red'))
    .sort((a, b) => b.weekday - a.weekday)
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Layout B · Classic article"
        title="Red Line"
        description="North–south rapid transit route from Howard to 95th/Dan Ryan."
        actions={
          <>
            <IconAction label="Bookmark" icon={<Bookmark />} />
            <IconAction label="Share link" icon={<Share2 />} />
            <Button variant="outline">
              <History />
              History
            </Button>
            <Button>
              <Pencil />
              Edit
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-2 text-xs text-muted-foreground">
        <span>Last edited 12 min ago by M. Okafor</span>
        <span>Owner: Rail Planning</span>
        <Badge variant="success">Reviewed Oct 2026</Badge>
        <a href={href('/wiki/article')} className="inline-flex items-center gap-1 hover:text-foreground">
          <MessageSquare className="size-3.5" />3 discussion threads
        </a>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)_18rem]">
        <aside className="hidden lg:block">
          <TableOfContents items={TOC} className="sticky top-24" />
        </aside>

        <aside className="xl:order-last">
          <Infobox />
        </aside>

        <article className="flex max-w-3xl min-w-0 flex-col gap-4 text-sm leading-relaxed">
          <ProseHeading id="overview">Overview</ProseHeading>
          <p>
            The <strong>Red Line</strong> is the busiest route on the 'L', averaging about {fmt(line.weekdayK * 1000)} station
            entries each weekday. It runs {line.lengthMi} miles between{' '}
            <WikiLink to="/wiki/station" title="Howard" summary="Northern terminal; transfers to the Purple and Yellow lines.">
              Howard
            </WikiLink>{' '}
            in Rogers Park and 95th/Dan Ryan on the far South Side, with {line.stations} stations. It is one of two lines,
            with the Blue Line, that run 24 hours a day.
          </p>
          <Callout tone="info" title="Sample content">
            This page is a layout draft. Figures are rounded or illustrative; check the source dataset before quoting them.
          </Callout>

          <ProseHeading id="route">Route</ProseHeading>
          <p>
            The route has three distinct sections, each built in a different era and with a different structure. Trains run
            through all three without a change of crew.
          </p>
          <ProseHeading id="route-north" level={3}>
            North Side Main Line
          </ProseHeading>
          <p>
            North of Fullerton, trains run on a four-track embankment and elevated structure shared with the Purple Line
            Express in rush hours and the{' '}
            <WikiLink to="/wiki/article" title="Brown Line" summary="Kimball to the Loop via Ravenswood.">
              Brown Line
            </WikiLink>{' '}
            between Belmont and Fullerton.
          </p>
          <ProseHeading id="route-subway" level={3}>
            State Street subway
          </ProseHeading>
          <p>
            Between North/Clybourn and Roosevelt the line runs in the State Street subway, opened in 1943. The downtown
            platforms at Lake, Monroe and Jackson are connected by a continuous mezzanine-level platform.
          </p>
          <ProseHeading id="route-south" level={3}>
            Dan Ryan branch
          </ProseHeading>
          <p>
            South of Roosevelt the line climbs to the surface and runs in the median of the Dan Ryan Expressway to 95th
            Street. The branch opened in 1969 and was fully rebuilt in 2013.
          </p>

          <ProseHeading id="history">History</ProseHeading>
          <p>
            The northern section began as the Northwestern Elevated in 1900. The routes were combined and renamed under the
            color scheme in 1993; before that, the same trains were known as the Howard–Dan Ryan route. See{' '}
            <WikiLink to="/wiki/timeline" title="History of the 'L'" summary="From the 1892 South Side elevated to today.">
              History of the 'L'
            </WikiLink>{' '}
            for the wider story.
          </p>

          <ProseHeading id="service">Service</ProseHeading>
          <p>
            Trains run every 3 to 6 minutes in rush hours, 6 to 10 minutes midday and evenings, and about every 15 minutes
            overnight. See{' '}
            <WikiLink to="/wiki/glossary" title="Headway" summary="Time between consecutive trains at the same point.">
              headway
            </WikiLink>{' '}
            for how these are measured.
          </p>

          <ProseHeading id="stations">Busiest stations</ProseHeading>
          <Card className="gap-0 py-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Station</th>
                  <th className="px-4 py-2 font-medium">Area</th>
                  <th className="px-4 py-2 text-right font-medium">Avg. weekday</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {busiest.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">
                      <a href={href('/wiki/station')} className="font-medium hover:underline">
                        {s.name}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{s.area}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(s.weekday)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ProseHeading id="future">Future plans</ProseHeading>
          <p>
            The Red Line Extension would carry the line 5.6 miles south from 95th Street to 130th Street, with four new
            stations. Design work is under way.
          </p>
          <Callout tone="warning" title="Open question">
            Opening year is not yet confirmed. Planning to confirm before the next review.
          </Callout>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="text-xs text-muted-foreground">Categories:</span>
            {['Lines & routes', '24-hour service', 'North Side', 'South Side'].map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}

function Infobox() {
  return (
    <Card className="gap-4 xl:sticky xl:top-24">
      <CardHeader>
        <CardTitle>Red Line</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex h-28 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
          Route map
        </div>
        <FactList
          rows={[
            ['Termini', `${line.terminals[0]} · ${line.terminals[1]}`],
            ['Stations', line.stations],
            ['Length', `${line.lengthMi} mi`],
            ['Opened', line.opened],
            ['Owl service', line.owl ? 'Yes, 24 hours' : 'No'],
            ['Depots', 'Howard Yard · 98th Yard'],
            [
              'Weekday',
              <span className="flex items-center gap-2" key="w">
                <span className="tabular-nums">{fmt(line.weekdayK * 1000)}</span>
                <Sparkline data={line.trend} className="h-6 w-16 text-primary" />
              </span>,
            ],
          ]}
        />
      </CardContent>
    </Card>
  )
}

function IconAction({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
