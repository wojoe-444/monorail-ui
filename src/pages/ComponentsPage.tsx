import { useState } from 'react'
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Legend } from '@/components/charts/Legend'
import { SERIES_COLORS } from '@/components/charts/palette'
import { Sparkline } from '@/components/charts/Sparkline'
import { StatTile } from '@/components/charts/StatTile'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileTree, type FileTreeNode } from '@/components/ui/file-tree'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Every component in the kit, live, on one page. Use it to check how a
 * component looks in each palette and mode, and copy usage from here.
 * Delete the page (and its entry in src/app/routes.tsx) when the app no longer needs it.
 */
export function ComponentsPage() {
  const [view, setView] = useState<'list' | 'board'>('list')
  const [level, setLevel] = useState(64)
  const [treeFilter, setTreeFilter] = useState('')
  const [treeSelected, setTreeSelected] = useState('style')

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Reference" title="Components" description="The UI kit, live. Switch palettes in Settings to see each one." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buttons and badges</CardTitle>
            <CardDescription>One primary action per view; the rest outline, ghost or soft.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Delete</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" variant="outline" aria-label="Edit">
                <Pencil />
              </Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form controls</CardTitle>
            <CardDescription>Label every control; put the label above the field.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" placeholder="Project name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-kind">Kind</Label>
              <NativeSelect id="c-kind" defaultValue="web">
                <option value="web">Web app</option>
                <option value="desktop">Desktop app</option>
                <option value="cli">Command line</option>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-notes">Notes</Label>
              <Textarea id="c-notes" placeholder="Add a note" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="c-notify" defaultChecked />
              <Label htmlFor="c-notify">Notifications</Label>
            </div>
            <Segmented
              aria-label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'List' },
                { value: 'board', label: 'Board' },
              ]}
            />
            <div className="grid gap-2">
              <Label>Level: {level}</Label>
              <Slider thumbLabels={['Level']} value={[level]} onValueChange={([v]) => setLevel(v)} />
              <Progress aria-label="Level" value={level} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overlays</CardTitle>
            <CardDescription>Dialog, menus, tooltip and hover card. Right-click the dashed box.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rename project</DialogTitle>
                    <DialogDescription>The new name shows everywhere the project appears.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Label htmlFor="c-rename">Name</Label>
                    <Input id="c-rename" defaultValue="Quarterly report" />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button>Save</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>
                    <Pencil />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive [&_svg]:text-destructive">
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost">Hover for tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>Last checked just now</TooltipContent>
              </Tooltip>

              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="link">@sam</Button>
                </HoverCardTrigger>
                <HoverCardContent className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">Sam Moss</div>
                    <div className="text-muted-foreground">Joined March 2026</div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <ContextMenu>
              <ContextMenuTrigger className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Right-click here
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>Open</ContextMenuItem>
                <ContextMenuItem>Rename</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data display</CardTitle>
            <CardDescription>KPI tiles, sparklines and the fixed chart series colors.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <StatTile
              label="Completed runs"
              value="128"
              delta={0.12}
              deltaLabel="vs last week"
              trend={<Sparkline data={[2, 4, 3, 7, 6, 9]} />}
            />
            <Separator />
            <Legend items={SERIES_COLORS.map((color, i) => ({ key: `s${i + 1}`, label: `Series ${i + 1}`, color }))} />
            <div className="flex items-center gap-3">
              {['AB', 'CD', 'EF'].map((initials) => (
                <Avatar key={initials}>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>File tree</CardTitle>
            <CardDescription>Folders and pages for a docs sidebar or file browser. Type to filter.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tree-filter">Filter</Label>
              <Input id="tree-filter" value={treeFilter} onChange={(e) => setTreeFilter(e.target.value)} placeholder="e.g. guide" />
            </div>
            <FileTree
              nodes={TREE_SAMPLE}
              selected={treeSelected}
              onSelect={(n) => setTreeSelected(n.id)}
              filter={treeFilter}
              aria-label="Sample file tree"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const TREE_SAMPLE: FileTreeNode[] = [
  {
    id: 'docs',
    label: 'Docs',
    badge: '4',
    children: [
      { id: 'intro', label: 'Introduction' },
      {
        id: 'guides',
        label: 'Guides',
        children: [
          { id: 'setup', label: 'Setup guide' },
          { id: 'style', label: 'Style guide' },
        ],
      },
      { id: 'faq', label: 'FAQ' },
    ],
  },
  { id: 'notes', label: 'Meeting notes', children: [{ id: 'nov', label: 'November planning' }] },
  { id: 'readme', label: 'README' },
]
