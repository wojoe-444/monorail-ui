import { useMemo, useState } from 'react'
import { Archive, ArrowDownUp, Download, FolderKanban, Plus, Trash2, UserRound } from 'lucide-react'

import { AddFilterButton, FilterChip, ListHeader, ListToolbar } from '@/components/layout/ListHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { SearchField } from '@/components/ui/search-field'
import { Segmented } from '@/components/ui/segmented'

/*
 * Example: header style E. ListHeader + ListToolbar: search, removable
 * filters, sort and view; selecting rows turns the toolbar into bulk actions.
 */

type Status = 'Active' | 'At risk' | 'Blocked' | 'Done'

interface Project {
  id: number
  name: string
  status: Status
  owner: string
  updated: number // hours ago
  progress: number
}

const PROJECTS: Project[] = [
  { id: 1, name: 'Atlas redesign', status: 'Active', owner: 'Maya Chen', updated: 2, progress: 75 },
  { id: 2, name: 'Billing migration', status: 'At risk', owner: 'Jon Reyes', updated: 20, progress: 40 },
  { id: 3, name: 'Onboarding v3', status: 'Active', owner: 'Priya Nair', updated: 70, progress: 90 },
  { id: 4, name: 'Mobile offline mode', status: 'Blocked', owner: 'Maya Chen', updated: 160, progress: 15 },
  { id: 5, name: 'Search relevance', status: 'Active', owner: 'Sam Okafor', updated: 5, progress: 55 },
  { id: 6, name: 'Pricing page copy', status: 'Done', owner: 'Lee Park', updated: 300, progress: 100 },
  { id: 7, name: 'Audit log export', status: 'Active', owner: 'Jon Reyes', updated: 30, progress: 30 },
  { id: 8, name: 'Status page', status: 'At risk', owner: 'Priya Nair', updated: 48, progress: 62 },
]

const STATUSES: Status[] = ['Active', 'At risk', 'Blocked', 'Done']
const OWNERS = [...new Set(PROJECTS.map((p) => p.owner))]

const STATUS_BADGE = {
  Active: 'success',
  'At risk': 'warning',
  Blocked: 'destructive',
  Done: 'secondary',
} as const

const SORTS = { updated: 'Last updated', name: 'Name', progress: 'Progress' } as const
type Sort = keyof typeof SORTS

function ago(hours: number) {
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function ListHeaderExample() {
  const [rows, setRows] = useState(PROJECTS)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status | null>('Active')
  const [owner, setOwner] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('updated')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!status || p.status === status) && (!owner || p.owner === owner))
      .sort((a, b) =>
        sort === 'name' ? a.name.localeCompare(b.name) : sort === 'progress' ? b.progress - a.progress : a.updated - b.updated,
      )
  }, [rows, query, status, owner, sort])

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  const allSelected = visible.length > 0 && visible.every((p) => selected.has(p.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visible.map((p) => p.id)))
  const removeSelected = () => {
    setRows(rows.filter((p) => !selected.has(p.id)))
    setSelected(new Set())
  }

  return (
    <div className="flex flex-col gap-4">
      <ListHeader
        title="Projects"
        count={rows.length}
        actions={
          <>
            <Button variant="ghost">
              <Download />
              Export
            </Button>
            <Button>
              <Plus />
              New project
            </Button>
          </>
        }
      >
        <ListToolbar
          selectedCount={selected.size}
          onClearSelection={() => setSelected(new Set())}
          selectionActions={
            <>
              <Button variant="ghost" size="sm" onClick={removeSelected}>
                <Archive />
                Archive
              </Button>
              <Button variant="ghost" size="sm">
                <UserRound />
                Reassign
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={removeSelected}>
                <Trash2 />
                Delete
              </Button>
            </>
          }
        >
          <SearchField
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            aria-label="Filter projects by name"
            className="w-full sm:w-64"
          />
          {status && <FilterChip label="Status" value={status} onRemove={() => setStatus(null)} />}
          {owner && <FilterChip label="Owner" value={owner} onRemove={() => setOwner(null)} />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AddFilterButton />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {STATUSES.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setStatus(s)}>
                  {s}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Owner</DropdownMenuLabel>
              {OWNERS.map((o) => (
                <DropdownMenuItem key={o} onSelect={() => setOwner(o)}>
                  {o}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <ArrowDownUp />
                {SORTS[sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(SORTS) as Sort[]).map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setSort(s)}>
                  {SORTS[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List' },
              { value: 'grid', label: 'Grid' },
            ]}
            aria-label="View"
            className="h-8 [&>button]:h-6"
          />
        </ListToolbar>
      </ListHeader>

      {visible.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No projects match these filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery('')
              setStatus(null)
              setOwner(null)
            }}
          >
            Clear filters
          </Button>
        </Card>
      ) : view === 'list' ? (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="w-10 py-2.5 pl-4 font-medium">
                    <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} className="accent-primary" />
                  </th>
                  <th className="py-2.5 font-medium">Name</th>
                  <th className="py-2.5 font-medium">Status</th>
                  <th className="py-2.5 font-medium">Owner</th>
                  <th className="py-2.5 font-medium">Updated</th>
                  <th className="py-2.5 pr-4 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((p) => (
                  <tr key={p.id} className={selected.has(p.id) ? 'bg-primary-soft/60' : 'hover:bg-accent/50'}>
                    <td className="py-3 pl-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="accent-primary"
                      />
                    </td>
                    <td className="py-3 font-medium">{p.name}</td>
                    <td className="py-3">
                      <Badge variant={STATUS_BADGE[p.status]}>{p.status}</Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{p.owner}</td>
                    <td className="py-3 text-muted-foreground">{ago(p.updated)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="w-20" />
                        <span className="text-xs text-muted-foreground tabular-nums">{p.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((p) => (
            <Card key={p.id} className={selected.has(p.id) ? 'gap-4 py-4 ring-2 ring-primary' : 'gap-4 py-4'}>
              <div className="flex items-start justify-between gap-2 px-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <FolderKanban className="size-4" />
                </div>
                <input
                  type="checkbox"
                  aria-label={`Select ${p.name}`}
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="accent-primary"
                />
              </div>
              <div className="flex flex-col gap-1 px-4">
                <span className="truncate font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {p.owner} · {ago(p.updated)}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4">
                <Badge variant={STATUS_BADGE[p.status]}>{p.status}</Badge>
                <Progress value={p.progress} className="flex-1" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
