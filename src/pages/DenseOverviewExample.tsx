import { useState } from 'react'
import { Activity, Archive, CircleDot, Cloud, Code, FolderGit2, GitCompare, LayoutDashboard, Plus, RefreshCw, TriangleAlert } from 'lucide-react'

import { DivergenceBar } from '@/components/charts/DivergenceBar'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTabs } from '@/components/layout/PageTabs'
import { StatusItem, StatusSpacer, StatusStrip } from '@/components/layout/StatusStrip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableCard } from '@/components/ui/table-card'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'

/*
 * Example: a dense overview page (the layout of MonoRail's GitHub+ home).
 * A status strip instead of KPI tiles, then data in TableCards: single-line
 * table rows, a count in each header, one search box that filters every
 * table, a two-sided bar for opposing counts, and a card that folds away.
 * Copy this shape when a page is mostly lists of things. All data is fictional.
 */

const TABS: PageTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'repos', label: 'Repositories', icon: FolderGit2, count: 6 },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'issues', label: 'Issues', icon: CircleDot, count: 7 },
  { id: 'backups', label: 'Backups', icon: Archive },
]

const BRANCHES = [
  { name: 'feat/offline-sync', repo: 'trailmix', ahead: 4, behind: 1, author: 'Robin Vale', updated: '2 hours ago' },
  { name: 'fix/rate-limit-headers', repo: 'lantern-api', ahead: 2, behind: 0, author: 'Sam Ortiz', updated: '5 hours ago' },
  { name: 'docs/quickstart-v2', repo: 'harbor-docs', ahead: 7, behind: 3, author: 'Jun Park', updated: 'yesterday' },
  { name: 'spike/canvas-renderer', repo: 'orbit-ui', ahead: 12, behind: 0, author: 'Robin Vale', updated: '2 days ago' },
  { name: 'chore/bump-vite', repo: 'pocket-garden', ahead: 1, behind: 6, author: 'Ari Kent', updated: '3 days ago' },
]

type Repo = { name: string; head: string; cloud: boolean; ahead?: number; behind?: number; changed?: number; backup: 'ok' | 'failed' | 'none'; backupAt?: string }
const REPOS: Repo[] = [
  { name: 'trailmix', head: 'feat/offline-sync', cloud: true, ahead: 2, changed: 3, backup: 'ok', backupAt: '2 hours ago' },
  { name: 'lantern-api', head: 'main', cloud: true, backup: 'failed' },
  { name: 'orbit-ui', head: 'spike/canvas-renderer', cloud: true, ahead: 7, backup: 'ok', backupAt: 'today' },
  { name: 'quill-notes', head: 'main', cloud: false, changed: 12, backup: 'none' },
  { name: 'pocket-garden', head: 'main', cloud: false, backup: 'ok', backupAt: '6 hours ago' },
  { name: 'harbor-docs', head: 'docs/quickstart-v2', cloud: true, behind: 4, backup: 'ok', backupAt: 'yesterday' },
]

const COMMITS = [
  { sha: 'a41c9e2', message: 'Cache tile lookups between pans', repo: 'trailmix', author: 'Robin Vale', when: '38 minutes ago' },
  { sha: '7be0d13', message: 'Return Retry-After on 429', repo: 'lantern-api', author: 'Sam Ortiz', when: '2 hours ago' },
  { sha: 'c09f5aa', message: 'Split seed packets into their own table', repo: 'pocket-garden', author: 'Jun Park', when: '4 hours ago' },
  { sha: '19ad7c0', message: 'Tighten heading spacing in guides', repo: 'harbor-docs', author: 'Jun Park', when: '6 hours ago' },
  { sha: 'e5521bd', message: 'Draw grid lines in one pass', repo: 'orbit-ui', author: 'Robin Vale', when: 'yesterday' },
]

/** ↑ not pushed, ↓ to pull, ● uncommitted, or "clean". */
function RepoState({ r }: { r: Repo }) {
  if (!r.ahead && !r.behind && !r.changed) return <span className="font-mono text-xs text-muted-foreground">clean</span>
  return (
    <span className="inline-flex gap-2 font-mono text-xs">
      {r.ahead ? <span className="text-success" title={`${r.ahead} commits not pushed`}>↑{r.ahead}</span> : null}
      {r.behind ? <span className="text-destructive" title={`${r.behind} commits to pull`}>↓{r.behind}</span> : null}
      {r.changed ? <span className="text-warning-soft-foreground" title={`${r.changed} files not committed`}>●{r.changed}</span> : null}
    </span>
  )
}

