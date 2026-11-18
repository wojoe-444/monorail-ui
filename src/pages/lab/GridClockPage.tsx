import { useMemo, useState } from 'react'
import { Table2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { experiment } from '@/features/lab/catalog'
import { Dial, rampFill } from '@/features/lab/gridclock/Dial'
import { MixBar } from '@/features/lab/gridclock/MixBar'
import { PastChart } from '@/features/lab/gridclock/PastChart'
import { indexVariant, sentenceCase, ukDayTime, ukTime, windows } from '@/features/lab/gridclock/util'
import { LoadGate, SourceLine, useToggle } from '@/features/lab/LabKit'
import {
  CARBON_GENERATION,
  CARBON_REGIONAL,
  carbonWindowUrl,
  parseCarbon,
  parseGeneration,
  parseRegional,
  type CarbonRegion,
  type CarbonSlot,
} from '@/features/lab/sources'
import { useLiveData, useNow } from '@/features/lab/useLiveData'

const EXP = experiment('grid-clock')

const APPLIANCES = {
  kettle: { label: 'Kettle 1h', noun: 'boil the kettle', slots: 2 },
  dishwasher: { label: 'Dishwasher 3h', noun: 'run the dishwasher', slots: 6 },
  ev: { label: 'EV 6h', noun: 'charge the car', slots: 12 },
} as const
type Appliance = keyof typeof APPLIANCES

export function GridClockPage() {
  // The window URL rounds to the half hour, so it only changes (and refetches) twice an hour.
  const now = useNow(60_000)
  const windowUrl = useMemo(() => carbonWindowUrl(new Date(Math.floor(now / 1_800_000) * 1_800_000)), [now])
  const intensity = useLiveData(windowUrl, { parse: parseCarbon, refreshMs: 10 * 60_000 })
  const generation = useLiveData(CARBON_GENERATION, { parse: parseGeneration, refreshMs: 10 * 60_000 })
  const regional = useLiveData(CARBON_REGIONAL, { parse: parseRegional, refreshMs: 10 * 60_000 })
  const feeds = [intensity, generation, regional]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />
        <SourceLine source={EXP.source} href="https://carbonintensity.org.uk/" feeds={feeds} />
      </div>
      <LoadGate feeds={feeds} label="Asking the National Grid">
        {() => <GridClock slots={intensity.data!} mix={generation.data!.mix} regions={regional.data!} now={now} />}
      </LoadGate>
    </div>
  )
}

function GridClock({ slots, mix, regions, now }: { slots: CarbonSlot[]; mix: { fuel: string; perc: number }[]; regions: CarbonRegion[]; now: number }) {
  const [appliance, setAppliance] = useState<Appliance>('dishwasher')
  const [showTable, toggleTable] = useToggle()

  const curIdx = Math.max(0, slots.findIndex((s) => s.from <= now && now < s.to))
  const current = slots[curIdx]
  const next24 = slots.slice(curIdx, curIdx + 48)
  const past = slots.slice(Math.max(0, curIdx - 48), curIdx + 1).filter((s) => s.actual !== null)
  const nowValue = current.actual ?? current.forecast

  const a = APPLIANCES[appliance]
  const w = windows(next24, a.slots)
  const best = w?.best
  const worst = w?.worst
  const saving = best ? 1 - best.mean / nowValue : 0
  const startsNow = best?.i === 0

  return (
    <>
      {/* The answer, before any chart. */}
      <section className="flex flex-col gap-5">
        <p className="max-w-4xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
          {best && startsNow ? (
            <>
              Right now is the cleanest time to {a.noun} in the next 24 hours.{' '}
              <span className="text-muted-foreground">Go ahead.</span>
            </>
          ) : best && saving < 0.05 ? (
            <>
              Today it barely matters when you {a.noun}:{' '}
              <span className="text-muted-foreground">
                the best window, {ukTime(best.start)}–{ukTime(best.end)}, is only {Math.max(0, Math.round(saving * 100))}% cleaner than now.
              </span>
            </>
          ) : best ? (
            <>
              The cleanest time to {a.noun} is <span className="text-primary">{ukTime(best.start)}–{ukTime(best.end)}</span>,{' '}
              <span className="text-muted-foreground">{Math.round(saving * 100)}% cleaner than now.</span>
            </>
          ) : (
            'Not enough forecast to recommend a window.'
          )}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="max-w-full overflow-x-auto">
            <Segmented
              aria-label="Appliance run time"
              value={appliance}
              onChange={setAppliance}
              options={(Object.keys(APPLIANCES) as Appliance[]).map((k) => ({ value: k, label: APPLIANCES[k].label }))}
            />
          </div>
          {best && worst && (
            <p className="text-sm text-muted-foreground">
              {startsNow ? (
                <>
                  The next {a.slots / 2 === 1 ? 'hour' : `${a.slots / 2} hours`} average{' '}
                  <span className="font-semibold text-foreground tabular-nums">{Math.round(best.mean)} g</span> CO₂/kWh. Avoid{' '}
                </>
              ) : (
                <>
                  That window averages <span className="font-semibold text-foreground tabular-nums">{Math.round(best.mean)} g</span> CO₂/kWh against{' '}
                  <span className="font-semibold text-foreground tabular-nums">{nowValue} g</span> now. Avoid{' '}
                </>
              )}
              <span className="font-semibold text-foreground tabular-nums">
                {ukTime(worst.start)}–{ukTime(worst.end)}
              </span>{' '}
              at <span className="font-semibold text-foreground tabular-nums">{Math.round(worst.mean)} g</span>.
            </p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>The next 24 hours</CardTitle>
            <CardDescription>Each spoke is half an hour, at its place on a 24-hour clock in UK time. Longer and darker means dirtier power.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={toggleTable} aria-pressed={showTable}>
                <Table2 />
                {showTable ? 'Hide table' : 'Table'}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center gap-4">
            <div className="mx-auto w-full max-w-[560px]">
              <Dial slots={next24} now={now} best={best} current={nowValue} index={current.index} />
            </div>
            <RampLegend slots={next24} />
            {showTable && <SlotTable slots={slots} now={now} />}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Where the power comes from</CardTitle>
              <CardDescription>Generation mix for the current half hour.</CardDescription>
            </CardHeader>
            <CardContent>
              <MixBar mix={mix} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>How good is the forecast?</CardTitle>
              <CardDescription>Past 24 hours, gCO₂/kWh.</CardDescription>
            </CardHeader>
            <CardContent>
              <PastChart slots={past} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Regions regions={regions} />
    </>
  )
}

function RampLegend({ slots }: { slots: CarbonSlot[] }) {
  const vals = slots.map((s) => s.forecast)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="tabular-nums">{min}</span>
        <span className="flex h-2 w-32 overflow-hidden rounded-full" aria-hidden>
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="flex-1" style={{ background: rampFill(i / 15) }} />
          ))}
        </span>
        <span className="tabular-nums">{max} gCO₂/kWh</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-1 w-5 rounded-full bg-primary" aria-hidden />
        recommended window
      </div>
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-5 rounded-full bg-foreground" aria-hidden />
        now
      </div>
    </div>
  )
}

