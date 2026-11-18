import { useState } from 'react'
import { RadioGroup } from 'radix-ui'
import {
  ArrowRight,
  Check,
  CircleSlash,
  Flag,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PersonChip } from '@/features/learning/components'
import { ITEM_BY_ID } from '@/features/learning/data'
import { href, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Page 10: a decision guide. Four questions, each answer visibly rules out
 * candidates, ending in the house recommendation with its reasons, caveats,
 * owner and review date.
 */

const GUIDE = ITEM_BY_ID['which-store']

type StoreId = 'postgres' | 'dynamodb' | 'redis' | 's3' | 'opensearch'

interface Store {
  id: StoreId
  name: string
  product: string
  tier: 'Default' | 'Paved road' | 'Specialist'
  /** Pick this when… (shown for the runner-up). */
  when: string
  caveat: string
}

/** In house order: earlier wins a tie. */
const STORES: Store[] = [
  {
    id: 'postgres',
    name: 'Postgres',
    product: 'Aurora PostgreSQL, run by Platform',
    tier: 'Default',
    when: 'you need joins, constraints and transactions, at any size we run today.',
    caveat: 'Add read replicas before you add a cache. Most “Postgres is slow” tickets are a missing index.',
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    product: 'AWS DynamoDB, on-demand',
    tier: 'Paved road',
    when: 'every read is by a key you know up front and the write rate is enormous.',
    caveat: 'Design the access patterns first; changing them later means a migration. Transactions cap at 100 items.',
  },
  {
    id: 'redis',
    name: 'Redis',
    product: 'ElastiCache, run by Platform',
    tier: 'Paved road',
    when: 'the data is a cache, a rate limit or a queue you could rebuild.',
    caveat: 'Treat it as disposable. Anything you can’t lose belongs in a system of record behind it.',
  },
  {
    id: 's3',
    name: 'S3 + Parquet',
    product: 'Lake tables, queried with Athena',
    tier: 'Paved road',
    when: 'you keep a lot of history and read it in bulk for reports and models.',
    caveat: 'Partition by date from day one, and keep files over 100 MB or queries crawl.',
  },
  {
    id: 'opensearch',
    name: 'OpenSearch',
    product: 'Run by the Search team',
    tier: 'Specialist',
    when: 'people type words and expect relevant results, with typos forgiven.',
    caveat: 'It’s an index, not a source of truth. Rebuild it from your database, never the other way round.',
  },
]

const STORE_BY_ID = Object.fromEntries(STORES.map((s) => [s.id, s])) as Record<StoreId, Store>

interface Option {
  id: string
  label: string
  hint: string
  /** Stores this answer rules out, with the reason. */
  rules?: Partial<Record<StoreId, string>>
  /** Stores this answer points to, with the reason. */
  favors?: Partial<Record<StoreId, string>>
  /** A caveat that follows this answer whatever the store. */
  caveat?: string
}

interface Question {
  id: string
  short: string
  text: string
  why: string
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    id: 'shape',
    short: 'Shape of the data',
    text: 'What does the data look like?',
    why: 'The shape decides more than scale does. Most wrong choices start here.',
    options: [
      {
        id: 'records',
        label: 'Records that refer to each other',
        hint: 'Orders, customers, invoices, permissions.',
        favors: { postgres: 'Records that refer to each other are what relational databases are for.' },
        rules: {
          redis: 'Not a system of record: memory first, and keys can be evicted.',
          s3: 'Files can’t be updated in place, one record at a time.',
          opensearch: 'A search index, not a system of record.',
        },
      },
      {
        id: 'keys',
        label: 'Lookups by a known key',
        hint: 'Sessions, device state, a user’s settings.',
        favors: {
          dynamodb: 'Reads by a known key, at any scale, are DynamoDB’s sweet spot.',
          redis: 'Key lookups in well under a millisecond.',
        },
        rules: { s3: 'Single lookups take seconds, not milliseconds.', opensearch: 'Full-text search is overkill for reading by key.' },
      },
      {
        id: 'events',
        label: 'Lots of events, read in bulk',
        hint: 'Clickstreams, audit logs, metrics history.',
        favors: { s3: 'Columnar files are the cheapest way to keep events and scan them.' },
        rules: {
          redis: 'Memory is the most expensive place to keep history.',
          dynamodb: 'Scanning a table for analysis is slow and billed per item.',
        },
      },
      {
        id: 'text',
        label: 'Text that people search',
        hint: 'Help articles, tickets, a product catalog.',
        favors: { opensearch: 'Relevance ranking, stemming and typo tolerance come built in.' },
        rules: { redis: 'No full-text search.', dynamodb: 'No full-text search.', s3: 'Can’t serve interactive search.' },
      },
    ],
  },
  {
    id: 'consistency',
    short: 'Consistency',
    text: 'If two people write at the same moment, what must happen?',
    why: 'This is the question people skip, and the one incident reviews keep coming back to.',
    options: [
      {
        id: 'exact',
        label: 'It must be exactly right',
        hint: 'Money, stock counts, who can see what.',
        favors: { postgres: 'Transactions across rows, with constraints the database enforces for you.' },
        rules: {
          redis: 'Persistence and transactions too weak for money.',
          s3: 'No transactions at all.',
          opensearch: 'Eventually consistent: a write isn’t visible for about a second.',
        },
      },
      {
        id: 'last',
        label: 'Last write wins is fine',
        hint: 'Preferences, drafts, a profile photo.',
      },
      {
        id: 'derived',
        label: 'It’s a copy I could rebuild',
        hint: 'A cache, a search index, a leaderboard.',
        favors: { redis: 'Losing it costs a rebuild, not data.', opensearch: 'Indexes are meant to be rebuilt from a source of truth.' },
        caveat: 'Write down where the copy is rebuilt from, and test the rebuild before launch.',
      },
    ],
  },
  {
    id: 'scale',
    short: 'Scale',
    text: 'How big and how busy will it be a year from now?',
    why: 'Guess generously, then halve it. We almost always overestimate.',
    options: [
      {
        id: 'normal',
        label: 'Under 1 TB, under 5,000 writes a second',
        hint: 'Nearly everything Kestrel runs today.',
        favors: { postgres: 'Comfortably inside a single Aurora cluster, with room to grow.' },
      },
      {
        id: 'bulk',
        label: 'Many terabytes, read in bulk',
        hint: 'Years of history for reports and models.',
        favors: { s3: 'Storage costs cents per gigabyte and Athena scans it in parallel.' },
        rules: { redis: 'Terabytes in memory isn’t affordable.', dynamodb: 'Bulk reads are scans, billed per item read.' },
      },
      {
        id: 'firehose',
        label: 'Huge write rates, fast reads at any size',
        hint: 'Tens of thousands of writes a second.',
        favors: { dynamodb: 'Scales writes horizontally without anyone sharding by hand.' },
        rules: { postgres: 'Beyond one writer’s limits; sharding Postgres is a project, not a setting.', s3: 'Reads take seconds.' },
      },
    ],
  },
  {
    id: 'ops',
    short: 'Who runs it',
    text: 'Who gets paged when it breaks at 3 a.m.?',
    why: 'A store nobody here can debug is a store you’ll be debugging alone.',
    options: [
      {
        id: 'platform',
        label: 'Platform, on the paved road',
        hint: 'They run it, back it up and carry the pager.',
        rules: { opensearch: 'Not on the paved road. The Search team runs it for their own products only.' },
      },
      {
        id: 'us',
        label: 'Our team, with Platform’s help',
        hint: 'We’ve run something like it before.',
        caveat: 'You carry the pager. Budget a week for runbooks, alerts and a restore drill.',
      },
      {
        id: 'unsure',
        label: 'We haven’t decided',
        hint: 'That’s a normal answer at this stage.',
        caveat: 'Book Platform office hours (Thursdays, 2 p.m.) before you build anything.',
      },
    ],
  },
]

