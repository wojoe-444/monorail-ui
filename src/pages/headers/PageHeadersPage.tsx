import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Catalog of the page header styles. Each card links to a live example page
 * under /headers/… (or the PageTabs example for the default header).
 */

type Thumb = 'default' | 'command' | 'summary' | 'banner' | 'entity' | 'list' | 'split' | 'collapsing' | 'task'

const HEADERS: { thumb: Thumb; name: string; component: string; path: string; use: string }[] = [
  {
    thumb: 'default',
    name: 'Default',
    component: 'PageHeader',
    path: '/examples/tabs',
    use: 'Most pages. A title, one line of description and the actions.',
  },
  {
    thumb: 'command',
    name: 'Command bar',
    component: 'PageCommandBar',
    path: '/headers/command-bar',
    use: 'Tools, editors, dense data. Title, tabs and actions move into the top bar.',
  },
  {
    thumb: 'summary',
    name: 'Summary',
    component: 'SummaryHeader',
    path: '/headers/summary',
    use: 'Dashboards and reports. The headline numbers sit next to the title.',
  },
  {
    thumb: 'banner',
    name: 'Banner',
    component: 'PageBanner',
    path: '/headers/banner',
    use: 'Home and section front doors. A greeting, a big search, shortcuts.',
  },
  {
    thumb: 'entity',
    name: 'Entity',
    component: 'EntityHeader',
    path: '/headers/entity',
    use: 'Detail pages. Identity, status and facts, with sections as tabs.',
  },
  {
    thumb: 'list',
    name: 'List toolbar',
    component: 'ListHeader',
    path: '/headers/list',
    use: 'Lists and tables. The toolbar is the header and turns into bulk actions.',
  },
  {
    thumb: 'split',
    name: 'Side header',
    component: 'SplitPage',
    path: '/headers/split',
    use: 'Settings, forms, docs. A sticky left column that explains the page.',
  },
  {
    thumb: 'collapsing',
    name: 'Collapsing',
    component: 'CollapsingHeader',
    path: '/headers/collapsing',
    use: 'Reading pages. A large title that hands off to the top bar on scroll.',
  },
  {
    thumb: 'task',
    name: 'Task bar',
    component: 'TaskBar',
    path: '/headers/task',
    use: 'Create and edit flows. The top bar becomes Close, steps and Save.',
  },
]

export function PageHeadersPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Page headers"
        description="Pick the header by what the page is for, not page by page. Each card opens a live example."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {HEADERS.map((h) => (
          <a key={h.path} href={href(h.path)} className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
            <Card className="h-full gap-4 py-4 transition-shadow group-hover:shadow-elevation-2">
              <div className="px-4">
                <HeaderThumb kind={h.thumb} />
              </div>
              <div className="flex flex-col gap-1 px-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{h.name}</span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
                <code className="font-mono text-xs text-primary">{h.component}</code>
                <p className="mt-1 text-sm text-muted-foreground">{h.use}</p>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  )
}

/* ---- Schematic thumbnails ---- */

function Bar({ className }: { className?: string }) {
  return <span className={cn('block h-1.5 rounded-full bg-muted-foreground/25', className)} />
}

function Frame({ bar, children, barClassName }: { bar?: ReactNode; children: ReactNode; barClassName?: string }) {
  return (
    <div aria-hidden className="flex h-32 flex-col overflow-hidden rounded-lg border bg-background">
      <div className={cn('flex h-5 shrink-0 items-center gap-1.5 border-b px-2', barClassName)}>
        <span className="size-2 rounded-sm border border-muted-foreground/40" />
        {bar ?? <Bar className="w-10" />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">{children}</div>
    </div>
  )
}

function Cards({ n = 3 }: { n?: number }) {
  return (
    <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="rounded-sm border bg-card" />
      ))}
    </div>
  )
}

