import { ArrowRight, CircleCheck, Clock, Plus } from 'lucide-react'

import { Sparkline } from '@/components/charts/Sparkline'
import { StatTile } from '@/components/charts/StatTile'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { navigate } from '@/lib/router'

/*
 * Example home page: a header with a primary action, a row of KPI tiles, and
 * two cards. It shows the standard page rhythm (gap-8 between blocks, a
 * responsive grid of cards) with sample data. Replace it with the app's own.
 */

const ACTIVITY = [
  { title: 'Quarterly report', status: 'done', when: '2h ago' },
  { title: 'Onboarding checklist', status: 'running', when: '5h ago' },
  { title: 'Data import', status: 'queued', when: 'Yesterday' },
] as const

const STATUS = {
  done: { label: 'Done', variant: 'success' },
  running: { label: 'Running', variant: 'info' },
  queued: { label: 'Queued', variant: 'secondary' },
} as const

export function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Overview"
        title="Welcome back"
        description="Sample content: replace this page with what the app should open on."
        actions={
          <Button type="button">
            <Plus />
            New item
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active projects" value="12" delta={0.2} deltaLabel="vs last week" trend={<Sparkline data={[4, 6, 5, 8, 9, 12]} />} />
        <StatTile label="Tasks done" value="248" delta={0.08} deltaLabel="vs last week" trend={<Sparkline data={[30, 28, 35, 40, 38, 44]} />} />
        <StatTile label="Open issues" value="17" delta={0.13} upIsGood={false} deltaLabel="vs last week" />
        <StatTile label="Avg. cycle time" value="2.4d" delta={-0.05} upIsGood={false} deltaLabel="vs last week" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>The latest work across projects.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                View all
                <ArrowRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {ACTIVITY.map((a) => (
                <li key={a.title} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {a.status === 'done' ? <CircleCheck className="size-4" /> : <Clock className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.when}</div>
                  </div>
                  <Badge variant={STATUS[a.status].variant}>{STATUS[a.status].label}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This week's goal</CardTitle>
            <CardDescription>62 of 100 tasks closed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress aria-label="Weekly goal" value={62} />
            <p className="text-sm text-muted-foreground">On track to finish by Friday at the current pace.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
