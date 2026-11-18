import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { ShapeChart, SlopePanel, type Mover } from '@/features/lab/attention/Charts'
import { compact, useAttention, utcDay, type RankedArticle } from '@/features/lab/attention/useAttention'
import { AttentionTable, Wall } from '@/features/lab/attention/Wall'
import { experiment } from '@/features/lab/catalog'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import type { WikiArticle } from '@/features/lab/sources'

/*
 * Attention: what English Wikipedia read yesterday, where the title itself
 * is the mark. Size ∝ √views, so area tracks readers. Then the movers
 * between two days, and the shape of the long tail.
 */

const EXP = experiment('attention')
const WALL_SIZE = 80

export function AttentionPage() {
  const att = useAttention()
  const feeds = [att.current, att.previous]
  const curLabel = utcDay(att.day, { weekday: 'short', month: 'short', day: 'numeric' })
  const prevLabel = utcDay(att.prevDay, { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />
        <SourceLine source={EXP.source} href="https://wikimedia.org/api/rest_v1/" feeds={feeds} />
      </div>
      <LoadGate feeds={feeds} label="Counting yesterday’s readers">
        {() =>
          att.articles && att.current.data ? (
            <Body
              articles={att.articles}
              list={att.current.data}
              prevList={att.prevList ?? []}
              curLabel={curLabel}
              prevLabel={prevLabel}
              longDay={utcDay(att.day, { weekday: 'long', month: 'long', day: 'numeric' })}
            />
          ) : null
        }
      </LoadGate>
    </div>
  )
}

function Body({
  articles,
  list,
  prevList,
  curLabel,
  prevLabel,
  longDay,
}: {
  articles: RankedArticle[]
  list: WikiArticle[]
  prevList: WikiArticle[]
  curLabel: string
  prevLabel: string
  longDay: string
}) {
  const [view, setView] = useState<'wall' | 'table'>('wall')
  const top = articles.slice(0, WALL_SIZE)
  const shortPrev = prevLabel.split(',')[0]

  const { risers, fallers } = useMemo(() => {
    const both = articles.filter((a): a is Mover => a.prevRank != null && a.prevViews != null)
    const score = (a: Mover) => Math.log(a.prevRank / a.rank)
    const risers = both
      .filter((a) => a.rank <= 100 && a.prevRank > a.rank)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 10)
    const fallers = both
      .filter((a) => a.prevRank <= 100 && a.rank > a.prevRank)
      .sort((a, b) => score(a) - score(b))
      .slice(0, 10)
    return { risers, fallers }
  }, [articles])

  const newInTop = top.filter((a) => a.isNew).length
  const totalViews = list.reduce((s, a) => s + a.views, 0)
  const prevTotal = prevList.reduce((s, a) => s + a.views, 0)
  const lead = articles[0]

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4" aria-label="Most read articles">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="text-sm font-medium text-foreground">{longDay} (UTC)</span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-highlight" />
              New since {shortPrev}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="font-semibold text-foreground">
                ↑
              </span>
              Readers more than doubled
            </span>
            <span>Type size ∝ √readers</span>
          </div>
          <Segmented
            aria-label="Main view"
            value={view}
            onChange={setView}
            options={[
              { value: 'wall', label: 'Wall' },
              { value: 'table', label: 'Table' },
            ]}
          />
        </div>
        <Card className="px-6 py-7 sm:px-10 sm:py-10">
          {view === 'wall' ? <Wall articles={top} prevLabel={shortPrev} /> : <AttentionTable articles={articles.slice(0, 100)} prevLabel={shortPrev} />}
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Movers</CardTitle>
          <CardDescription>
            Biggest rank changes from {prevLabel} to {curLabel}, on a log rank scale so the top of the list gets the room it deserves.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: 'var(--series-1)' }} />
              Rising into the top 100
            </h3>
            <SlopePanel items={risers} color="var(--series-1)" prevLabel={shortPrev} curLabel={curLabel.split(',')[0]} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: 'var(--series-2)' }} />
              Falling out of the top 100
            </h3>
            <SlopePanel items={fallers} color="var(--series-2)" prevLabel={shortPrev} curLabel={curLabel.split(',')[0]} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Shape of attention</CardTitle>
            <CardDescription>Readers by rank, both axes logarithmic. A near-straight line is Zipf’s law: a few articles take most of the reading.</CardDescription>
          </CardHeader>
          <CardContent>
            <ShapeChart list={list} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>The day in three numbers</CardTitle>
            <CardDescription>Across the {list.length.toLocaleString()} most-read articles.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            <Figure value={compact.format(totalViews)} label="page views" note={prevTotal ? `${totalViews >= prevTotal ? '+' : '−'}${Math.abs(Math.round((totalViews / prevTotal - 1) * 100))}% vs ${shortPrev}` : undefined} />
            <Figure value={`${Math.round((lead.views / totalViews) * 1000) / 10}%`} label={`went to one article: ${lead.title}`} />
            <Figure value={String(newInTop)} label={`of the top ${WALL_SIZE} weren’t in ${shortPrev}’s top 1,000`} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Figure({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0">
      <span className="text-3xl font-semibold tracking-tight">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      {note && <span className="text-xs text-muted-foreground tabular-nums">{note}</span>}
    </div>
  )
}
