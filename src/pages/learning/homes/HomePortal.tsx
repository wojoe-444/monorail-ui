import { useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Flame, Sparkles, X } from 'lucide-react'

import { PageBanner } from '@/components/layout/PageBanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { SearchField } from '@/components/ui/search-field'
import { Cover, FORMAT_ICONS, FormatBadge, ItemCover, PersonChip } from '@/features/learning/components'
import {
  FORMAT_LABELS,
  HUB,
  ITEMS,
  PERSON_BY_ID,
  TOPIC_BY_ID,
  TOPICS,
  formatMinutes,
  type Format,
  type Item,
} from '@/features/learning/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Home A, "Portal": the conventional front door. Search first, shortcuts by
 * format, then what's new, what's popular and every topic with its size.
 * Typing or picking a format turns the page into results in place.
 */

/** How many of each format the whole catalog holds (ITEMS is only a sample). */
const FORMAT_COUNTS: [Format, number][] = [
  ['howto', 96],
  ['article', 88],
  ['video', 41],
  ['cheatsheet', 34],
  ['quiz', 27],
  ['podcast', 22],
  ['lab', 14],
  ['course', 12],
  ['guide', 11],
  ['path', 9],
  ['live', 8],
]

const TOTAL = TOPICS.reduce((n, t) => n + t.count, 0)
const NEW_THIS_MONTH: Record<string, number> = {
  start: 2,
  engineering: 9,
  design: 4,
  data: 5,
  leadership: 3,
  writing: 1,
  security: 4,
  customers: 2,
}
const TRY = ['on-call', 'SQL', 'feedback', 'rollback', 'design tokens']

function dateValue(s: string) {
  return Date.parse(`${s} 2026`)
}

/** Where an item's mockup lives, if it has one. */
function itemHref(item: Item): string | undefined {
  if (item.path) return item.path
  if (item.topic === 'data') return '/learn/topic'
  return undefined
}