function SlotTable({ slots, now }: { slots: CarbonSlot[]; now: number }) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Half hour (UK)</th>
            <th className="px-3 py-2 text-right font-medium">Forecast</th>
            <th className="px-3 py-2 text-right font-medium">Actual</th>
            <th className="px-3 py-2 text-left font-medium">Index</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {slots.map((s) => {
            const isNow = s.from <= now && now < s.to
            return (
              <tr key={s.from} className={isNow ? 'bg-primary-soft text-primary-soft-foreground' : undefined}>
                <td className="px-3 py-1.5 tabular-nums">
                  {ukDayTime(s.from)}
                  {isNow && <span className="ml-2 text-xs font-medium">now</span>}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{s.forecast}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{s.actual ?? '—'}</td>
                <td className="px-3 py-1.5">{sentenceCase(s.index)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Regions({ regions }: { regions: CarbonRegion[] }) {
  // Ids 1–14 are the distribution regions; 15–18 are country and GB aggregates.
  const list = regions.filter((r) => r.id <= 14).sort((a, b) => a.forecast - b.forecast)
  const gb = regions.find((r) => r.id === 18)
  const max = Math.max(...list.map((r) => r.forecast), 1)
  const half = Math.ceil(list.length / 2)
  const cols = [list.slice(0, half), list.slice(half)]
  const spread = list.length ? list[list.length - 1].forecast - list[0].forecast : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Same moment, fourteen grids</CardTitle>
        <CardDescription>
          Intensity right now by distribution region, cleanest first.{' '}
          {list.length > 1 && (
            <>
              {list[0].name} is running on{' '}
              <span className="font-semibold text-foreground tabular-nums">{list[0].forecast} g</span>, {list[list.length - 1].name} on{' '}
              <span className="font-semibold text-foreground tabular-nums">{list[list.length - 1].forecast} g</span>
              {spread > 0 && <> — a {spread} g spread</>}
              {gb && <>; Britain overall is {gb.forecast} g</>}.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {cols.map((col, ci) => (
            <ol key={ci} className="flex flex-col" start={ci * half + 1}>
              {col.map((r, i) => (
                <li key={r.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_2.5rem] items-center gap-x-3 py-2 sm:grid-cols-[1.5rem_minmax(0,1fr)_2.5rem_5.5rem]">
                  <span className="text-xs text-muted-foreground tabular-nums">{ci * half + i + 1}</span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm">{r.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground sm:hidden">{sentenceCase(r.index)}</span>
                    </span>
                    <span
                      className="h-1.5 rounded-r-[4px]"
                      style={{ width: `${Math.max(1, (r.forecast / max) * 100)}%`, background: 'var(--series-1)' }}
                      aria-hidden
                    />
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums">{r.forecast}</span>
                  <Badge variant={indexVariant(r.index)} className="hidden justify-self-end sm:inline-flex">
                    {sentenceCase(r.index)}
                  </Badge>
                </li>
              ))}
            </ol>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