function HeaderThumb({ kind }: { kind: Thumb }) {
  switch (kind) {
    case 'default':
      return (
        <Frame>
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <Bar className="h-2.5 w-16 bg-foreground/60" />
              <Bar className="w-24" />
            </div>
            <span className="h-3 w-8 rounded-sm bg-primary" />
          </div>
          <div className="flex gap-1">
            <span className="h-2.5 w-7 rounded-sm bg-primary-soft" />
            <Bar className="mt-0.5 w-6" />
            <Bar className="mt-0.5 w-6" />
          </div>
          <Cards />
        </Frame>
      )
    case 'command':
      return (
        <Frame
          bar={
            <>
              <Bar className="h-2 w-8 bg-foreground/60" />
              <span className="h-2.5 w-6 rounded-sm bg-primary-soft" />
              <Bar className="w-5" />
              <Bar className="w-5" />
              <span className="flex-1" />
              <span className="h-2.5 w-6 rounded-sm bg-primary" />
            </>
          }
        >
          <Cards n={4} />
          <Cards n={2} />
        </Frame>
      )
    case 'summary':
      return (
        <Frame>
          <div className="flex gap-2 border-b pb-2">
            <div className="flex w-1/4 flex-col gap-1">
              <Bar className="h-2.5 w-full bg-foreground/60" />
              <Bar className="w-3/4" />
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-1 flex-col gap-1 border-l pl-1.5">
                <Bar className="w-3/4" />
                <Bar className="h-2.5 w-1/2 bg-foreground/50" />
                <span className="h-0.5 w-full rounded-full bg-primary/50" />
              </div>
            ))}
          </div>
          <Cards n={2} />
        </Frame>
      )
    case 'banner':
      return (
        <Frame>
          <div className="flex flex-1 gap-2 rounded-md border border-primary/15 bg-primary-soft p-2">
            <div className="flex flex-1 flex-col gap-1">
              <Bar className="w-10 bg-primary/40" />
              <Bar className="h-3 w-24 bg-foreground/60" />
              <span className="mt-1 h-3.5 w-full rounded-sm border bg-card" />
            </div>
            <span className="w-1/4 rounded-sm border bg-card" />
          </div>
          <Cards />
        </Frame>
      )
    case 'entity':
      return (
        <div aria-hidden className="flex h-32 flex-col overflow-hidden rounded-lg border bg-background">
          <div className="flex h-5 shrink-0 items-center gap-1.5 border-b px-2">
            <span className="size-2 rounded-sm border border-muted-foreground/40" />
            <Bar className="w-14" />
          </div>
          <div className="flex flex-col gap-1.5 border-b bg-card px-2.5 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="size-5 rounded-md bg-primary-soft" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Bar className="h-2.5 w-16 bg-foreground/60" />
                  <span className="h-2 w-5 rounded-full bg-success-soft" />
                </div>
                <Bar className="w-24" />
              </div>
              <span className="h-3 w-7 rounded-sm bg-primary" />
            </div>
            <div className="flex gap-2.5">
              <span className="h-2.5 w-6 border-b-2 border-primary" />
              <Bar className="w-5" />
              <Bar className="w-5" />
            </div>
          </div>
          <div className="flex flex-1 p-2.5">
            <Cards />
          </div>
        </div>
      )
    case 'list':
      return (
        <Frame>
          <div className="flex items-center gap-1">
            <Bar className="h-2 w-10 bg-foreground/60" />
            <span className="h-2 w-3 rounded-full bg-muted" />
            <span className="flex-1" />
            <span className="h-3 w-8 rounded-sm bg-primary" />
          </div>
          <div className="flex items-center gap-1 rounded-sm border bg-card p-1">
            <span className="h-2.5 w-10 rounded-sm border" />
            <span className="h-2.5 w-7 rounded-sm bg-primary-soft" />
            <span className="h-2.5 w-7 rounded-sm bg-primary-soft" />
          </div>
          <div className="flex flex-1 flex-col divide-y rounded-sm border bg-card">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-1 items-center gap-2 px-1.5">
                <span className="size-1.5 rounded-xs border border-muted-foreground/40" />
                <Bar className="w-14" />
                <span className="h-1.5 w-4 rounded-full bg-success-soft" />
              </div>
            ))}
          </div>
        </Frame>
      )
    case 'split':
      return (
        <Frame>
          <div className="flex flex-1 gap-2.5">
            <div className="flex w-1/3 flex-col gap-1">
              <Bar className="h-2.5 w-full bg-foreground/60" />
              <Bar className="w-full" />
              <Bar className="w-2/3" />
              <span className="mt-1 h-2.5 w-full rounded-sm border bg-card" />
              <Bar className="ml-1 w-1/2" />
              <Bar className="ml-1 w-2/3" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="flex-1 rounded-sm border bg-card" />
              <span className="flex-1 rounded-sm border bg-card" />
            </div>
          </div>
        </Frame>
      )
    case 'collapsing':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Frame>
            <Bar className="w-8 bg-primary/40" />
            <Bar className="h-3 w-full bg-foreground/60" />
            <Bar className="w-3/4" />
            <span className="mt-1 flex-1 rounded-sm border bg-card" />
          </Frame>
          <Frame
            barClassName="shadow-elevation-1"
            bar={
              <>
                <Bar className="h-2 w-12 bg-foreground/60" />
                <span className="flex-1" />
                <Bar className="w-4" />
              </>
            }
          >
            <span className="flex-1 rounded-sm border bg-card" />
            <span className="flex-1 rounded-sm border bg-card" />
          </Frame>
        </div>
      )
    case 'task':
      return (
        <Frame
          barClassName="bg-card"
          bar={
            <>
              <Bar className="w-4" />
              <span className="flex-1" />
              <span className="size-2 rounded-full bg-primary" />
              <span className="h-px w-2 bg-border" />
              <span className="size-2 rounded-full border border-primary bg-primary-soft" />
              <span className="h-px w-2 bg-border" />
              <span className="size-2 rounded-full bg-muted" />
              <span className="flex-1" />
              <span className="h-2.5 w-6 rounded-sm bg-primary" />
            </>
          }
        >
          <div className="mx-auto flex w-1/2 flex-1 flex-col gap-1.5">
            <Bar className="h-2.5 w-2/3 bg-foreground/60" />
            <span className="flex-1 rounded-sm border bg-card" />
          </div>
        </Frame>
      )
  }
}