function Backup({ r }: { r: Repo }) {
  if (r.backup === 'none') return <span className="text-muted-foreground">—</span>
  if (r.backup === 'failed')
    return (
      <span className="inline-flex items-center gap-1.5 text-destructive">
        <span className="size-2 rounded-full bg-destructive" /> failed
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2 rounded-full bg-success" /> {r.backupAt}
    </span>
  )
}

export function DenseOverviewExample() {
  usePageTab(TABS)
  const [filter, setFilter] = useState('')
  const q = filter.trim().toLowerCase()
  const has = (...s: string[]) => !q || s.some((x) => x.toLowerCase().includes(q))
  const branches = BRANCHES.filter((b) => has(b.name, b.repo, b.author))
  const repos = REPOS.filter((r) => has(r.name, r.head))
  const commits = COMMITS.filter((c) => has(c.message, c.sha, c.repo, c.author))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Workspace"
        title="Repositories"
        description="Everything on this computer at a glance, as compact tables."
        actions={
          <>
            <Button variant="outline">
              <RefreshCw /> Refresh
            </Button>
            <Button>
              <Plus /> Open repository
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <PageTabs tabs={TABS} sticky={false} aria-label="Views" className="min-w-0" />
        <span className="flex-1" />
        <Input
          className="w-full sm:w-72"
          placeholder="Find a repository, branch or commit…"
          aria-label="Find a repository, branch or commit"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <StatusStrip aria-label="Summary">
        <StatusItem value={6} label="repositories" />
        <StatusItem value={7} label="open issues" />
        <StatusItem value={2} label="not pushed" title="Repositories with commits only on this computer" />
        <StatusItem value={2} label="with uncommitted changes" />
        <StatusSpacer />
        <StatusItem tone="destructive" icon={TriangleAlert} label={<><b>lantern-api</b> backup failed</>} action={<button type="button">Retry</button>} />
      </StatusStrip>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <TableCard title="Active branches" count={BRANCHES.length} description="behind | ahead of main" action={<Button variant="link" size="sm">All branches</Button>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Behind | ahead</TableHead>
                <TableHead numeric>Updated</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.length === 0 && <TableEmpty colSpan={5}>No branches match.</TableEmpty>}
              {branches.map((b) => (
                <TableRow key={b.repo + b.name}>
                  <TableCell fill className="font-mono text-xs font-semibold">
                    <span title={`${b.name} by ${b.author}`}>{b.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{b.repo}</TableCell>
                  <TableCell>
                    <DivergenceBar left={b.behind} right={b.ahead} of="main" />
                  </TableCell>
                  <TableCell numeric className="text-muted-foreground">{b.updated}</TableCell>
                  <TableCell numeric>
                    <Button variant="outline" size="sm">
                      <GitCompare /> Compare
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>

        <TableCard
          title="Repositories"
          count={REPOS.length}
          action={
            <Button variant="ghost" size="icon" aria-label="Open a repository">
              <Plus />
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>HEAD</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Backup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repos.length === 0 && <TableEmpty colSpan={4}>No repositories match.</TableEmpty>}
              {repos.map((r) => (
                <TableRow key={r.name} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {r.name}
                      {r.cloud && <Cloud className="size-3.5 text-muted-foreground" aria-label="Also on GitHub" />}
                      {r.name === 'quill-notes' && <Badge variant="secondary">local only</Badge>}
                    </span>
                  </TableCell>
                  <TableCell fill className="font-mono text-xs text-muted-foreground">
                    <span>{r.head}</span>
                  </TableCell>
                  <TableCell>
                    <RepoState r={r} />
                  </TableCell>
                  <TableCell>
                    <Backup r={r} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </div>

      <TableCard title="Recent commits" description="all repositories, every branch" collapsible="example.recentCommits">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commit</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Repository</TableHead>
              <TableHead>Author</TableHead>
              <TableHead numeric>When</TableHead>
              <TableHead aria-label="Browse" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {commits.length === 0 && <TableEmpty colSpan={6}>No commits match.</TableEmpty>}
            {commits.map((c) => (
              <TableRow key={c.sha}>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.sha}</TableCell>
                <TableCell fill className="font-medium">
                  <span title={c.message}>{c.message}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.repo}</TableCell>
                <TableCell className="text-muted-foreground">{c.author}</TableCell>
                <TableCell numeric className="text-muted-foreground">{c.when}</TableCell>
                <TableCell numeric>
                  <Button variant="ghost" size="icon" aria-label="Browse the code at this commit">
                    <Code />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  )
}
