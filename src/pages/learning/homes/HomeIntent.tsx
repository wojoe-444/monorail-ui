import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowRight, Check, CornerDownLeft, Flag, MessageCircleQuestion, Siren, Sparkles, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormatBadge, ItemCover, PersonChip } from '@/features/learning/components'
import { HUB, ITEMS, ITEM_BY_ID, PERSON_BY_ID, TOPICS, formatMinutes, type Item } from '@/features/learning/data'
import { JOBS, MORE_TITLES, VERBS, type Job, type RouteStep, type Verb } from '@/features/learning/intent-data'
import { href, navigate, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Home F · "I need to…". The page opens on an unfinished sentence. You finish
 * it by typing or by picking a job (grouped by verb), and the page answers
 * with the shortest route: one to three items, in order, sometimes just the
 * one episode or module that does the job, with the total time and what you've
 * already done struck off. Browsing is demoted to a quiet A–Z index at the
 * bottom: the price of starting from intent.
 */

const BASE = '/learn/home/intent'
const VERB_LABEL = Object.fromEntries(VERBS.map((v) => [v.id, v.label])) as Record<Verb, string>

function stepMinutes(s: RouteStep) {
  return s.minutes ?? ITEM_BY_ID[s.item].minutes
}

function itemPath(item: Item) {
  return item.path ?? `/learn/topic?topic=${item.topic}`
}

function matches(job: Job, q: string) {
  if (!q) return true
  const hay = `${job.phrase} ${job.keywords.join(' ')} ${VERB_LABEL[job.verb]}`.toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

/** The phrase with the typed words picked out. */
function Highlight({ text, query }: { text: string; query: string }) {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1)
  if (!words.length) return <>{text}</>
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-sm bg-primary-soft px-0.5 text-primary-soft-foreground">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

function usePlaceholder(active: boolean) {
  const examples = useMemo(
    () => ['fix a leaked secret', 'pick a database', 'give hard feedback', 'prepare for on-call', 'write a proposal'],
    [],
  )
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => setI((n) => (n + 1) % examples.length), 2600)
    return () => window.clearInterval(t)
  }, [active, examples.length])
  return examples[i]
}

