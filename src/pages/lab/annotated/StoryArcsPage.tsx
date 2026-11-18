import { useEffect, useMemo, useState } from 'react'
import { Table2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { ArcsChart } from '@/features/lab/annotated/arcs/ArcsChart'
import { arcStory, buildArcs, shortDay, windowStory, type Arc, type Day } from '@/features/lab/annotated/arcs/model'
import { experiment } from '@/features/lab/catalog'
import { useWikiDay } from '@/features/lab/feeds'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import type { LiveData } from '@/features/lab/useLiveData'
import type { WikiArticle } from '@/features/lab/sources'
import { cn } from '@/lib/utils'

/*
 * Story Arcs: two weeks of English Wikipedia's most-read articles as a bump
 * chart, where the annotations carry the narrative: debuts, peaks, runs at
 * #1, big climbs and exits are found in the data and labeled on the lines.
 * Hover a line for its whole story in one sentence.
 */

const EXP = experiment('story-arcs')
const SPAN = 14
const DAYS_AGO = Array.from({ length: SPAN + 1 }, (_, i) => i + 1) // 1..15

export function StoryArcsPage() {
  // Fixed number of hooks, called in the same order every render.
  const feeds = DAYS_AGO.map((d) => useWikiDay(d)) // eslint-disable-line react-hooks/rules-of-hooks
  const latestOut = !!feeds[0].data
  const latestPending = !feeds[0].data && !feeds[0].error
  // If yesterday isn't published yet, the span starts the day before.
  const offset = latestOut ? 1 : 2
  const span = latestPending ? [] : latestOut ? feeds.slice(0, SPAN) : feeds.slice(1, SPAN + 1)
  // Days that failed (Wikimedia rate-limits bursts) are retried once, then left out.
  const failed = span.filter((f) => !f.data && f.error)
  const [retried, setRetried] = useState(false)
  useEffect(() => {
    if (retried || !failed.length) return
    const id = window.setTimeout(() => {
      failed.forEach((f) => f.reload())
      setRetried(true)
    }, 2500)
    return () => clearTimeout(id)
  }, [failed.length, retried]) // eslint-disable-line react-hooks/exhaustive-deps
  const pending = span.filter((f) => !f.data && !f.error)
  const have = span.filter((f) => f.data).length
  const gate: LiveData<unknown>[] = latestPending ? [feeds[0]] : pending.length ? pending : have >= 5 ? span.filter((f) => f.data) : failed

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment · annotated" title={EXP.title} description={EXP.thesis} />
        <SourceLine source="Wikimedia · English Wikipedia daily top pageviews" href="https://wikimedia.org/api/rest_v1/" feeds={gate} />
      </div>
      <LoadGate feeds={gate} label="Reading two weeks of top-article lists">
        {() => {
          const days: Day[] = span
            .map((f, i) => ({ date: new Date(Date.now() - (i + offset) * 86400_000), list: f.data as WikiArticle[] | undefined }))
            .filter((d): d is Day => !!d.list)
            .reverse()
          return <Body days={days} missing={SPAN - days.length} />
        }}
      </LoadGate>
    </div>
  )
}

