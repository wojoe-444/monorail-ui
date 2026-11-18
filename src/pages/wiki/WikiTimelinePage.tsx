import { Fragment } from 'react'

import { StatTile } from '@/components/charts/StatTile'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TIMELINE } from '@/features/wiki/data'
import { cn } from '@/lib/utils'

/*
 * Layout H · Timeline. History as a vertical timeline grouped by era, the
 * events alternating sides on wide screens. Best for history pages,
 * project retrospectives and "how did we get here" explainers.
 */

export function WikiTimelinePage() {
  const eras = [...new Set(TIMELINE.map((e) => e.era))]
  const first = TIMELINE[0].year
  const last = TIMELINE[TIMELINE.length - 1].year

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Layout H · Timeline"
        title="History of the 'L'"
        description="From the first elevated line to today's network, in the order it happened."
        actions={<Button variant="outline">Add event</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Years covered" value={String(last - first)} hint={`${first} – ${last}`} />
        <StatTile label="Eras" value={String(eras.length)} hint="private, public, modern" />
        <StatTile label="Events" value={String(TIMELINE.length)} hint="more on linked pages" />
      </div>

      <div className="relative">
        <div className="absolute top-0 bottom-0 left-4 w-px bg-border lg:left-1/2" aria-hidden />
        <ol className="flex flex-col gap-6">
          {eras.map((era) => (
            <Fragment key={era}>
              <li className="relative flex lg:justify-center">
                <span className="relative z-[1] rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {era}
                </span>
              </li>
              {TIMELINE.filter((e) => e.era === era).map((e) => {
                const left = TIMELINE.indexOf(e) % 2 === 0
                return (
                  <li key={e.year} className="relative grid grid-cols-1 pl-10 lg:grid-cols-2 lg:gap-12 lg:pl-0">
                    <span
                      className="absolute top-5 left-4 size-3 -translate-x-1/2 rounded-full bg-card ring-2 ring-primary lg:left-1/2"
                      aria-hidden
                    />
                    <div className={cn(left ? 'lg:col-start-1 lg:text-right' : 'lg:col-start-2')}>
                      <Card className="gap-2 py-4">
                        <CardContent className="flex flex-col gap-1 px-4">
                          <span className="text-2xl font-semibold tracking-tight text-primary tabular-nums">{e.year}</span>
                          <span className="font-semibold">{e.title}</span>
                          <p className="text-sm text-muted-foreground">{e.body}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </li>
                )
              })}
            </Fragment>
          ))}
        </ol>
      </div>
    </div>
  )
}
