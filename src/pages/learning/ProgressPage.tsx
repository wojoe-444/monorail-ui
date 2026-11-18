import { useState } from 'react'
import { Award, CalendarClock, Check, Download, Eye, EyeOff, History, LayoutDashboard, Lock, ShieldCheck } from 'lucide-react'

import { SummaryHeader } from '@/components/layout/SummaryHeader'
import { PageTabs } from '@/components/layout/PageTabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableCard } from '@/components/ui/table-card'
import { FormatBadge, Cover } from '@/features/learning/components'
import { ITEM_BY_ID, LEARNER_STATS, TOPIC_BY_ID, formatMinutes, type Format, type TopicId } from '@/features/learning/data'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/* ---------- Page-specific sample record ---------- */

/** Minutes learned per month, Dec 2025 to Nov 2026 (November is so far). */
const MONTHS = [
  { m: 'Dec', minutes: 140 },
  { m: 'Jan', minutes: 410 },
  { m: 'Feb', minutes: 165 },
  { m: 'Mar', minutes: 210 },
  { m: 'Apr', minutes: 260 },
  { m: 'May', minutes: 180 },
  { m: 'Jun', minutes: 120 },
  { m: 'Jul', minutes: 75 },
  { m: 'Aug', minutes: 230 },
  { m: 'Sep', minutes: 340 },
  { m: 'Oct', minutes: 395 },
  { m: 'Nov', minutes: LEARNER_STATS.minutesThisMonth, partial: true },
]

const YEAR_MINUTES = MONTHS.slice(1).reduce((s, m) => s + m.minutes, 0)

/** Finished in 2026, by topic. Adds up to LEARNER_STATS.finishedThisYear. */
const SKILLS: { topic: TopicId; finished: number; minutes: number; note: string }[] = [
  { topic: 'engineering', finished: 11, minutes: 1407, note: 'Reliability, releases, Git' },
  { topic: 'data', finished: 5, minutes: 520, note: 'Statistics, SQL, charts' },
  { topic: 'design', finished: 4, minutes: 310, note: 'Design tokens, critique' },
  { topic: 'writing', finished: 3, minutes: 190, note: 'Proposals, docs' },
  { topic: 'security', finished: 3, minutes: 130, note: 'Phishing, secrets' },
  { topic: 'start', finished: 1, minutes: 140, note: 'Onboarding' },
]

type Row = {
  date: string
  title: string
  format: Format
  topic: TopicId
  minutes: number
  result?: string
  required?: boolean
  cert?: boolean
  path?: string
}

