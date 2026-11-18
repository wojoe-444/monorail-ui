import { ArrowRight } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { HUB } from '@/features/learning/data'
import { HOME_MOCKUPS, PAGE_MOCKUPS, type Mockup } from '@/features/learning/mockups'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Review index for the Learning hub mockups: one card per mockup with a
 * schematic, what it's best for, and its trade-off.
 */

const SPAN: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
}
const ROW: Record<number, string> = { 1: 'row-span-1', 2: 'row-span-2', 3: 'row-span-3', 4: 'row-span-4' }

function Sketch({ blocks }: { blocks: Mockup['sketch'] }) {
  return (
    <div className="grid aspect-[16/9] grid-cols-6 grid-rows-4 gap-1.5 rounded-lg bg-muted/60 p-3" aria-hidden>
      {blocks.map(([c, r, tone], i) => (
        <div key={i} className={cn('rounded-sm', SPAN[c], ROW[r], tone === 'p' ? 'bg-primary/40' : 'bg-muted-foreground/20')} />
      ))}
    </div>
  )
}

function MockupGrid({ items }: { items: Mockup[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((m) => (
        <a key={m.path} href={href(m.path)} className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-shadow group-hover:shadow-elevation-2">
            <CardContent>
              <Sketch blocks={m.sketch} />
            </CardContent>
            <CardHeader>
              <CardTitle className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-muted-foreground">{m.letter}</span>
                {m.label}
              </CardTitle>
              <CardDescription>{m.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-medium">Best for: </span>
                <span className="text-muted-foreground">{m.bestFor}</span>
              </p>
              <p>
                <span className="font-medium">Trade-off: </span>
                <span className="text-muted-foreground">{m.tradeoff}</span>
              </p>
            </CardContent>
            <CardFooter className="mt-auto text-sm font-medium text-primary">
              Open mockup <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </CardFooter>
          </Card>
        </a>
      ))}
    </div>
  )
}

export function LearningHomesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Learning hub: home pages"
        description={`Six ways into ${HUB.name}, ${HUB.org}'s learning hub. Same content, different promises about what the place is for.`}
      />
      <MockupGrid items={HOME_MOCKUPS} />
    </div>
  )
}

export function LearningPagesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Learning hub: pages"
        description={`Twelve kinds of page inside ${HUB.name}, from a two-minute how-to to a five-module path.`}
      />
      <MockupGrid items={PAGE_MOCKUPS} />
    </div>
  )
}
