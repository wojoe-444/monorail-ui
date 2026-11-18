import { ArrowRight, BookOpen, Database, FilePlus2, History, Search, TrainFront, TriangleAlert, Wrench, Warehouse, MapPin } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LineChip } from '@/features/wiki/components'
import { CATEGORIES, LINES, RECENT_EDITS } from '@/features/wiki/data'
import { href, navigate } from '@/lib/router'

/*
 * Layout A · Portal. The wiki's front door: one search box, a featured
 * article, browse-by-category, and what changed recently.
 */

const CATEGORY_ICON = {
  lines: TrainFront,
  stations: MapPin,
  datasets: Database,
  ops: Wrench,
  fleet: Warehouse,
  history: History,
} as const

const KIND = {
  edit: { label: 'Edited', variant: 'secondary' },
  new: { label: 'New', variant: 'success' },
  review: { label: 'Needs review', variant: 'warning' },
} as const

const STALE = [
  { title: 'Yard assignments', age: '14 months' },
  { title: 'Holiday service template', age: '11 months' },
  { title: 'Rail car series 2600', age: '9 months' },
]

export function WikiPortalPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Layout A · Portal"
        title="Transit Wiki"
        description="What we know about the 'L': lines, stations, data and how we run them."
        actions={
          <Button type="button">
            <FilePlus2 />
            New page
          </Button>
        }
      />

      <Card className="bg-primary-soft text-primary-soft-foreground ring-0">
        <CardContent className="flex flex-col gap-3">
          <Label htmlFor="wiki-search" className="text-base font-semibold">
            Search 309 articles
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="wiki-search" placeholder="Try “Clark/Lake”, “headway” or “daytype”" className="h-11 pl-9 text-foreground" />
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="opacity-80">Popular:</span>
            {['Red Line', 'Daily station entries', 'Slow zones', 'Owl service'].map((t) => (
              <a key={t} href={href('/wiki/article')} className="font-medium underline-offset-4 hover:underline">
                {t}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Featured article</div>
            <CardTitle className="text-xl">Red Line</CardTitle>
            <CardDescription>The busiest route in the system, running 24 hours from Howard to 95th/Dan Ryan.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed">
              The Red Line carries more riders than any other 'L' route. It runs on the North Side Main Line elevated
              structure, dives into the State Street subway downtown, and finishes in the median of the Dan Ryan Expressway.
              It is one of only two lines with overnight Owl service.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">33 stations</Badge>
              <Badge variant="secondary">23.4 mi</Badge>
              <Badge variant="secondary">Since 1900</Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="soft" onClick={() => navigate('/wiki/article')}>
              Read article
              <ArrowRight />
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-warning" />
              Needs attention
            </CardTitle>
            <CardDescription>Pages nobody has touched in a long time.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {STALE.map((s) => (
                <li key={s.title} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <a href={href('/wiki/docs')} className="min-w-0 truncate text-sm font-medium hover:underline">
                    {s.title}
                  </a>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.age}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Browse by category</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c.id]
            return (
              <a
                key={c.id}
                href={href(c.id === 'stations' ? '/wiki/stations' : c.id === 'datasets' ? '/wiki/dataset' : '/wiki/article')}
                className="group flex gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow outline-none hover:shadow-elevation-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary-soft group-hover:text-primary-soft-foreground">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{c.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{c.count}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.blurb}</p>
                </div>
              </a>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent changes</CardTitle>
            <CardDescription>Edits across the wiki in the last few days.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm">
                All changes
                <ArrowRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {RECENT_EDITS.map((e) => (
                <li key={e.title} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <a href={href(e.path)} className="block truncate text-sm font-medium hover:underline">
                      {e.title}
                    </a>
                    <div className="truncate text-xs text-muted-foreground">
                      {e.summary} · {e.editor} · {e.when}
                    </div>
                  </div>
                  <Badge variant={KIND[e.kind].variant}>{KIND[e.kind].label}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground" />
              Lines
            </CardTitle>
            <CardDescription>Jump straight to a line article.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {LINES.map((l) => (
                <li key={l.id}>
                  <a href={href('/wiki/article')} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                    <LineChip id={l.id} />
                    <span className="truncate text-xs text-muted-foreground">
                      {l.terminals[0]} – {l.terminals[1]}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