/** A card or row that's a link when the item has a page, a plain block otherwise. */
function ItemLink({ item, className, children }: { item: Item; className?: string; children: ReactNode }) {
  const to = itemHref(item)
  if (!to) return <div className={className}>{children}</div>
  return (
    <a href={href(to)} className={cn('group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}>
      {children}
    </a>
  )
}

function matches(item: Item, q: string) {
  const hay = [item.title, item.summary, TOPIC_BY_ID[item.topic].name, PERSON_BY_ID[item.author]?.name, ...(item.tags ?? [])]
    .join(' ')
    .toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function Meta({ item }: { item: Item }) {
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {formatMinutes(item.minutes)}
      {item.parts && item.format !== 'quiz' ? ` · ${item.parts} parts` : ''} · {item.level}
    </span>
  )
}

/* ---------- Banner aside: pick up where you left off ---------- */

function ContinueCard() {
  const inFlight = ITEMS.filter((i) => i.progress !== undefined && i.progress < 100)
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardDescription className="text-xs font-semibold tracking-wide uppercase">Continue, {HUB.learner.first}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <ul className="flex flex-col gap-3">
          {inFlight.map((i) => (
            <li key={i.id}>
              <ItemLink item={i} className="flex items-center gap-3 rounded-md">
                <ItemCover item={i} className="size-10 shrink-0 rounded-md" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium group-hover:underline">{i.title}</span>
                  <span className="flex items-center gap-2">
                    <Progress value={i.progress} aria-label={`${i.title} progress`} />
                    <span className="text-xs text-muted-foreground tabular-nums">{i.progress}%</span>
                  </span>
                </span>
              </ItemLink>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/* ---------- Results (search or a format shortcut) ---------- */

function Results({ query, format, onClear }: { query: string; format: Format | null; onClear: () => void }) {
  const results = ITEMS.filter((i) => (!format || i.format === format) && matches(i, query))
  const label = [query && `“${query}”`, format && FORMAT_LABELS[format]].filter(Boolean).join(' in ')
  return (
    <section className="flex flex-col gap-4" aria-live="polite">
      <SectionHeading
        title={`${results.length} result${results.length === 1 ? '' : 's'} for ${label}`}
        description="Searching titles, summaries, tags and authors across the catalog."
        action={
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X />
            Clear
          </Button>
        }
      />
      {results.length === 0 ? (
        <Card className="items-center py-10 text-center">
          <CardContent className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium">Nothing matches that yet.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Try a broader word, or ask in <span className="font-mono text-xs">#field-school</span>: someone has probably written it down
              somewhere.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {results.map((i) => (
              <li key={i.id}>
                <ItemLink item={i} className="flex items-center gap-4 rounded-none px-4 py-3 hover:bg-accent/50">
                  <ItemCover item={i} className="hidden h-14 w-24 shrink-0 sm:block" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-medium">{i.title}</span>
                    <span className="truncate text-sm text-muted-foreground">{i.summary}</span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end gap-1 md:flex">
                    <FormatBadge format={i.format} />
                    <Meta item={i} />
                  </span>
                </ItemLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

/* ---------- Browse sections ---------- */

function NewThisWeek() {
  // The editors pick the lead; the rest is simply the newest.
  const lead = ITEMS.find((i) => i.id === 'data-path') ?? ITEMS[0]
  const side = ITEMS.filter((i) => i !== lead)
    .sort((a, b) => dateValue(b.updated) - dateValue(a.updated))
    .slice(0, 4)
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="New this week" description="Added or rewritten in the last seven days." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ItemLink item={lead} className="block">
          <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow group-hover:shadow-elevation-2">
            <ItemCover item={lead} className="min-h-44 flex-1 rounded-none">
              <div className="flex size-full items-start p-4">
                <Badge variant="primary">
                  <Sparkles />
                  Editors’ pick · Updated {lead.updated}
                </Badge>
              </div>
            </ItemCover>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <FormatBadge format={lead.format} />
                <span className="text-xs text-muted-foreground">{TOPIC_BY_ID[lead.topic].name}</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-balance">{lead.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{lead.summary}</p>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                <PersonChip id={lead.author} showRole />
                <Meta item={lead} />
              </div>
            </div>
          </Card>
        </ItemLink>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {side.map((i) => (
            <ItemLink key={i.id} item={i} className="block">
              <Card className="h-full gap-3 overflow-hidden pt-0 pb-4 transition-shadow group-hover:shadow-elevation-2">
                <ItemCover item={i} className="aspect-[16/8] rounded-none" />
                <div className="flex flex-col gap-1.5 px-4">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FormatIcon format={i.format} />
                    {FORMAT_LABELS[i.format]} · {i.updated}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-semibold">{i.title}</h3>
                  <Meta item={i} />
                </div>
              </Card>
            </ItemLink>
          ))}
        </div>
      </div>
    </section>
  )
}

function FormatIcon({ format }: { format: Format }) {
  const Icon = FORMAT_ICONS[format]
  return <Icon className="size-3.5" aria-hidden />
}

function MostPopular() {
  const top = [...ITEMS].sort((a, b) => b.learners - a.learners).slice(0, 8)
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="Most popular" description="By people who finished it in the last 90 days." />
      <Card className="gap-0 py-0">
        <ol className="grid grid-cols-1 md:grid-cols-2 md:divide-x">
          {[top.slice(0, 4), top.slice(4)].map((col, c) => (
            <li key={c} className={cn('divide-y', c === 1 && 'border-t md:border-t-0')}>
              <ol className="divide-y">
                {col.map((i, n) => {
                  const rank = c * 4 + n + 1
                  return (
                    <li key={i.id}>
                      <ItemLink item={i} className="flex items-center gap-3 rounded-none px-4 py-3 hover:bg-accent/50">
                        <span className="w-5 shrink-0 text-right text-lg font-semibold text-muted-foreground tabular-nums">{rank}</span>
                        <ItemCover item={i} className="size-11 shrink-0 rounded-md" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium">{i.title}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {FORMAT_LABELS[i.format]} · {formatMinutes(i.minutes)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                          {rank <= 3 && <Flame className="size-3.5 text-primary" aria-hidden />}
                          {i.learners.toLocaleString()}
                        </span>
                      </ItemLink>
                    </li>
                  )
                })}
              </ol>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  )
}

function ByTopic() {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="Browse by topic" description={`${TOPICS.length} topics, ${TOTAL} things in all.`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TOPICS.map((t) => {
          const linked = t.id === 'data'
          const body = (
            <Card className={cn('h-full flex-row items-center gap-4 p-4', linked && 'transition-shadow group-hover:shadow-elevation-2')}>
              <Cover seed={`topic-${t.id}`} series={t.series} motif="grid" className="size-14 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold">{t.name}</h3>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{t.count}</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{t.blurb}</p>
                <span className="text-xs text-primary tabular-nums">{NEW_THIS_MONTH[t.id]} new this month</span>
              </div>
            </Card>
          )
          return linked ? (
            <a
              key={t.id}
              href={href('/learn/topic')}
              className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {body}
            </a>
          ) : (
            <div key={t.id}>{body}</div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- Page ---------- */

export function HomePortal() {
  const [query, setQuery] = useState('')
  const [format, setFormat] = useState<Format | null>(null)
  const searching = query.trim() !== '' || format !== null
  const maxCount = useMemo(() => Math.max(...FORMAT_COUNTS.map(([, n]) => n)), [])

  return (
    <div className="flex flex-col gap-10">
      <PageBanner
        kicker={
          <>
            {HUB.name} · {HUB.org}
          </>
        }
        title="What do you want to learn?"
        description={`${TOTAL} how-tos, videos, articles and courses, written by the people at ${HUB.org} who do the work.`}
        aside={<ContinueCard />}
      >
        <SearchField
          size="lg"
          shortcut="Ctrl K"
          placeholder="Search by skill, tool or question…"
          aria-label={`Search ${HUB.name}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
          <span>Try</span>
          {TRY.map((t, n) => (
            <span key={t}>
              <button
                type="button"
                onClick={() => setQuery(t)}
                className="rounded-sm font-medium text-foreground underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t}
              </button>
              {n < TRY.length - 1 ? ',' : ''}
            </span>
          ))}
        </p>
      </PageBanner>

      <section className="flex flex-col gap-3" aria-labelledby="formats-heading">
        <h2 id="formats-heading" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Browse by format
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {FORMAT_COUNTS.slice(0, 11).map(([f, n]) => {
            const Icon = FORMAT_ICONS[f]
            const active = format === f
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => setFormat(active ? null : f)}
                className={cn(
                  'group flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <Icon className={cn('size-4', active ? '' : 'text-muted-foreground')} aria-hidden />
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">{n}</span>
                </span>
                <span className="truncate text-sm font-medium">{FORMAT_LABELS[f]}</span>
                <span className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full rounded-full bg-primary/50" style={{ width: `${(n / maxCount) * 100}%` }} />
                </span>
              </button>
            )
          })}
          <a
            href={href('/learn/progress')}
            className="flex min-w-0 flex-col justify-between gap-2 rounded-lg border border-dashed p-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="text-xs text-muted-foreground">Your record</span>
            <span className="flex items-center gap-1 font-medium">
              My learning <ArrowRight className="size-4" />
            </span>
          </a>
        </div>
      </section>

      {searching ? (
        <Results
          query={query.trim()}
          format={format}
          onClear={() => {
            setQuery('')
            setFormat(null)
          }}
        />
      ) : (
        <>
          <NewThisWeek />
          <MostPopular />
          <ByTopic />
          <p className="border-t pt-6 text-sm text-muted-foreground">
            Can’t find it? Ask in <span className="font-mono text-xs text-foreground">#field-school</span>, or{' '}
            <a href={href('/learn/live')} className="font-medium text-primary underline-offset-4 hover:underline">
              bring it to office hours
            </a>
            . Anyone at {HUB.org} can write for {HUB.name}.
          </p>
        </>
      )}
    </div>
  )
}