const HISTORY: Row[] = [
  { date: 'Nov 16', title: 'How charts lie (and how ours won’t)', format: 'article', topic: 'data', minutes: 12 },
  {
    date: 'Nov 13',
    title: 'Git, the parts you’ll actually use',
    format: 'cheatsheet',
    topic: 'engineering',
    minutes: 3,
    path: '/learn/cheat-sheet',
  },
  { date: 'Nov 09', title: 'GROUP BY warm-up', format: 'quiz', topic: 'data', minutes: 8, result: '7 / 8' },
  {
    date: 'Nov 04',
    title: 'Data literacy, module 1: Asking the question',
    format: 'path',
    topic: 'data',
    minutes: 75,
    path: '/learn/course',
  },
  { date: 'Oct 30', title: 'Spot the phish', format: 'quiz', topic: 'security', minutes: 6, result: '10 / 10', required: true, cert: true },
  {
    date: 'Oct 28',
    title: 'The case for boring technology, revisited',
    format: 'article',
    topic: 'engineering',
    minutes: 14,
    path: '/learn/article',
  },
  {
    date: 'Oct 21',
    title: 'Which data store should I use?',
    format: 'guide',
    topic: 'engineering',
    minutes: 4,
    path: '/learn/decision-guide',
  },
  { date: 'Oct 12', title: 'Tokens all the way down', format: 'video', topic: 'design', minutes: 41, cert: true },
  {
    date: 'Oct 02',
    title: 'Rotate a leaked API key in under ten minutes',
    format: 'howto',
    topic: 'security',
    minutes: 9,
    path: '/learn/how-to',
  },
  { date: 'Sep 24', title: 'Night Shift, ep. 12: Pager fatigue', format: 'podcast', topic: 'engineering', minutes: 41 },
  { date: 'Sep 18', title: 'Write a proposal that gets a decision', format: 'article', topic: 'writing', minutes: 9 },
  { date: 'Sep 11', title: 'Running a design critique people look forward to', format: 'howto', topic: 'design', minutes: 11 },
  { date: 'Sep 03', title: 'Postgres indexes, explained with a phone book', format: 'video', topic: 'engineering', minutes: 48 },
  { date: 'Aug 27', title: 'Reading an experiment readout', format: 'article', topic: 'data', minutes: 16 },
  { date: 'Aug 19', title: 'Incident review writing workshop', format: 'live', topic: 'writing', minutes: 60 },
  { date: 'Aug 06', title: 'Feature flags without regret', format: 'article', topic: 'engineering', minutes: 11 },
  { date: 'Jul 14', title: 'Tracing a slow request end to end', format: 'lab', topic: 'engineering', minutes: 35 },
  { date: 'Jun 22', title: 'Accessibility checks before you merge', format: 'cheatsheet', topic: 'design', minutes: 4 },
  { date: 'Jun 03', title: 'Code review that teaches', format: 'video', topic: 'engineering', minutes: 52 },
  { date: 'May 12', title: 'Means, medians and Monday', format: 'article', topic: 'data', minutes: 10 },
  { date: 'Apr 28', title: 'Secure coding basics', format: 'course', topic: 'security', minutes: 95, result: 'Passed', required: true },
  { date: 'Apr 09', title: 'Our design system in 20 minutes', format: 'video', topic: 'design', minutes: 20 },
  { date: 'Mar 17', title: 'Writing a good pull request description', format: 'howto', topic: 'writing', minutes: 7 },
  { date: 'Mar 02', title: 'Kestrel’s payments architecture, drawn', format: 'video', topic: 'engineering', minutes: 64 },
  { date: 'Feb 10', title: 'Deploys at Kestrel, start to finish', format: 'lab', topic: 'engineering', minutes: 40 },
  { date: 'Jan 29', title: 'Debugging with logs, not guesses', format: 'video', topic: 'engineering', minutes: 38 },
  { date: 'Jan 23', title: 'Your first week at Kestrel', format: 'path', topic: 'start', minutes: 140, required: true, cert: true },
]

const CERTS = [
  {
    id: 'phishing',
    title: 'Security awareness 2026',
    from: 'Spot the phish',
    issued: 'Oct 30, 2026',
    expires: 'Oct 30, 2027',
    code: 'FS-26-SEC-0412',
    series: 2,
    required: true,
  },
  {
    id: 'tokens-series',
    title: 'Design tokens practitioner',
    from: 'Tokens all the way down',
    issued: 'Oct 12, 2026',
    code: 'FS-26-DES-0088',
    series: 3,
  },
  {
    id: 'first-week',
    title: 'Kestrel onboarding',
    from: 'Your first week at Kestrel',
    issued: 'Jan 23, 2026',
    code: 'FS-26-ONB-0031',
    series: 1,
    required: true,
  },
]

const TABS: PageTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'history', label: 'History', icon: History, count: HISTORY.length },
  { id: 'certificates', label: 'Certificates', icon: Award, count: CERTS.length },
]

/* ---------- Page ---------- */

export function ProgressPage() {
  const [tab] = usePageTab(TABS)

  return (
    <div className="flex flex-col gap-6">
      <SummaryHeader
        title="My learning"
        description="Your record at Field School. You decide what anyone else sees."
        actions={
          <Button variant="outline" size="sm">
            <Download />
            Export
          </Button>
        }
        metrics={[
          { label: 'Finished in 2026', value: LEARNER_STATS.finishedThisYear, delta: '19 in all of 2025' },
          {
            label: 'Time this month',
            value: formatMinutes(LEARNER_STATS.minutesThisMonth),
            delta: `${formatMinutes(YEAR_MINUTES)} this year`,
            trend: MONTHS.map((m) => m.minutes),
          },
          { label: 'Required', value: '1', unit: ' due', delta: 'On-call path by Dec 01', tone: 'warning' },
          { label: 'Certificates', value: CERTS.length, delta: 'None expiring soon' },
        ]}
      />
      <PageTabs tabs={TABS} aria-label="My learning sections" />
      {tab === 'overview' && <Overview />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'certificates' && <Certificates />}
    </div>
  )
}

function Overview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <MinutesChart />
        <Required />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Skills />
        <Privacy />
      </div>
    </div>
  )
}

