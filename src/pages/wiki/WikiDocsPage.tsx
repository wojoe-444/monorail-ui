import { useState } from 'react'
import { ChevronRight, Pencil, Search } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileTree, type FileTreeNode } from '@/components/ui/file-tree'
import { Input } from '@/components/ui/input'
import { Callout, FactList, ProseHeading, TableOfContents, type TocItem } from '@/features/wiki/components'

/*
 * Layout E · Three-pane docs (layout: 'full'). A page tree on the left, the
 * document in the middle, its outline and metadata on the right; each pane
 * scrolls on its own. Best for runbooks and procedures that live in a deep
 * hierarchy, where knowing "where am I" matters.
 */

const folder = (label: string, pages: string[]): FileTreeNode => ({
  id: label,
  label,
  children: pages.map((p) => ({ id: p, label: p })),
})

const TREE: FileTreeNode[] = [
  folder('Getting started', ['How this wiki works', 'Style guide', 'Who owns what']),
  folder('Service changes', ['Planned reroutes', 'Holiday schedules', 'Bus shuttles']),
  folder('Incidents', ['Slow zone reporting', 'Power outages', 'Station evacuations', 'Weather plans']),
  folder('Data', ['Ridership datasets', 'GTFS publishing', 'Train tracker feed']),
  folder('Fleet & yards', ['Car series', 'Yard assignments']),
]

const CURRENT = 'Slow zone reporting'

const OUTLINE: TocItem[] = [
  { id: 'purpose', label: 'Purpose' },
  { id: 'when', label: 'When to report' },
  { id: 'steps', label: 'Steps' },
  { id: 'publish', label: 'Publishing the map' },
  { id: 'clear', label: 'Clearing a zone' },
  { id: 'contacts', label: 'Contacts' },
]

const STEPS = [
  ['Record the zone', 'Enter the line, track, start and end stationing, and the speed limit in the slow zone log.'],
  ['Notify control', 'Call Rail Control on the dispatch line. Give the zone id the log assigned.'],
  ['Post the bulletin', 'Track & Structure posts a train-crew bulletin before the next shift change.'],
  ['Review weekly', 'Every Monday, owners confirm each open zone is still needed or schedule the repair.'],
]

export function WikiDocsPage() {
  const [filter, setFilter] = useState('')

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Filter pages"
              placeholder="Filter pages"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
        </div>
        <FileTree nodes={TREE} selected={CURRENT} filter={filter} aria-label="Page tree" className="flex-1 overflow-y-auto p-2" />
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        <article className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8 text-sm leading-relaxed lg:px-10">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Layout E · Three-pane docs</span>
            <ChevronRight className="size-3" />
            <span>Incidents</span>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{CURRENT}</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-2xl font-semibold tracking-tight" role="heading" aria-level={1}>
                {CURRENT}
              </div>
              <p className="mt-2 text-muted-foreground">How to log, publish and clear a temporary speed restriction.</p>
            </div>
            <Button variant="outline" size="sm">
              <Pencil />
              Edit
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="warning">Needs review</Badge>
            <Badge variant="secondary">Runbook</Badge>
          </div>

          <ProseHeading id="purpose">Purpose</ProseHeading>
          <p>
            A slow zone is a stretch of track where trains must run below the normal speed limit, usually because of track condition or work
            in progress. Every slow zone must be logged so crews, dispatchers and riders see the same information.
          </p>

          <ProseHeading id="when">When to report</ProseHeading>
          <ul className="ml-5 list-disc space-y-1">
            <li>Any new speed restriction expected to last longer than one shift.</li>
            <li>A change to the limit or the extent of an existing zone.</li>
            <li>A zone that has been cleared (see Clearing a zone).</li>
          </ul>
          <Callout tone="warning" title="Process changed in November 2026">
            Bulletins now go through Track & Structure, not Rail Control. This page is waiting on owner review.
          </Callout>

          <ProseHeading id="steps">Steps</ProseHeading>
          <ol className="flex flex-col gap-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-medium">{title}</div>
                  <p className="text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <ProseHeading id="publish">Publishing the map</ProseHeading>
          <p>The public slow zone map refreshes from the log every hour. To force a refresh after a large change, run the publish job:</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs">
            <code>{'make publish-slow-zones ENV=prod\n# expect: "published 14 zones (3 changed)"'}</code>
          </pre>

          <ProseHeading id="clear">Clearing a zone</ProseHeading>
          <p>
            After the repair, the track inspector confirms the zone in the field. Close it in the log with the inspection reference; it
            drops off the map at the next refresh.
          </p>
          <Callout tone="tip" title="Tip">
            Close zones before the Monday review so the weekly report reflects the real count.
          </Callout>

          <ProseHeading id="contacts">Contacts</ProseHeading>
          <p>Track & Structure duty manager, Rail Control desk, and the slow zone map owner in Digital.</p>
        </article>
      </div>

      <aside className="hidden w-64 shrink-0 flex-col gap-8 overflow-y-auto border-l p-6 xl:flex">
        <TableOfContents items={OUTLINE} title="On this page" />
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Page info</div>
          <FactList
            className="[&>div]:grid-cols-[5rem_1fr]"
            rows={[
              ['Owner', 'Track & Structure'],
              ['Updated', 'Yesterday'],
              ['Reviewed', 'Mar 2026'],
              ['Views', '1,204 / 30d'],
            ]}
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contributors</div>
          <div className="flex -space-x-2">
            {['SP', 'MO', 'KL', 'DB'].map((i) => (
              <Avatar key={i} className="ring-2 ring-background">
                <AvatarFallback className="text-xs">{i}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
