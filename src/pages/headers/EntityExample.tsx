import { useState } from 'react'
import {
  Activity,
  CalendarDays,
  CircleCheck,
  Clock,
  Copy,
  Ellipsis,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Pencil,
  Settings2,
  Share2,
  Star,
  UserRound,
  Users,
} from 'lucide-react'

import { EntityHeader } from '@/components/layout/EntityHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PANELS } from '@/features/examples/SamplePanels'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { cn } from '@/lib/utils'

/*
 * Example: header style D. EntityHeader leads with the item's identity and
 * carries its sections as underline tabs on a full-width band.
 */

const TABS: PageTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: Activity, count: 12 },
  { id: 'members', label: 'Members', icon: Users, count: 5 },
  { id: 'files', label: 'Files', icon: FileText, count: 8 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

const PEOPLE = ['MC', 'JR', 'PN']

export function EntityExample() {
  const [tab] = usePageTab(TABS)
  const [starred, setStarred] = useState(false)
  const Panel = PANELS[tab]

  return (
    <div className="flex flex-col gap-6">
      <EntityHeader
        back={{ label: 'Page headers', path: '/headers' }}
        icon={FolderKanban}
        title="Atlas redesign"
        badges={
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={starred ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={starred}
              onClick={() => setStarred(!starred)}
            >
              <Star className={cn(starred && 'fill-warning text-warning')} />
            </Button>
            <Badge variant="success">
              <span className="size-1.5 rounded-full bg-success" />
              Active
            </Badge>
          </>
        }
        meta={[
          { icon: UserRound, label: 'Maya Chen' },
          { icon: Clock, label: 'Updated 2h ago' },
          { icon: CalendarDays, label: 'Due Dec 4' },
          { icon: CircleCheck, label: '41 of 64 tasks' },
        ]}
        actions={
          <>
            <div className="mr-1 hidden -space-x-1.5 sm:flex">
              {PEOPLE.map((p) => (
                <Avatar key={p} className="size-8 ring-2 ring-card">
                  <AvatarFallback className="text-xs">{p}</AvatarFallback>
                </Avatar>
              ))}
              <Avatar className="size-8 ring-2 ring-card">
                <AvatarFallback className="text-xs text-muted-foreground">+2</AvatarFallback>
              </Avatar>
            </div>
            <Button variant="outline">
              <Share2 />
              Share
            </Button>
            <Button>
              <Pencil />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Archive project</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tabs={TABS}
        tabsLabel="Project sections"
      />
      <Panel />
    </div>
  )
}