type Answers = Record<string, string | undefined>

function optionFor(q: Question, answers: Answers) {
  return q.options.find((o) => o.id === answers[q.id])
}

/** For each store: why it was ruled out (first reason wins), and its reasons for. */
function evaluate(answers: Answers) {
  const out: Partial<Record<StoreId, { reason: string; q: number }>> = {}
  const pros: Record<StoreId, { reason: string; q: number }[]> = { postgres: [], dynamodb: [], redis: [], s3: [], opensearch: [] }
  QUESTIONS.forEach((q, qi) => {
    const o = optionFor(q, answers)
    if (!o) return
    for (const [id, reason] of Object.entries(o.rules ?? {}) as [StoreId, string][]) if (!out[id]) out[id] = { reason, q: qi }
    for (const [id, reason] of Object.entries(o.favors ?? {}) as [StoreId, string][]) pros[id].push({ reason, q: qi })
  })
  const ranked = STORES.filter((s) => !out[s.id]).sort((a, b) => pros[b.id].length - pros[a.id].length)
  return { out, pros, ranked }
}

export function DecisionGuidePage() {
  const params = useSearchParams()
  // ?answers=records,exact,normal,platform opens a shared result.
  const [answers, setAnswers] = useState<Answers>(() => {
    const given = (params.get('answers') ?? '').split(',')
    return Object.fromEntries(QUESTIONS.map((q, i) => [q.id, q.options.some((o) => o.id === given[i]) ? given[i] : undefined]))
  })
  const [editing, setEditing] = useState<number | null>(null)
  const [verdict, setVerdict] = useState<'yes' | 'no' | null>(null)

  const firstOpen = QUESTIONS.findIndex((q) => !answers[q.id])
  const current = editing ?? (firstOpen === -1 ? null : firstOpen)
  const complete = firstOpen === -1
  const { out, pros, ranked } = evaluate(answers)
  const leader = ranked[0]
  const answeredCount = QUESTIONS.filter((q) => answers[q.id]).length

  const answer = (qi: number, id: string) => {
    setAnswers({ ...answers, [QUESTIONS[qi].id]: id })
    setEditing(null)
    setVerdict(null)
  }
  const reset = () => {
    setAnswers({})
    setEditing(null)
    setVerdict(null)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Decision guide"
        title={GUIDE.title}
        description="Four questions, about a minute. Each answer rules options out, so you can see why you end up where you do."
        actions={
          answeredCount > 0 && (
            <Button variant="ghost" onClick={reset}>
              <RotateCcw />
              Start over
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <ul aria-label="Candidates still in" className="flex flex-wrap gap-1.5 xl:hidden">
            {STORES.map((s) => (
              <li
                key={s.id}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  out[s.id]
                    ? 'text-muted-foreground line-through opacity-60'
                    : leader?.id === s.id && answeredCount > 0
                      ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                      : 'bg-card',
                )}
              >
                {s.name}
                <span className="sr-only">{out[s.id] ? ' (ruled out)' : ' (still in)'}</span>
              </li>
            ))}
          </ul>
          <ol className="flex flex-col gap-3" aria-label="Questions">
            {QUESTIONS.map((q, qi) => {
              const chosen = optionFor(q, answers)
              if (qi === current)
                return (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    index={qi}
                    value={answers[q.id]}
                    out={out}
                    onAnswer={(id) => answer(qi, id)}
                    onCancel={editing !== null && chosen ? () => setEditing(null) : undefined}
                  />
                )
              return (
                <li key={q.id}>
                  <div
                    className={cn(
                      'flex items-center gap-4 rounded-xl px-5 py-3.5',
                      chosen ? 'bg-card ring-1 ring-foreground/10' : 'border border-dashed',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                        chosen ? 'bg-success-soft text-success-soft-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {chosen ? <Check className="size-4" aria-label="Answered" /> : qi + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-xs text-muted-foreground">{q.short}</span>
                      <span className={cn('text-sm sm:truncate', chosen ? 'font-medium' : 'text-muted-foreground')}>
                        {chosen ? chosen.label : q.text}
                      </span>
                    </div>
                    {chosen && (
                      <Button variant="ghost" size="sm" onClick={() => setEditing(qi)} aria-label={`Change answer to “${q.text}”`}>
                        Change
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          {complete && editing === null && (
            <Recommendation leader={leader} runnerUp={ranked[1]} pros={pros} answers={answers} verdict={verdict} onVerdict={setVerdict} />
          )}
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24">
          <Card className="gap-0 pb-0">
            <CardHeader className="pb-4">
              <CardTitle>Candidates</CardTitle>
              <CardDescription>
                {ranked.length} of {STORES.length} still in{leader && answeredCount > 0 ? ` · ${leader.name} leads` : ''}
              </CardDescription>
            </CardHeader>
            <ul className="divide-y border-t" aria-live="polite">
              {STORES.map((s) => {
                const ruled = out[s.id]
                const isLeader = !ruled && leader?.id === s.id && answeredCount > 0
                return (
                  <li key={s.id} className={cn('flex gap-3 px-6 py-3 transition-opacity', ruled && 'opacity-55')}>
                    <span className="mt-1 flex size-4 shrink-0 items-center justify-center">
                      {ruled ? (
                        <CircleSlash className="size-4 text-muted-foreground" aria-label="Ruled out" />
                      ) : (
                        <span className={cn('size-2.5 rounded-full', isLeader ? 'bg-primary' : 'bg-muted-foreground/40')} aria-hidden />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('text-sm font-medium', ruled && 'line-through decoration-muted-foreground/60')}>{s.name}</span>
                        {isLeader && <Badge variant="primary">Leading</Badge>}
                        {s.tier === 'Default' && !ruled && <Badge variant="outline">House default</Badge>}
                        {!ruled && !isLeader && pros[s.id].length > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">{pros[s.id].length} for</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ruled ? (
                          <>
                            <span className="font-medium">Q{ruled.q + 1}:</span> {ruled.reason}
                          </>
                        ) : (
                          s.product
                        )}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden />
                If you stop here
              </CardTitle>
              <CardDescription>
                Use Postgres. It’s the house default: the store most of us can debug at 3 a.m., and the one that has never been the wrong
                first choice for a new service here.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="gap-4">
            <CardContent className="flex flex-col gap-3">
              <span className="text-xs font-medium text-muted-foreground">Owned by</span>
              <PersonChip id={GUIDE.author} showRole />
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Reviewed</dt>
                <dd>{GUIDE.updated}, with Platform</dd>
                <dt className="text-muted-foreground">Next review</dt>
                <dd>Jan 21</dd>
                <dt className="text-muted-foreground">Used</dt>
                <dd className="tabular-nums">{GUIDE.learners.toLocaleString()} times in 90 days</dd>
              </dl>
            </CardContent>
            <CardFooter className="border-t">
              <Button variant="ghost" size="sm" className="-ml-2">
                <Flag />
                Suggest a change
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function QuestionCard({
  q,
  index,
  value,
  out,
  onAnswer,
  onCancel,
}: {
  q: Question
  index: number
  value?: string
  out: Partial<Record<StoreId, { reason: string; q: number }>>
  onAnswer: (id: string) => void
  onCancel?: () => void
}) {
  const labelId = `q-${q.id}`
  return (
    <li>
      <Card className="gap-5 ring-2 ring-primary/30">
        <CardHeader>
          <span className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">
            Question {index + 1} of {QUESTIONS.length} · {q.short}
          </span>
          <CardTitle id={labelId} className="text-lg leading-snug">
            {q.text}
          </CardTitle>
          <CardDescription>{q.why}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup.Root
            aria-labelledby={labelId}
            value={value ?? ''}
            onValueChange={onAnswer}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {q.options.map((o) => {
              // Only count stores this answer would newly rule out.
              const cuts = (Object.keys(o.rules ?? {}) as StoreId[]).filter((id) => !out[id] || out[id]!.q === index)
              return (
                <RadioGroup.Item
                  key={o.id}
                  value={o.id}
                  className={cn(
                    'group flex flex-col items-start gap-1 rounded-lg border bg-card p-4 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
                    'data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft',
                  )}
                >
                  <span className="text-sm font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.hint}</span>
                  <span className="mt-2 text-xs text-muted-foreground">
                    {cuts.length ? (
                      <>
                        Rules out <span className="font-medium text-foreground">{cuts.map((id) => STORE_BY_ID[id].name).join(', ')}</span>
                      </>
                    ) : (
                      'Rules nothing out'
                    )}
                  </span>
                </RadioGroup.Item>
              )
            })}
          </RadioGroup.Root>
        </CardContent>
        {onCancel && (
          <CardFooter>
            <Button variant="ghost" size="sm" className="-ml-2" onClick={onCancel}>
              Keep my answer
            </Button>
          </CardFooter>
        )}
      </Card>
    </li>
  )
}

function Recommendation({
  leader,
  runnerUp,
  pros,
  answers,
  verdict,
  onVerdict,
}: {
  leader?: Store
  runnerUp?: Store
  pros: Record<StoreId, { reason: string; q: number }[]>
  answers: Answers
  verdict: 'yes' | 'no' | null
  onVerdict: (v: 'yes' | 'no') => void
}) {
  const answerCaveats = QUESTIONS.map((q) => optionFor(q, answers)?.caveat).filter(Boolean) as string[]

  if (!leader) {
    return (
      <Card className="gap-4 ring-2 ring-warning/40">
        <CardHeader>
          <span className="text-xs font-semibold tracking-[0.08em] text-warning-soft-foreground uppercase">No single answer</span>
          <CardTitle className="text-xl">Your answers rule out every store</CardTitle>
          <CardDescription>
            That usually means you need two: a system of record (almost always Postgres) and a derived copy shaped for the hard part, such
            as a search index or a lake table, rebuilt from it.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button asChild>
            <a href={href('/learn/live')}>
              Bring it to Platform office hours
              <ArrowRight />
            </a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const reasons = pros[leader.id]
  return (
    <Card className="gap-6 overflow-hidden pt-0">
      <div className="flex flex-col gap-2 border-b bg-primary-soft px-6 py-6 text-primary-soft-foreground">
        <span className="text-xs font-semibold tracking-[0.08em] uppercase">Recommendation</span>
        <h2 className="text-2xl font-semibold tracking-tight">Use {leader.name}</h2>
        <p className="text-sm">
          {leader.product}.{' '}
          {leader.id === 'postgres'
            ? 'The house default, and your answers agree with it.'
            : `On the ${leader.tier === 'Specialist' ? 'specialist list' : 'paved road'}; the house default didn’t fit your answers.`}
        </p>
      </div>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Why</h3>
          {reasons.length ? (
            <ul className="flex flex-col gap-2.5 text-sm">
              {reasons.map((r) => (
                <li key={r.reason} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>
                    {r.reason} <span className="text-xs text-muted-foreground">(Q{r.q + 1})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing in your answers argues against it, and it’s the house default.</p>
          )}
        </section>
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Watch out for</h3>
          <ul className="flex flex-col gap-2.5 text-sm">
            {[leader.caveat, ...answerCaveats].map((c) => (
              <li key={c} className="flex gap-2.5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-soft-foreground" aria-hidden />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
      {runnerUp && (
        <CardContent>
          <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm">
            <span className="font-medium">Runner-up: {runnerUp.name}.</span>{' '}
            <span className="text-muted-foreground">Choose it instead if {runnerUp.when}</span>
          </div>
        </CardContent>
      )}
      <CardFooter className="flex-col items-stretch gap-4 border-t sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild>
            <a href={href('/learn/how-to')}>
              Set up {leader.name}
              <ArrowRight />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={href('/learn/article')} className="whitespace-normal">
              Read: The case for boring technology
            </a>
          </Button>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {verdict ? (
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="size-3.5" aria-hidden />
              {verdict === 'yes' ? 'Thanks. Mara sees every answer.' : 'Thanks. Mara will read your answers and follow up.'}
            </span>
          ) : (
            <>
              <span className="mr-1">Did this fit?</span>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Yes, it fit" onClick={() => onVerdict('yes')}>
                <ThumbsUp />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" aria-label="No, it didn’t fit" onClick={() => onVerdict('no')}>
                <ThumbsDown />
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