export function HomeIntent() {
  const jobId = useSearchParams().get('job')
  const job = JOBS.find((j) => j.id === jobId) ?? null
  const [text, setText] = useState(job?.phrase ?? '')
  const [verb, setVerb] = useState<Verb | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const placeholder = usePlaceholder(!focused && !text)

  useEffect(() => {
    setText(job?.phrase ?? '')
  }, [job])

  const query = job ? '' : text.trim()
  const results = useMemo(() => JOBS.filter((j) => (!verb || j.verb === verb) && matches(j, query)), [verb, query])
  useEffect(() => setCursor(query ? 0 : -1), [query, verb])

  const choose = (j: Job) => {
    navigate(`${BASE}?job=${j.id}`)
    inputRef.current?.blur()
    window.requestAnimationFrame(() => document.querySelector('[data-slot=app-body]')?.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  const clear = () => {
    setText('')
    setVerb(null)
    if (job) navigate(BASE)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') e.preventDefault()
    if (job) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && results[Math.max(cursor, 0)] && (cursor >= 0 || query)) {
      e.preventDefault()
      choose(results[Math.max(cursor, 0)])
    } else if (e.key === 'Escape') {
      setText('')
    }
  }

  const popular = useMemo(() => [...JOBS].sort((a, b) => b.asked - a.asked).slice(0, 4), [])

  return (
    <div className="flex flex-col gap-10">
      <header className="relative isolate overflow-hidden rounded-xl border border-primary/15 bg-linear-to-br from-primary-soft to-primary-soft/30 p-6 sm:p-10">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle,var(--primary)_1px,transparent_1.5px)] bg-size-[18px_18px] opacity-15 [mask-image:linear-gradient(to_left,black,transparent_70%)]"
        />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-primary-soft-foreground">
            <Sparkles className="size-4" />
            {HUB.name} · start from the job in front of you
          </span>
          <span className="text-muted-foreground">Hi {HUB.learner.first}</span>
        </div>

        <div className="flex flex-col gap-x-4 gap-y-2 lg:flex-row lg:items-baseline">
          <h1 className="shrink-0 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            <label htmlFor="intent">I need to</label>
          </h1>
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={inputRef}
              id="intent"
              rows={1}
              value={text}
              autoComplete="off"
              spellCheck={false}
              placeholder={placeholder}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={onKeyDown}
              onChange={(e) => {
                setText(e.target.value.replace(/\n/g, ' '))
                if (job) navigate(BASE)
              }}
              role="combobox"
              aria-expanded={!job}
              aria-controls="intent-jobs"
              aria-activedescendant={!job && results[cursor] ? `job-${results[cursor].id}` : undefined}
              className={cn(
                'block w-full resize-none field-sizing-content border-b-2 bg-transparent pr-10 pb-1 text-3xl leading-tight font-semibold tracking-tight outline-none placeholder:text-foreground/25 sm:text-5xl',
                job ? 'border-primary text-primary' : 'border-foreground/20 text-foreground focus:border-primary',
              )}
            />
            {text && (
              <button
                type="button"
                onClick={clear}
                aria-label="Clear"
                className="absolute top-1/2 right-0 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter jobs by verb">
          {VERBS.map((v) => {
            const on = verb === v.id || job?.verb === v.id
            return (
              <button
                key={v.id}
                type="button"
                title={v.hint}
                aria-pressed={on}
                onClick={() => {
                  if (job) {
                    setText('')
                    navigate(BASE)
                  }
                  setVerb(verb === v.id && !job ? null : v.id)
                }}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/20 bg-card/70 text-foreground hover:bg-card',
                )}
              >
                {v.label}
                <span className={cn('text-xs tabular-nums', on ? 'opacity-80' : 'text-muted-foreground')}>
                  {JOBS.filter((j) => j.verb === v.id).length}
                </span>
              </button>
            )
          })}
          {!job && (
            <span className="ml-1 hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <kbd className="rounded border bg-card px-1 font-mono">↑</kbd>
              <kbd className="rounded border bg-card px-1 font-mono">↓</kbd>
              <kbd className="inline-flex items-center rounded border bg-card px-1 font-mono">
                <CornerDownLeft className="size-3" />
              </kbd>
              to pick
            </span>
          )}
        </div>
      </header>

      {job ? (
        <RouteView job={job} onPick={choose} />
      ) : (
        <JobList
          results={results}
          query={query}
          cursor={cursor}
          onPick={choose}
          onHover={setCursor}
          popular={popular}
          grouped={!query && !verb}
        />
      )}

      <AtoZ />
    </div>
  )
}

/* ---------- Picking a job ---------- */

function JobButton({
  job,
  query,
  active,
  onPick,
  onHover,
}: {
  job: Job
  query: string
  active: boolean
  onPick: () => void
  onHover: () => void
}) {
  const total = job.route.reduce((n, s) => n + stepMinutes(s), 0)
  return (
    <li id={`job-${job.id}`} role="option" aria-selected={active}>
      <button
        type="button"
        onClick={onPick}
        onMouseEnter={onHover}
        className={cn(
          'group flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
        )}
      >
        <span className="shrink-0 text-muted-foreground/60" aria-hidden>
          …
        </span>
        <span className="min-w-0 flex-1 text-[15px] leading-snug">
          <Highlight text={job.phrase} query={query} />
          {job.urgent && (
            <span className="ml-1.5 inline-flex translate-y-0.5 text-destructive" title="Urgent">
              <Siren className="size-3.5" />
              <span className="sr-only">urgent</span>
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatMinutes(total)}</span>
        <ArrowRight
          className={cn('size-3.5 shrink-0 self-center transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')}
        />
      </button>
    </li>
  )
}

function JobList({
  results,
  query,
  cursor,
  onPick,
  onHover,
  popular,
  grouped,
}: {
  results: Job[]
  query: string
  cursor: number
  onPick: (j: Job) => void
  onHover: (i: number) => void
  popular: Job[]
  grouped: boolean
}) {
  const [asked, setAsked] = useState(false)

  if (!results.length) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
        <h2 className="text-base font-semibold">No job matches “{query}” yet</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          This list is written by people, from what colleagues ask for. Tell us what you were trying to do and Sol adds a route for it,
          usually within a week.
        </p>
        {asked ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" /> Sent. We’ll tell you when there’s a route.
          </span>
        ) : (
          <Button variant="soft" size="sm" onClick={() => setAsked(true)}>
            <MessageCircleQuestion />
            Ask for “I need to {query}”
          </Button>
        )}
      </section>
    )
  }

  const indexOf = (j: Job) => results.indexOf(j)

  return (
    <section aria-label="Jobs" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {grouped ? 'Finish the sentence' : `${results.length} ${results.length === 1 ? 'job' : 'jobs'}`}
        </h2>
        {grouped && <p className="text-xs text-muted-foreground">Asked most this week: {popular.map((p) => p.phrase).join(' · ')}</p>}
      </div>
      <ul
        id="intent-jobs"
        role="listbox"
        aria-label="Jobs"
        className={cn(grouped ? 'grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3' : 'flex max-w-2xl flex-col')}
      >
        {grouped
          ? VERBS.map((v) => (
              <li key={v.id} role="presentation" className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2 border-b pb-1.5">
                  <span className="text-xs font-semibold tracking-wide uppercase">{v.label}</span>
                  <span className="text-xs text-muted-foreground">{v.hint}</span>
                </div>
                <ul role="presentation" className="flex flex-col">
                  {results
                    .filter((j) => j.verb === v.id)
                    .map((j) => (
                      <JobButton
                        key={j.id}
                        job={j}
                        query={query}
                        active={indexOf(j) === cursor}
                        onPick={() => onPick(j)}
                        onHover={() => onHover(indexOf(j))}
                      />
                    ))}
                </ul>
              </li>
            ))
          : results.map((j, i) => (
              <JobButton key={j.id} job={j} query={query} active={i === cursor} onPick={() => onPick(j)} onHover={() => onHover(i)} />
            ))}
      </ul>
    </section>
  )
}

