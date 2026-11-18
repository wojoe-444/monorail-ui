import { CircleCheck, Clock, FileText, GitCommitHorizontal, MessageSquare } from 'lucide-react'

import { StatTile } from '@/components/charts/StatTile'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'

/*
 * Sample content for the PageTabs and PageSteps example pages. Replace or
 * delete along with those pages.
 */

const ACTIVITY = [
  { icon: GitCommitHorizontal, text: 'Maya pushed 3 commits to the landing page', when: '12m ago' },
  { icon: MessageSquare, text: 'Jon commented on "Pricing table copy"', when: '1h ago' },
  { icon: CircleCheck, text: 'Priya closed "Hero image is blurry on retina"', when: '3h ago' },
  { icon: Clock, text: 'Release 0.4 moved to Friday', when: 'Yesterday' },
  { icon: GitCommitHorizontal, text: 'Sam pushed 1 commit to the checkout flow', when: 'Yesterday' },
]

const MEMBERS = [
  { name: 'Maya Chen', email: 'maya@example.com', role: 'Owner' },
  { name: 'Jon Reyes', email: 'jon@example.com', role: 'Editor' },
  { name: 'Priya Nair', email: 'priya@example.com', role: 'Editor' },
  { name: 'Sam Okafor', email: 'sam@example.com', role: 'Viewer' },
  { name: 'Lee Park', email: 'lee@example.com', role: 'Viewer' },
]

const FILES = [
  { name: 'brief-v3.pdf', size: '1.2 MB', when: 'Nov 12' },
  { name: 'wireframes.fig', size: '8.4 MB', when: 'Nov 10' },
  { name: 'pricing-copy.md', size: '6 KB', when: 'Nov 9' },
  { name: 'hero@2x.png', size: '2.1 MB', when: 'Nov 8' },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
}

export function OverviewPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Open tasks" value="23" delta={-0.12} upIsGood={false} deltaLabel="vs last week" />
        <StatTile label="Done this week" value="41" delta={0.18} deltaLabel="vs last week" />
        <StatTile label="Days to release" value="4" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Milestone: Public beta</CardTitle>
          <CardDescription>Landing page, pricing and checkout ready for outside users.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>64% complete</span>
            <span className="tabular-nums">41 / 64 tasks</span>
          </div>
          <Progress value={64} />
        </CardContent>
      </Card>
    </div>
  )
}

export function ActivityPanel() {
  return (
    <Card>
      <CardContent>
        <ul className="divide-y">
          {ACTIVITY.map((a) => (
            <li key={a.text} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <a.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1 truncate text-sm">{a.text}</div>
              <div className="shrink-0 text-xs text-muted-foreground">{a.when}</div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function MembersPanel() {
  return (
    <Card>
      <CardContent>
        <ul className="divide-y">
          {MEMBERS.map((m) => (
            <li key={m.email} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Avatar>
                <AvatarFallback>{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
              </div>
              <Badge variant={m.role === 'Owner' ? 'primary' : 'secondary'}>{m.role}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function FilesPanel() {
  return (
    <Card>
      <CardContent>
        <ul className="divide-y">
          {FILES.map((f) => (
            <li key={f.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 truncate font-mono text-sm">{f.name}</div>
              <div className="shrink-0 text-xs text-muted-foreground tabular-nums">{f.size}</div>
              <div className="hidden w-14 shrink-0 text-right text-xs text-muted-foreground sm:block">{f.when}</div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function SettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project settings</CardTitle>
        <CardDescription>Name, visibility and notifications.</CardDescription>
      </CardHeader>
      <CardContent className="flex max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="project-name">Project name</Label>
          <Input id="project-name" defaultValue="Atlas redesign" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="project-public">Visible to the whole workspace</Label>
          <Switch id="project-public" defaultChecked />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="project-digest">Weekly email digest</Label>
          <Switch id="project-digest" />
        </div>
      </CardContent>
    </Card>
  )
}

export const PANELS: Record<string, () => React.JSX.Element> = {
  overview: OverviewPanel,
  activity: ActivityPanel,
  members: MembersPanel,
  files: FilesPanel,
  settings: SettingsPanel,
}
