import { useMemo, useState } from 'react'
import { Accessibility, FilePlus2, Search } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { LineChip } from '@/features/wiki/components'
import { LINES, STATIONS, fmt, type LineId, type Station } from '@/features/wiki/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Layout F · Directory. An A–Z index of every page of one kind (stations),
 * with filters, a letter jump bar, and a list or card view. Best for
 * category pages where people know roughly what they want.
 */

type View = 'list' | 'cards'

const letterOf = (s: Station) => (/[a-z]/i.test(s.name[0]) ? s.name[0].toUpperCase() : '#')

export function WikiDirectoryPage() {
  const [query, setQuery] = useState('')
  const [line, setLine] = useState<LineId | 'all'>('all')
  const [accessibleOnly, setAccessibleOnly] = useState(false)
  const [view, setView] = useState<View>('list')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = STATIONS.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q) || s.area.toLowerCase().includes(q)) &&
        (line === 'all' || s.lines.includes(line)) &&
        (!accessibleOnly || s.accessible),
    ).sort((a, b) => a.name.localeCompare(b.name))
    const map = new Map<string, Station[]>()
    for (const s of rows) map.set(letterOf(s), [...(map.get(letterOf(s)) ?? []), s])
    return [...map.entries()].sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)))
  }, [query, line, accessibleOnly])

  const present = new Set(groups.map(([l]) => l))
  const total = groups.reduce((n, [, g]) => n + g.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Layout F · Directory"
        title="Stations"
        description="Every station page, A to Z. Filter by line or accessibility."
        actions={
          <Button>
            <FilePlus2 />
            New station page
          </Button>
        }
      />

      <Card className="gap-4 py-4">
        <CardContent className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_auto_auto] lg:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dir-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="dir-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Station or neighborhood" className="pl-9" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dir-line">Line</Label>
            <NativeSelect id="dir-line" value={line} onChange={(e) => setLine(e.target.value as LineId | 'all')}>
              <option value="all">All lines</option>
              {LINES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex h-9 items-center gap-2">
            <Switch id="dir-acc" checked={accessibleOnly} onCheckedChange={setAccessibleOnly} />
            <Label htmlFor="dir-acc">Accessible only</Label>
          </div>
          <Segmented
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List' },
              { value: 'cards', label: 'Cards' },
            ]}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-1" aria-label="Jump to letter">
        {['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l) => (
          <button
            key={l}
            type="button"
            disabled={!present.has(l)}
            onClick={() => document.getElementById(`letter-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="flex size-7 items-center justify-center rounded-md text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:text-muted-foreground/40"
          >
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{total} stations</span>
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No stations match those filters.</CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-8">
        {groups.map(([letter, stations]) => (
          <section key={letter} id={`letter-${letter}`} className="flex scroll-mt-24 flex-col gap-3">
            <h2 className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
              <span className="text-lg text-foreground">{letter}</span>
              <span className="h-px flex-1 bg-border" />
            </h2>
            {view === 'list' ? (
              <Card className="gap-0 py-0">
                <ul className="divide-y">
                  {stations.map((s) => (
                    <li key={s.id}>
                      <a href={href('/wiki/station')} className="flex flex-col gap-2 px-4 py-3 hover:bg-accent/50 sm:flex-row sm:items-center sm:gap-4">
                        <div className="min-w-0 sm:w-48">
                          <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {s.name}
                            {s.accessible && <Accessibility className="size-3.5 text-muted-foreground" aria-label="Accessible" />}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{s.area}</div>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                          {s.lines.map((l) => (
                            <LineChip key={l} id={l} short />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums sm:w-28 sm:text-right">
                          {fmt(s.weekday)} / weekday
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stations.map((s) => (
                  <a
                    key={s.id}
                    href={href('/wiki/station')}
                    className={cn(
                      'flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-elevation-2',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{s.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.area}</div>
                      </div>
                      {s.accessible && (
                        <Badge variant="success" aria-label="Accessible">
                          <Accessibility />
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.lines.map((l) => (
                        <LineChip key={l} id={l} short />
                      ))}
                    </div>
                    <div className="mt-auto flex justify-between text-xs text-muted-foreground">
                      <span>Since {s.opened}</span>
                      <span className="tabular-nums">{fmt(s.weekday)} / wkdy</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
