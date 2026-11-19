import { CalendarDays, FolderKanban, Plus, Upload, UserPlus } from 'lucide-react'

import { PageBanner } from '@/components/layout/PageBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { SearchField } from '@/components/ui/search-field'
import { cn } from '@/lib/utils'

/*
 * Example: header style C. PageBanner gives the app's front door a greeting,
 * a big search and shortcuts, with a short "today" card beside it.
 */

const TODAY = [
  { title: 'Review "Q4 plan"', when: 'Due 5:00 PM', tone: 'bg-warning' },
  { title: 'Design sync', when: '2:30 PM · 30 min', tone: 'bg-info' },
  { title: 'Nightly backup failed', when: 'Archive · 4h ago', tone: 'bg-destructive' },
]

const RECENT = [
  { name: 'Atlas redesign', note: 'Updated 2h ago', progress: 75 },
  { name: 'Billing migration', note: 'Updated yesterday', progress: 40 },
  { name: 'Onboarding v3', note: 'Updated 3 days ago', progress: 90 },
]

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function BannerExample() {
  const now = new Date()

  return (
    <div className="flex flex-col gap-8">
      <PageBanner
        kicker={
          <>
            <CalendarDays />
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </>
        }
        title={`${greeting(now.getHours())}, Sam`}
        description="3 things need you today. Everything else is on track."
        aside={
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardDescription className="text-xs font-semibold tracking-wide uppercase">Today</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <ul className="divide-y">
                {TODAY.map((t) => (
                  <li key={t.title} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', t.tone)} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.when}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        }
      >
        <SearchField size="lg" shortcut="/" placeholder="Search projects, people and files…" aria-label="Search everything" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Plus />
            New project
          </Button>
          <Button variant="outline" size="sm">
            <Upload />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <UserPlus />
            Invite
          </Button>
        </div>
      </PageBanner>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Jump back in</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {RECENT.map((p) => (
            <Card key={p.name} className="gap-4">
              <CardHeader>
                <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <FolderKanban className="size-4" />
                </div>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.note}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Progress value={p.progress} />
                <span className="text-xs text-muted-foreground tabular-nums">{p.progress}%</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
