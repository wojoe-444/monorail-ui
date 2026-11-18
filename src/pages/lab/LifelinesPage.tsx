import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { Legend } from '@/components/charts/Legend'
import { StatTile } from '@/components/charts/StatTile'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { experiment } from '@/features/lab/catalog'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import { CountryDialog } from '@/features/lab/lifelines/CountryDialog'
import { LifeCell } from '@/features/lab/lifelines/LifeCell'
import { buildModel, scrub, useScrubYear, type Life, type Model } from '@/features/lab/lifelines/model'
import { LIFE_EXPECTANCY, type LifeData } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'
import { navigate, useSearchParams } from '@/lib/router'

/*
 * Lifelines: every country's life expectancy since 1960 as a small multiple,
 * all on one scale with the world line in each cell as the shared benchmark.
 * Hover any cell and every cell scrubs to the same year.
 */

type SortKey = 'gain' | 'latest' | 'shock' | 'name'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'gain', label: 'Gain since 1960' },
  { value: 'latest', label: 'Latest value' },
  { value: 'shock', label: 'Biggest shock' },
  { value: 'name', label: 'Alphabetical' },
]

const sorters: Record<SortKey, (a: Life, b: Life) => number> = {
  gain: (a, b) => b.gain - a.gain,
  latest: (a, b) => b.last - a.last,
  shock: (a, b) => b.maxShock - a.maxShock || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
}

const PATH = '/lab/lifelines'

export function LifelinesPage() {
  const exp = experiment('lifelines')
  const feed = useLiveData<Model>(LIFE_EXPECTANCY, { parse: (raw: LifeData) => buildModel(raw) })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Experiment" title={exp.title} description={exp.thesis} />
      <LoadGate feeds={[feed]} label="Loading 217 countries">
        {() => <Wall model={feed.data!} />}
      </LoadGate>
      <SourceLine
        source="World Bank · SP.DYN.LE00.IN, life expectancy at birth (snapshot)"
        href="https://data.worldbank.org/indicator/SP.DYN.LE00.IN"
        feeds={[feed]}
      />
    </div>
  )
}

function Wall({ model }: { model: Model }) {
  const [sort, setSort] = useState<SortKey>('gain')
  const [grouped, setGrouped] = useState(false)
  const [query, setQuery] = useState('')
  const selected = useSearchParams().get('country')
  const open = (iso3: string) => navigate(`${PATH}?country=${iso3}`)

  // Leaving the page drops any scrub so the next visit starts on the latest year.
  useEffect(() => () => scrub.set(null), [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return model.countries.filter((c) => !q || c.name.toLowerCase().includes(q)).sort(sorters[sort])
  }, [model, query, sort])

  const groups = useMemo(
    () =>
      grouped
        ? model.regions.map((r) => ({ region: r, items: visible.filter((c) => c.region === r) })).filter((g) => g.items.length)
        : [{ region: '', items: visible }],
    [grouped, model, visible],
  )

  const facts = useMemo(() => {
    const w0 = model.world[0]!
    const wi = model.world.findLastIndex((v) => v != null)
    const w1 = model.world[wi]!
    const best = [...model.countries].filter((c) => c.firstYear === model.y0).sort((a, b) => b.gain - a.gain)[0]
    const recent = model.countries.filter((c) => c.shocks.some((s) => s.year >= 2019)).length
    return { w0, w1, wYear: model.years[wi], best, recent }
  }, [model])

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="World life expectancy"
          value={`${facts.w1.toFixed(1)} yrs`}
          hint={`in ${facts.wYear}, +${(facts.w1 - facts.w0).toFixed(1)} since ${model.y0}`}
        />
        <StatTile label="Biggest gain since 1960" value={facts.best.name} hint={`${facts.best.first.toFixed(1)} → ${facts.best.last.toFixed(1)} years`} />
        <StatTile label="Shocks since 2019" value={String(facts.recent)} hint="countries that fell 3+ years in a year, mostly COVID-19" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ll-sort" className="text-xs text-muted-foreground">
              Sort by
            </Label>
            <NativeSelect id="ll-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-44">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ll-search" className="text-xs text-muted-foreground">
              Find a country
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="ll-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rwanda, Peru…" className="w-52 pl-8" />
            </div>
          </div>
          <div className="flex h-9 items-center gap-2">
            <Switch id="ll-group" checked={grouped} onCheckedChange={setGrouped} />
            <Label htmlFor="ll-group">Group by region</Label>
          </div>
          <ScrubReadout model={model} count={visible.length} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <Legend
            shape="line"
            items={[
              { key: 'c', label: 'Country', color: 'var(--series-1)' },
              { key: 'w', label: 'World average', color: 'var(--series-other)' },
            ]}
          />
          <span className="flex items-center gap-1.5 text-foreground/80">
            <span aria-hidden className="size-2 rounded-full bg-destructive" />
            Shock: fell 3+ years in one year
          </span>
          <span className="text-muted-foreground">Every chart: {model.y0}–{model.y1}, 10–90 years</span>
        </div>
      </div>

      <div className="flex flex-col gap-8" onPointerLeave={() => scrub.set(null)}>
        {groups.map((g) => (
          <section key={g.region || 'all'} className="flex flex-col gap-3" aria-label={g.region || 'All countries'}>
            {g.region && (
              <h2 className="flex items-baseline gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {g.region}
                <span className="font-normal tabular-nums">{g.items.length}</span>
              </h2>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
              {g.items.map((c) => (
                <LifeCell key={c.iso3} life={c} model={model} onOpen={open} />
              ))}
            </div>
          </section>
        ))}
        {visible.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No country matches “{query}”.</div>}
      </div>

      <CountryDialog life={model.countries.find((c) => c.iso3 === selected)} model={model} onClose={() => navigate(PATH)} />
    </>
  )
}

/** The shared year, big, while scrubbing; a hint otherwise. */
function ScrubReadout({ model, count }: { model: Model; count: number }) {
  const year = useScrubYear()
  return (
    <div className="ml-auto flex h-9 items-center gap-2 text-sm">
      {year === null ? (
        <span className="text-xs text-muted-foreground">
          Hover any chart to scrub all {count} to one year · showing {model.y1}
        </span>
      ) : (
        <>
          <span className="text-xs text-muted-foreground">All charts at</span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{year}</span>
        </>
      )}
    </div>
  )
}
