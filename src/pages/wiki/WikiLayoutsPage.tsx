import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { href } from '@/lib/router'

/*
 * Review index for the wiki layout drafts: one card per layout with a
 * schematic, what it's for, and its trade-off.
 */

const B = ({ className = '' }: { className?: string }) => <div className={`rounded-sm bg-muted-foreground/20 ${className}`} />
const P = ({ className = '' }: { className?: string }) => <div className={`rounded-sm bg-primary/40 ${className}`} />

interface Draft {
  letter: string
  title: string
  path: string
  bestFor: string
  tradeoff: string
  tags: string[]
  sketch: ReactNode
}

const DRAFTS: Draft[] = [
  {
    letter: 'A',
    title: 'Portal',
    path: '/wiki',
    bestFor: 'The wiki home: search first, then a featured page, categories and recent changes.',
    tradeoff: 'Needs curation (featured page, stale list) or it goes stale itself.',
    tags: ['Home', 'Browse'],
    sketch: (
      <div className="flex h-full flex-col gap-1.5">
        <P className="h-5" />
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          <B className="col-span-2" />
          <B />
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          <B />
          <B />
          <B />
        </div>
      </div>
    ),
  },
  {
    letter: 'B',
    title: 'Classic article',
    path: '/wiki/article',
    bestFor: 'Long-form encyclopedia pages: contents, prose, and an infobox of key facts.',
    tradeoff: 'Familiar and dense; three columns need a wide screen to breathe.',
    tags: ['Article', 'Reading'],
    sketch: (
      <div className="grid h-full grid-cols-[1fr_3fr_1.4fr] gap-1.5">
        <div className="flex flex-col gap-1">
          <B className="h-1.5" />
          <P className="h-1.5" />
          <B className="h-1.5" />
          <B className="h-1.5" />
        </div>
        <div className="flex flex-col gap-1">
          {[...Array(7)].map((_, i) => (
            <B key={i} className="h-1.5" />
          ))}
        </div>
        <B />
      </div>
    ),
  },
  {
    letter: 'C',
    title: 'Entity profile',
    path: '/wiki/station',
    bestFor: 'One thing at a glance (a station, a railcar series): numbers, facts, related pages.',
    tradeoff: 'Scannable, but little room for narrative. Pair with an article for depth.',
    tags: ['Profile', 'Dashboard'],
    sketch: (
      <div className="flex h-full flex-col gap-1.5">
        <div className="grid grid-cols-4 gap-1.5">
          <P className="h-4" />
          <B className="h-4" />
          <B className="h-4" />
          <B className="h-4" />
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          <B className="col-span-2" />
          <B />
          <B />
          <B />
          <B />
        </div>
      </div>
    ),
  },
  {
    letter: 'D',
    title: 'Dataset reference',
    path: '/wiki/dataset',
    bestFor: 'Data dictionaries: overview, schema, quality and changelog behind tabs.',
    tradeoff: 'Tabs hide content from Ctrl+F and skimmers; good when people come back for one part.',
    tags: ['Tabs', 'Technical'],
    sketch: (
      <div className="flex h-full flex-col gap-1.5">
        <div className="flex gap-1">
          <P className="h-2.5 w-8" />
          <B className="h-2.5 w-8" />
          <B className="h-2.5 w-8" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_0.6fr_2fr] gap-1">
              <B className="h-2" />
              <B className="h-2" />
              <B className="h-2" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    letter: 'E',
    title: 'Three-pane docs',
    path: '/wiki/docs',
    bestFor: 'Runbooks and procedures in a deep tree. Always shows where you are.',
    tradeoff: 'Full-width layout; the tree pane competes with the app drawer on small screens.',
    tags: ['Docs', 'Full width'],
    sketch: (
      <div className="grid h-full grid-cols-[1.2fr_3fr_1fr] gap-1.5">
        <div className="flex flex-col gap-1 rounded-sm bg-muted-foreground/10 p-1">
          <B className="h-1.5" />
          <B className="ml-2 h-1.5" />
          <P className="ml-2 h-1.5" />
          <B className="h-1.5" />
        </div>
        <div className="flex flex-col gap-1">
          {[...Array(7)].map((_, i) => (
            <B key={i} className="h-1.5" />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <B className="h-1.5" />
          <B className="h-1.5" />
        </div>
      </div>
    ),
  },
  {
    letter: 'F',
    title: 'Directory',
    path: '/wiki/stations',
    bestFor: 'Category pages: A–Z index with filters, list or card view.',
    tradeoff: 'Great for finding, not for learning. Depends on good page metadata.',
    tags: ['Index', 'Filters'],
    sketch: (
      <div className="flex h-full flex-col gap-1.5">
        <B className="h-3" />
        <div className="flex gap-0.5">
          {[...Array(12)].map((_, i) => (
            <B key={i} className="h-1.5 flex-1" />
          ))}
        </div>
        <P className="h-1.5 w-3" />
        {[...Array(4)].map((_, i) => (
          <B key={i} className="h-2" />
        ))}
      </div>
    ),
  },
  {
    letter: 'G',
    title: 'Glossary',
    path: '/wiki/glossary',
    bestFor: 'Shared vocabulary that other pages link into; cross-references jump between terms.',
    tradeoff: 'Only works if terms stay short; long entries belong on their own page.',
    tags: ['Reference'],
    sketch: (
      <div className="grid h-full grid-cols-[1fr_3fr] gap-1.5">
        <div className="flex flex-col gap-1">
          {[...Array(6)].map((_, i) => (
            <B key={i} className="h-1.5" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <P className="h-2 w-1/3" />
              <B className="h-1.5" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    letter: 'H',
    title: 'Timeline',
    path: '/wiki/timeline',
    bestFor: 'History, retrospectives and "how did we get here" pages.',
    tradeoff: 'Lovely for chronology; awkward for anything that is not a sequence of events.',
    tags: ['History', 'Narrative'],
    sketch: (
      <div className="relative grid h-full grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/40" />
        <B className="h-4" />
        <div />
        <div />
        <B className="h-4" />
        <B className="h-4" />
        <div />
      </div>
    ),
  },
]

export function WikiLayoutsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Wiki drafts"
        title="Layout drafts"
        description="Eight ways to lay out an internal wiki, all filled with sample Chicago 'L' content. Open each one, then pick the ones to keep."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DRAFTS.map((d) => (
          <Card key={d.letter} className="gap-4 pt-4">
            <CardContent className="px-4">
              <a
                href={href(d.path)}
                aria-label={`Open ${d.title}`}
                className="block h-28 rounded-lg border bg-background p-3 transition-shadow hover:shadow-elevation-2"
              >
                {d.sketch}
              </a>
            </CardContent>
            <CardHeader className="px-4">
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary-soft text-xs text-primary-soft-foreground">
                  {d.letter}
                </span>
                {d.title}
              </CardTitle>
              <CardDescription>{d.bestFor}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Trade-off: </span>
                {d.tradeoff}
              </p>
              <div className="flex flex-wrap gap-1">
                {d.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="mt-auto px-4">
              <a href={href(d.path)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Open draft
                <ArrowRight className="size-4" />
              </a>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