/* ---------- The route ---------- */

function RouteView({ job, onPick }: { job: Job; onPick: (j: Job) => void }) {
  const steps = job.route.map((s) => ({ ...s, it: ITEM_BY_ID[s.item], mins: stepMinutes(s) }))
  const total = steps.reduce((n, s) => n + s.mins, 0)
  const doneSteps = steps.filter((s) => !s.part && s.it.progress === 100)
  const forYou = total - doneSteps.reduce((n, s) => n + s.mins, 0)
  const first = steps.find((s) => !doneSteps.includes(s)) ?? steps[0]
  const nearby = JOBS.filter((j) => j.verb === job.verb && j.id !== job.id)
  const helper = PERSON_BY_ID[job.ask.person]

  return (
    <section aria-labelledby="route-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">The shortest route</div>
          <h2 id="route-title" className="mt-1 text-xl font-semibold tracking-tight">
            {steps.length === 1 ? 'One thing' : `${steps.length} things, in this order`}
            <span className="text-muted-foreground"> · {formatMinutes(total)}</span>
          </h2>
          {doneSteps.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              You’ve already done {doneSteps.length === 1 ? 'one of them' : 'some of them'}, so it’s {formatMinutes(forYou)} for you.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(BASE)}>
            Pick another job
          </Button>
          <Button asChild>
            <a href={href(itemPath(first.it))}>
              Start{steps.length > 1 ? ' with step 1' : ''}
              <ArrowRight />
            </a>
          </Button>
        </div>
      </div>

      <div
        className="flex h-1.5 gap-0.5"
        role="img"
        aria-label={`Time per step: ${steps.map((s, i) => `step ${i + 1}, ${formatMinutes(s.mins)}`).join('; ')}`}
      >
        {steps.map((s, i) => (
          <span
            key={`${s.item}-${i}`}
            title={`Step ${i + 1}: ${formatMinutes(s.mins)}`}
            className={cn('rounded-full', doneSteps.includes(s) ? 'bg-muted-foreground/25' : i === 0 ? 'bg-primary' : 'bg-primary/55')}
            style={{ flexGrow: s.mins, flexBasis: 0 }}
          />
        ))}
      </div>

      {job.urgent && (
        <div className="flex gap-3 rounded-lg border-l-4 border-destructive bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
          <Siren className="mt-0.5 size-4 shrink-0" />
          <span>
            Happening now? Get help first, learn second: <span className="font-mono text-xs font-semibold">{job.ask.where}</span>
          </span>
        </div>
      )}

      <ol
        className="grid grid-cols-1 gap-0 lg:grid-cols-[repeat(var(--steps),minmax(0,1fr))_11rem] lg:gap-4"
        style={{ '--steps': steps.length } as CSSProperties}
      >
        {steps.map((s, i) => {
          const done = doneSteps.includes(s)
          return (
            <li key={`${s.item}-${i}`} className="relative flex gap-4 pb-6 lg:flex-col lg:gap-3 lg:pb-0">
              <span
                aria-hidden
                className="absolute top-9 bottom-0 left-4 w-0.5 bg-primary/30 lg:top-4 lg:right-[-1rem] lg:bottom-auto lg:left-9 lg:h-0.5 lg:w-auto"
              />
              <span
                className={cn(
                  'relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ring-4 ring-background',
                  done ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground',
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <a
                href={href(itemPath(s.it))}
                className={cn(
                  'group flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow outline-none hover:shadow-elevation-2 focus-visible:ring-2 focus-visible:ring-ring',
                  done && 'opacity-60',
                )}
              >
                <ItemCover item={s.it} className="h-20 rounded-none">
                  <div className="flex h-full items-start justify-between p-3">
                    <FormatBadge format={s.it.format} className="bg-card/90" />
                    <span className="rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium tabular-nums">{formatMinutes(s.mins)}</span>
                  </div>
                </ItemCover>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <div className="text-sm leading-snug font-semibold group-hover:underline">{s.it.title}</div>
                  {s.part && (
                    <div className="text-xs text-muted-foreground">
                      Just <span className="font-medium text-foreground">{s.part}</span>
                    </div>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{done ? 'Done already. Skip it, or skim to refresh.' : s.why}</p>
                </div>
              </a>
            </li>
          )
        })}
        <li className="relative flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
          <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
            <Flag className="size-4" />
          </span>
          <div className="text-sm lg:max-w-40">
            <div className="font-semibold">That’s the job.</div>
            <div className="text-muted-foreground">Nothing else is required to {job.phrase}.</div>
          </div>
        </li>
      </ol>

      <div className="grid grid-cols-1 gap-4 border-t pt-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Still stuck after this?</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <PersonChip id={helper.id} showRole />
            <Badge variant="outline" className="font-mono">
              {job.ask.where}
            </Badge>
          </div>
        </div>
        {nearby.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Or did you mean</h3>
            <div className="flex flex-wrap gap-2">
              {nearby.map((j) => (
                <Button key={j.id} variant="outline" size="sm" onClick={() => onPick(j)}>
                  … {j.phrase}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------- A–Z ---------- */

interface Entry {
  title: string
  path: string
  note?: ReactNode
}

function sortKey(t: string) {
  return t.replace(/^(the|a|an)\s+/i, '').toLowerCase()
}

function AtoZ() {
  const groups = useMemo(() => {
    const entries: Entry[] = [
      ...ITEMS.map((i) => ({ title: i.title, path: itemPath(i) })),
      ...TOPICS.map((t) => ({ title: t.name, path: `/learn/topic?topic=${t.id}`, note: 'topic' })),
      ...MORE_TITLES.map((t) => ({ title: t, path: '/learn/topic' })),
    ].sort((a, b) => sortKey(a.title).localeCompare(sortKey(b.title)))
    const map = new Map<string, Entry[]>()
    for (const e of entries) {
      const letter = sortKey(e.title)[0].toUpperCase()
      map.set(letter, [...(map.get(letter) ?? []), e])
    }
    return [...map.entries()]
  }, [])
  const total = groups.reduce((n, [, es]) => n + es.length, 0)

  return (
    <section aria-labelledby="az-title" className="flex flex-col gap-4 border-t pt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="az-title" className="text-sm font-semibold">
          Everything, A–Z
        </h2>
        <span className="text-xs text-muted-foreground">For browsing. {total} entries; titles, not jobs.</span>
      </div>
      <div className="columns-2 gap-8 text-xs sm:columns-3 lg:columns-4 xl:columns-5">
        {groups.map(([letter, entries]) => (
          <div key={letter} className="mb-4 break-inside-avoid">
            <div className="mb-1 font-mono text-[11px] font-semibold text-muted-foreground">{letter}</div>
            <ul className="flex flex-col gap-1">
              {entries.map((e) => (
                <li key={e.title}>
                  <a href={href(e.path)} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                    {e.title}
                  </a>
                  {e.note && <span className="ml-1 text-muted-foreground/60">· {e.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
