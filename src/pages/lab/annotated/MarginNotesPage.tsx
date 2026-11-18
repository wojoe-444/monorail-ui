import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { co2View, gridView, wikiView, type DatasetView } from '@/features/lab/annotated/notes/datasets'
import { KIND_LABEL, type Pt } from '@/features/lab/annotated/notes/engine'
import { MarginChart } from '@/features/lab/annotated/notes/MarginChart'
import { experiment } from '@/features/lab/catalog'
import { useCarbonWindow, useWikiLatest } from '@/features/lab/feeds'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import { CO2_MONTHLY, parseCo2, wikiArticleDailyUrl, type Co2Month } from '@/features/lab/sources'
import { useLiveData, useNow, type LiveData } from '@/features/lab/useLiveData'
import { navigate, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Margin Notes: a line chart that annotates itself. The engine runs a set of
 * plain detectors over the series, scores what it finds, writes each finding
 * as a sentence and lays the notes out in the margins. The detail control
 * shows the ranking at work: 3 notes, 8, or everything the engine found.
 */

const EXP = experiment('margin-notes')
type DataId = 'co2' | 'grid' | 'wiki'
type Detail = '3' | '8' | 'all'
const PATH = '/lab/annotated/margin-notes'

const DATASETS: { value: DataId; label: string; short: string }[] = [
  { value: 'co2', label: 'CO₂ since 1958', short: 'CO₂' },
  { value: 'grid', label: 'GB grid, 48h', short: 'Grid' },
  { value: 'wiki', label: 'Wikipedia, 60 days', short: 'Wiki' },
]

export function MarginNotesPage() {
  const params = useSearchParams()
  const data = (['co2', 'grid', 'wiki'].includes(params.get('data') ?? '') ? params.get('data') : 'co2') as DataId
  const detail = (['3', '8', 'all'].includes(params.get('detail') ?? '') ? params.get('detail') : '8') as Detail
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    navigate(`${PATH}?${next}`)
  }

  const co2 = useLiveData<Co2Month[]>(data === 'co2' ? CO2_MONTHLY : null, { as: 'text', parse: parseCo2, key: 'feed:co2' })
  const grid = useCarbonWindow()
  const top = useWikiLatest()
  const candidates = useMemo(() => (top.data?.articles ?? []).slice(0, 12), [top.data])
  const article = params.get('article') ?? candidates[0]?.article ?? null
  const daily = useLiveData<Pt[]>(data === 'wiki' && article ? wikiArticleDailyUrl(article, 60) : null, {
    key: `annotated:wiki-daily:${article}`,
    parse: (r: { items: { timestamp: string; views: number }[] }) =>
      r.items.map((it) => ({
        t: Date.UTC(+it.timestamp.slice(0, 4), +it.timestamp.slice(4, 6) - 1, +it.timestamp.slice(6, 8)),
        v: it.views,
      })),
  })

  const feeds: LiveData<unknown>[] = data === 'co2' ? [co2] : data === 'grid' ? [grid] : [top, daily]
  const source =
    data === 'co2' ? 'NOAA GML · Mauna Loa CO₂, monthly' : data === 'grid' ? 'NESO Carbon Intensity API · GB, half-hourly' : 'Wikimedia · daily pageviews by people (bots and crawlers excluded)'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment · annotated" title={EXP.title} description={EXP.thesis} />
        <SourceLine source={source} feeds={feeds} />
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" id="mn-data">
            Series
          </span>
          <Segmented<DataId>
            aria-label="Series"
            value={data}
            onChange={(v) => set('data', v)}
            options={DATASETS.map((d) => ({ value: d.value, label: d.label }))}
            className="hidden sm:inline-flex"
          />
          <Segmented<DataId> aria-label="Series" value={data} onChange={(v) => set('data', v)} options={DATASETS.map((d) => ({ value: d.value, label: d.short }))} className="sm:hidden" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Notes</span>
          <Segmented<Detail>
            aria-label="How many notes"
            value={detail}
            onChange={(v) => set('detail', v)}
            options={[
              { value: '3', label: 'Top 3' },
              { value: '8', label: 'Top 8' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
        {data === 'wiki' && candidates.length > 0 && (
          <div className="flex w-64 flex-col gap-1.5">
            <Label htmlFor="mn-article">Article (yesterday’s top 12)</Label>
            <NativeSelect id="mn-article" value={article ?? ''} onChange={(e) => set('article', e.target.value)}>
              {candidates.map((a) => (
                <option key={a.article} value={a.article}>
                  #{a.rank} {a.title}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </div>

      <LoadGate key={data} feeds={feeds} label="Reading the series">
        {() => {
          if (data === 'co2') return <Notes view={co2View(co2.data!)} detail={detail} />
          if (data === 'grid') return <GridNotes slots={grid.data!} detail={detail} />
          return daily.data ? <Notes view={wikiView(daily.data, (article ?? '').replace(/_/g, ' '))} detail={detail} /> : null
        }}
      </LoadGate>
    </div>
  )
}

function GridNotes({ slots, detail }: { slots: NonNullable<ReturnType<typeof useCarbonWindow>['data']>; detail: Detail }) {
  const now = useNow(60_000)
  const view = useMemo(() => gridView(slots, now), [slots, now])
  return <Notes view={view} detail={detail} />
}

function Notes({ view, detail }: { view: DatasetView; detail: Detail }) {
  const [active, setActive] = useState<string | null>(null)
  const k = detail === 'all' ? Infinity : +detail
  const counts = view.notes.reduce<Record<string, number>>((m, n) => ((m[KIND_LABEL[n.kind]] = (m[KIND_LABEL[n.kind]] ?? 0) + 1), m), {})
  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-0 px-2 py-4 sm:px-4">
        <div className="mb-1 px-2 text-xs text-muted-foreground">{view.yLabel}</div>
        <MarginChart view={view} detail={k} active={active} onActive={setActive} />
      </Card>
      <Card className="gap-3 px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Everything the engine found, by importance</h2>
          <p className="text-xs text-muted-foreground">
            {view.notes.length} notes · {Object.entries(counts)
              .map(([kind, n]) => `${n} ${kind}`)
              .join(' · ')}
          </p>
        </div>
        <ol className="flex flex-col divide-y">
          {view.notes.map((n) => {
            const shown = (n.rank ?? 99) <= k
            return (
              <li
                key={n.id}
                className={cn('flex gap-3 py-2.5 text-sm transition-colors', active === n.id && 'bg-accent/60', !shown && 'opacity-55')}
                onPointerEnter={() => setActive(n.id)}
                onPointerLeave={() => setActive(null)}
              >
                <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">{n.rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{n.title}.</span> <span className="text-muted-foreground">{n.text}</span>
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {KIND_LABEL[n.kind]} · {Math.round(n.importance * 100)}
                  {!shown && ' · hidden at this detail'}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="text-xs text-muted-foreground">
          The detectors: extremes, the steepest run over a window, change points in the mean (binary segmentation), spikes against a rolling median, first
          threshold crossings, forecast misses and category changes. Each finding gets a score; two notes about the same moment keep only the stronger.
        </p>
      </Card>
    </div>
  )
}