function Body({ days, missing }: { days: Day[]; missing: number }) {
  const [n, setN] = useState<10 | 20>(10)
  const [mode, setMode] = useState<'key' | 'all'>('key')
  const [active, setActive] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [table, setTable] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const arcs = useMemo(() => buildArcs(days, n), [days, n])
  const focus = active ?? pinned
  const act = arcs.find((a) => a.article === focus)
  const featured = arcs.filter((a) => a.featured)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<'10' | '20'>
            aria-label="How many ranks"
            value={String(n) as '10' | '20'}
            onChange={(v) => setN(Number(v) as 10 | 20)}
            options={[
              { value: '10', label: 'Top 10' },
              { value: '20', label: 'Top 20' },
            ]}
          />
          <Segmented<'key' | 'all'>
            aria-label="Which moments to annotate"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'key', label: 'Key stories' },
              { value: 'all', label: 'Every moment' },
            ]}
          />
          <span className="text-xs text-muted-foreground">
            {shortDay(days[0].date)} – {shortDay(days[days.length - 1].date)} (UTC)
            {missing > 0 && ` · ${missing} day${missing === 1 ? '' : 's'} unavailable, left out`}
          </span>
        </div>
        <Button variant={table ? 'secondary' : 'outline'} onClick={() => setTable((t) => !t)} aria-pressed={table}>
          <Table2 />
          Table
        </Button>
      </div>

      <Card className="gap-0 py-0">
        {/* The story line: a summary of the window, or the hovered arc in one sentence. Fixed height, no jump. */}
        <div className="flex min-h-20 items-start gap-3 border-b px-6 py-4" aria-live="polite">
          {act ? (
            <>
              <span aria-hidden className="mt-2 h-0.5 w-4 shrink-0 rounded-full" style={{ background: act.color }} />
              <p className="text-sm leading-relaxed">{arcStory(act, days, n)}</p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">{windowStory(arcs, days, n)} Hover a line for its story; click a name below to pin it.</p>
          )}
        </div>
        {table ? (
          <RankTable arcs={arcs} days={days} n={n} />
        ) : (
          <div className="px-2 py-4 sm:px-4">
            <ArcsChart arcs={arcs} days={days} n={n} active={focus} onActive={setActive} mode={mode} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-6 py-3 text-xs">
          {featured.map((a) => (
            <button
              key={a.article}
              type="button"
              className={cn('inline-flex items-center gap-1.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', pinned === a.article ? 'font-semibold text-foreground' : 'text-foreground/80')}
              onClick={() => setPinned((p) => (p === a.article ? null : a.article))}
              onPointerEnter={() => setActive(a.article)}
              onPointerLeave={() => setActive(null)}
            >
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: a.color }} />
              {a.title}
            </button>
          ))}
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: 'var(--series-other)' }} />
            {arcs.length - featured.length} more
          </span>
        </div>
      </Card>

      <Card className="gap-3 px-6">
        <h2 className="font-semibold">Every arc, written</h2>
        <ol className="flex flex-col divide-y">
          {(showAll ? arcs : arcs.slice(0, 8)).map((a) => (
            <li
              key={a.article}
              className={cn('flex gap-3 py-2.5 text-sm', focus === a.article && 'bg-accent/60')}
              onPointerEnter={() => setActive(a.article)}
              onPointerLeave={() => setActive(null)}
            >
              <span aria-hidden className="mt-2 h-0.5 w-3 shrink-0 rounded-full" style={{ background: a.color }} />
              <span className="text-muted-foreground">{arcStory(a, days, n)}</span>
            </li>
          ))}
        </ol>
        {arcs.length > 8 && (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowAll((s) => !s)}>
            {showAll ? 'Show fewer' : `Show all ${arcs.length}`}
          </Button>
        )}
      </Card>
    </div>
  )
}

function RankTable({ arcs, days, n }: { arcs: Arc[]; days: Day[]; n: number }) {
  return (
    <div className="max-h-[640px] overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted text-muted-foreground">
          <tr>
            <th className="sticky left-0 bg-muted px-4 py-2 text-left font-medium">Article</th>
            {days.map((d) => (
              <th key={d.date.toISOString()} className="px-2 py-2 text-right font-medium whitespace-nowrap">
                {shortDay(d.date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {arcs.map((a) => (
            <tr key={a.article}>
              <td className="sticky left-0 max-w-56 truncate bg-card px-4 py-1.5">
                <span aria-hidden className="mr-2 inline-block h-0.5 w-3 rounded-full align-middle" style={{ background: a.color }} />
                {a.title}
              </td>
              {a.ranks.map((r, i) => (
                <td key={i} className={cn('px-2 py-1.5 text-right tabular-nums', r !== null && r <= n ? 'font-medium' : 'text-muted-foreground')}>
                  {r === null ? '–' : r}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