function MinutesChart() {
  const [hover, setHover] = useState<number | null>(null)
  const max = 420
  const shown = hover === null ? null : MONTHS[hover]

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle>Time spent learning</CardTitle>
        <CardDescription>
          {shown
            ? `${shown.m}${shown.partial ? ' (so far)' : ''}: ${formatMinutes(shown.minutes)}`
            : 'Minutes per month, last 12 months. Point at a month for its total.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Recessive gridlines at 2 h, 4 h, 6 h */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40" aria-hidden>
            {[360, 240, 120].map((g) => (
              <div key={g} className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${(g / max) * 100}%` }}>
                <span className="absolute -top-2 right-0 bg-card pl-1 text-[10px] text-muted-foreground tabular-nums">{g / 60} h</span>
              </div>
            ))}
          </div>
          <ul className="relative grid h-40 grid-cols-12 items-end gap-0.5 pr-7" aria-label="Minutes learned per month">
            {MONTHS.map((m, i) => (
              <li
                key={m.m}
                className="flex h-full cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                aria-label={`${m.m}: ${m.minutes} minutes${m.partial ? ' so far' : ''}`}
              >
                <span
                  className={cn('w-1/2 max-w-5 rounded-t-[4px] transition-opacity', hover !== null && hover !== i && 'opacity-40')}
                  style={{
                    height: `${(m.minutes / max) * 100}%`,
                    background: m.partial
                      ? 'repeating-linear-gradient(135deg, var(--series-1) 0 3px, transparent 3px 6px)'
                      : 'var(--series-1)',
                    boxShadow: m.partial ? 'inset 0 0 0 1.5px var(--series-1)' : undefined,
                  }}
                />
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-12 gap-0.5 border-t pt-1.5 pr-7" aria-hidden>
            {MONTHS.map((m, i) => (
              <span key={m.m} className={cn('text-center text-[11px] text-muted-foreground', i % 2 === 1 && 'max-sm:invisible')}>
                {m.m}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          January was onboarding; July was a quiet month on purpose. November is striped because it isn’t over.
        </p>
      </CardContent>
    </Card>
  )
}

function Required() {
  const oncall = ITEM_BY_ID['oncall-path']
  const rows = [
    { title: oncall.title, by: 'Kwame Mensah', status: 'due' as const, when: 'Due Dec 01', detail: '0 of 7 parts · 5 h' },
    { title: 'Spot the phish', by: 'Security team', status: 'done' as const, when: 'Oct 30', detail: 'Yearly · next due Oct 2027' },
    { title: 'Secure coding basics', by: 'Security team', status: 'done' as const, when: 'Apr 28', detail: 'Passed first try' },
    { title: 'Your first week at Kestrel', by: 'People team', status: 'done' as const, when: 'Jan 23', detail: '8 of 8 parts' },
  ]
  return (
    <TableCard title="Required" count={rows.length} description="Assigned to you, with status">
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.title} className="flex items-center gap-3 px-4 py-3">
            {r.status === 'done' ? (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
                <Check className="size-3.5" />
              </span>
            ) : (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-soft-foreground">
                <CalendarClock className="size-3.5" />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{r.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {r.by} · {r.detail}
              </span>
            </div>
            {r.status === 'due' ? (
              <Badge variant="warning">{r.when}</Badge>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">Done {r.when}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="border-t px-4 py-3">
        <Button asChild variant="soft" size="sm">
          <a href={href('/learn/course')}>Start the on-call path</a>
        </Button>
      </div>
    </TableCard>
  )
}

function Skills() {
  const max = Math.max(...SKILLS.map((s) => s.minutes))
  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle>Where your time went</CardTitle>
        <CardDescription>Hours by topic in 2026, in-progress time included. Not a score; just a map.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3.5">
          {SKILLS.map((s) => (
            <li key={s.topic} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_12rem]">
              <a href={href('/learn/topic')} className="truncate text-sm font-medium hover:underline">
                {TOPIC_BY_ID[s.topic].name}
              </a>
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 rounded-full" style={{ width: `${(s.minutes / max) * 100}%`, background: 'var(--series-1)' }} />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatMinutes(s.minutes)}</span>
              </div>
              <span className="col-start-2 truncate text-xs text-muted-foreground sm:col-start-auto">
                {s.finished} finished · {s.note}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function Privacy() {
  const [profile, setProfile] = useState(true)
  const [managerTime, setManagerTime] = useState(false)
  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          Who can see this
        </CardTitle>
        <CardDescription>Field School doesn’t rank people, and your manager doesn’t get a dashboard of you.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">Kwame (your manager)</span> sees required training only: done, due or overdue.
            </span>
          </li>
          <li className="flex gap-2">
            <EyeOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">Quiz answers and scores</span> stay with you. Nobody else can open them.
            </span>
          </li>
        </ul>
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pv-profile" className="flex flex-col items-start gap-0.5">
              <span>Show certificates on my profile</span>
              <span className="text-xs font-normal text-muted-foreground">Colleagues see titles and dates.</span>
            </Label>
            <Switch id="pv-profile" checked={profile} onCheckedChange={setProfile} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pv-time" className="flex flex-col items-start gap-0.5">
              <span>Share time spent with Kwame</span>
              <span className="text-xs font-normal text-muted-foreground">Useful for growth conversations. Off by default.</span>
            </Label>
            <Switch id="pv-time" checked={managerTime} onCheckedChange={setManagerTime} />
          </div>
        </div>
        <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Eye className="size-3.5 shrink-0" />
          {managerTime ? 'Kwame sees required status and monthly totals.' : 'Right now Kwame sees required status only.'}
        </p>
      </CardContent>
    </Card>
  )
}

type Filter = 'all' | 'required' | 'certs'

function HistoryTab() {
  const [filter, setFilter] = useState<Filter>('all')
  const rows = HISTORY.filter((r) => (filter === 'required' ? r.required : filter === 'certs' ? r.cert : true))
  const total = rows.reduce((s, r) => s + r.minutes, 0)

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        aria-label="Filter history"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Everything' },
          { value: 'required', label: 'Required' },
          { value: 'certs', label: 'Earned a certificate' },
        ]}
      />
      <TableCard title="Finished in 2026" count={rows.length} description={`${formatMinutes(total)} in all`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="max-md:hidden">Format</TableHead>
              <TableHead className="max-lg:hidden">Topic</TableHead>
              <TableHead numeric>Time</TableHead>
              <TableHead className="max-sm:hidden">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableEmpty colSpan={6}>Nothing matches.</TableEmpty>}
            {rows.map((r) => (
              <TableRow key={r.title}>
                <TableCell className="text-muted-foreground tabular-nums">{r.date}</TableCell>
                <TableCell fill>
                  {r.path ? (
                    <a href={href(r.path)} className="hover:underline">
                      {r.title}
                    </a>
                  ) : (
                    <span>{r.title}</span>
                  )}
                </TableCell>
                <TableCell className="max-md:hidden">
                  <FormatBadge format={r.format} />
                </TableCell>
                <TableCell className="text-muted-foreground max-lg:hidden">{TOPIC_BY_ID[r.topic].name}</TableCell>
                <TableCell numeric className="text-muted-foreground">
                  {formatMinutes(r.minutes)}
                </TableCell>
                <TableCell className="max-sm:hidden">
                  <span className="flex items-center gap-2 text-xs">
                    {r.result && <span className="tabular-nums">{r.result}</span>}
                    {r.required && <span className="text-muted-foreground">Required</span>}
                    {r.cert && <Award className="size-3.5 text-muted-foreground" aria-label="Certificate" />}
                    {!r.result && !r.required && !r.cert && <span className="text-muted-foreground">—</span>}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      <p className="text-xs text-muted-foreground">
        Only finished things are listed. Things you started and set aside aren’t recorded against you, and nobody sees how long you took.
      </p>
    </div>
  )
}

function Certificates() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CERTS.map((c) => (
          <Card key={c.id} className="gap-0 overflow-hidden py-0">
            <Cover seed={c.code} series={c.series} motif="rings" className="h-28 rounded-none">
              <div className="flex size-full items-start justify-between p-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-background/85">
                  <Award className="size-5" />
                </span>
                {c.required && <Badge variant="secondary">Required</Badge>}
              </div>
            </Cover>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-muted-foreground">For finishing “{c.from}”</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Issued</dt>
                  <dd className="tabular-nums">{c.issued}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="tabular-nums">{c.expires ?? 'Never'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Verify with</dt>
                  <dd className="font-mono">{c.code}</dd>
                </div>
              </dl>
              <Button variant="outline" size="sm" className="w-fit">
                <Download />
                Download PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="gap-3 py-5">
        <CardContent className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-medium">Next: On-call ready</span>
            <span className="text-xs text-muted-foreground">Earned when you finish the on-call path and your shadow shift.</span>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-56">
            <Progress value={0} aria-label="On-call path progress" />
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">0 / 7</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
