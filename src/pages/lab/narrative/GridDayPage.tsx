import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Table2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCarbonWindow, useGenerationDay } from '@/features/lab/feeds'
import { Num } from '@/features/lab/forecast/glyphs'
import { LoadGate } from '@/features/lab/LabKit'
import { DayChart, type Frame } from '@/features/lab/narrative/DayChart'
import { argMax, argMin, bestWindow, buildDay, GROUPS, lowCarbon, mean, share, type DaySlot } from '@/features/lab/narrative/gridday'
import { correlation, NarrativeHeader, ukClock, ukPartOfDay, ukWords } from '@/features/lab/narrative/kit'
import type { CarbonSlot } from '@/features/lab/sources'
import { href, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * One Day on the Grid: scrollytelling. Eight paragraphs, each computed from
 * the last 24 hours of the GB grid, scroll past one sticky chart; whichever
 * paragraph sits mid-screen sets the chart's span, focus and label. Step
 * buttons and j/k do the same without scrolling.
 */

interface Step {
  id: string
  kicker: string
  frame: Frame
  body: ReactNode
}

const label = (key: string) => GROUPS.find((g) => g.key === key)?.label.toLowerCase() ?? key
const pc = (v: number) => `${Math.round(v)}%`

export function GridDayPage() {
  const mix = useGenerationDay()
  const carbon = useCarbonWindow()
  return (
    <div className="flex flex-col gap-8">
      <NarrativeHeader id="grid-day" feeds={[mix, carbon]} href="https://carbonintensity.org.uk/" />
      <LoadGate feeds={[mix, carbon]} label="Replaying the last 24 hours of Britain’s grid">
        {() => <Story slots={buildDay(mix.data!, carbon.data!)} carbon={carbon.data!} />}
      </LoadGate>
    </div>
  )
}

function Story({ slots, carbon }: { slots: DaySlot[]; carbon: CarbonSlot[] }) {
  const steps = useMemo(() => buildSteps(slots, carbon), [slots, carbon])
  const [active, setActive] = useState(0)
  const [table, setTable] = useState(false)
  const refs = useRef<(HTMLElement | null)[]>([])
  const asked = Number(useSearchParams().get('step'))

  // The paragraph crossing the middle of the screen is the active one.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step))
      },
      { rootMargin: window.matchMedia('(min-width: 1024px)').matches ? '-45% 0px -45% 0px' : '-62% 0px -20% 0px' },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [steps.length])

  const go = (i: number) => {
    const k = Math.max(0, Math.min(steps.length - 1, i))
    setActive(k)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    refs.current[k]?.scrollIntoView({ block: window.matchMedia('(min-width: 1024px)').matches ? 'center' : 'start', behavior: reduced ? 'auto' : 'smooth' })
  }

  // ?step=4 opens the story at that paragraph (linkable).
  useEffect(() => {
    if (asked > 1) {
      const id = window.setTimeout(() => {
        setActive(Math.min(steps.length, asked) - 1)
        refs.current[Math.min(steps.length, asked) - 1]?.scrollIntoView({ block: window.matchMedia('(min-width: 1024px)').matches ? 'center' : 'start' })
      }, 50)
      return () => window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        go(active + 1)
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        go(active - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const step = steps[active]
  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* The sticky picture. On phones it pins under the top bar, compact. */}
        <div className="sticky top-10 z-[1] -mx-6 bg-background/95 px-6 pt-3 pb-3 backdrop-blur lg:top-18 lg:order-2 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <Card className="gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{step.kicker}</div>
                <div className="truncate text-xs text-muted-foreground">
                  Step {active + 1} of {steps.length} · {ukClock(slots[0].from)} yesterday to {ukClock(slots.at(-1)!.to)} today, UK time
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="size-8" aria-label="Previous step (k)" onClick={() => go(active - 1)} disabled={active === 0}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Next step (j)" onClick={() => go(active + 1)} disabled={active === steps.length - 1}>
                  <ArrowDown />
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <DayChart slots={slots} frame={step.frame} />
            </div>
            <div className="lg:hidden">
              <DayChart slots={slots} frame={step.frame} compact />
            </div>
            <ol className="flex gap-1" aria-label="Steps">
              {steps.map((s, i) => (
                <li key={s.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Step ${i + 1}: ${s.kicker}`}
                    aria-current={i === active ? 'step' : undefined}
                    className={cn('block h-1.5 w-full rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring', i === active ? 'bg-foreground' : i < active ? 'bg-foreground/35' : 'bg-muted')}
                  />
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* The prose. Each step is tall enough that scrolling moves one at a time. */}
        <div className="lg:order-1">
          {steps.map((s, i) => (
            <section
              key={s.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              data-step={i}
              className={cn(
                'flex min-h-[55vh] scroll-mt-80 flex-col justify-center py-10 transition-opacity duration-500 lg:min-h-[78vh] lg:scroll-mt-0',
                i === 0 && 'lg:min-h-[60vh] lg:justify-start lg:pt-4',
                i === steps.length - 1 && 'lg:min-h-[70vh]',
                i !== active && 'opacity-40',
              )}
            >
              <div className="mb-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{s.kicker}</div>
              <div className={cn('text-pretty', i === 0 ? 'text-xl leading-snug font-medium tracking-tight sm:text-2xl' : 'text-base leading-relaxed text-foreground/85 sm:text-[17px] sm:leading-8')}>
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setTable((t) => !t)} aria-expanded={table}>
          <Table2 />
          {table ? 'Hide the numbers' : 'Show every half hour'}
        </Button>
        {table && <Numbers slots={slots} />}
      </div>
    </div>
  )
}

function buildSteps(slots: DaySlot[], carbon: CarbonSlot[]): Step[] {
  const n = slots.length
  const all: [number, number] = [0, n - 1]
  const around = (i: number, r = 2): [number, number] => [Math.max(0, i - r), Math.min(n - 1, i + r)]
  const t = (i: number) => ukWords(slots[i].from)
  const g = (i: number) => (
    <Num tip={`${ukClock(slots[i].from)} UK: ${slots[i].intensity} gCO₂/kWh${slots[i].measured ? ' (measured)' : ' (forecast)'}`}>{slots[i].intensity} g</Num>
  )
  const sh = (i: number, key: string) => <Num tip={`${label(key)} at ${ukClock(slots[i].from)}: ${share(slots[i], key).toFixed(1)}% of generation`}>{pc(share(slots[i], key))}</Num>
  const avg = mean(slots.map((s) => s.intensity))
  const low = mean(slots.map(lowCarbon))
  const gasAvg = mean(slots.map((s) => share(s, 'gas')))
  const iMin = argMin(slots, (s) => s.intensity)
  const iMax = argMax(slots, (s) => s.intensity)
  const verdict = avg < 90 ? 'a clean day' : avg < 140 ? 'a middling day' : avg < 200 ? 'a gas-heavy day' : 'a dirty day'
  const topAt = (i: number) => GROUPS.reduce((b, gr) => (share(slots[i], gr.key) > share(slots[i], b.key) ? gr : b), GROUPS[0]).key
  const steps: Step[] = []

  // 1. The whole day.
  steps.push({
    id: 'day',
    kicker: 'The last 24 hours',
    frame: { span: all, focus: undefined },
    body: (
      <p>
        Over the last 24 hours, every kilowatt-hour on Britain’s grid carried{' '}
        <Num tip={`Mean of ${n} half-hours: ${avg.toFixed(1)} gCO₂/kWh`}>{Math.round(avg)} grams</Num> of CO₂ on average: {verdict}. Wind, solar, nuclear and hydro supplied{' '}
        <Num tip={`Mean low-carbon share: ${low.toFixed(1)}%`}>{pc(low)}</Num> of the power, gas <Num tip={`Mean gas share: ${gasAvg.toFixed(1)}%`}>{pc(gasAvg)}</Num>. Here is that day, half an
        hour at a time.
      </p>
    ),
  })

  // 2. Cleanest moment.
  const cleanTop = topAt(iMin)
  steps.push({
    id: 'cleanest',
    kicker: 'The cleanest half hour',
    frame: { span: around(iMin), focus: cleanTop, note: { i: iMin, text: `cleanest · ${slots[iMin].intensity} g` } },
    body: (
      <p>
        The cleanest moment came at <Num tip={`${ukClock(slots[iMin].from)}–${ukClock(slots[iMin].to)} UK`}>{t(iMin)}</Num>, {ukPartOfDay(slots[iMin].from)}, when each kilowatt-hour carried just {g(iMin)}.{' '}
        {cleanTop === 'gas' ? (
          <>Even then gas was the biggest source, at {sh(iMin, 'gas')}.</>
        ) : (
          <>
            {label(cleanTop)[0].toUpperCase() + label(cleanTop).slice(1)} was doing the heavy lifting at {sh(iMin, cleanTop)}, with gas down to {sh(iMin, 'gas')}.
          </>
        )}
      </p>
    ),
  })

  // 3. Dirtiest moment.
  const ratio = slots[iMax].intensity / Math.max(1, slots[iMin].intensity)
  const windDrop = share(slots[iMin], 'wind') - share(slots[iMax], 'wind')
  steps.push({
    id: 'dirtiest',
    kicker: 'The dirtiest half hour',
    frame: { span: around(iMax), focus: 'gas', note: { i: iMax, text: `dirtiest · ${slots[iMax].intensity} g` } },
    body: (
      <p>
        The dirtiest came at <Num tip={`${ukClock(slots[iMax].from)}–${ukClock(slots[iMax].to)} UK`}>{t(iMax)}</Num>: {g(iMax)},{' '}
        <Num tip={`${slots[iMax].intensity} ÷ ${slots[iMin].intensity}`}>{ratio >= 1.95 ? `${ratio.toFixed(1)} times` : `${Math.round((ratio - 1) * 100)}% more than`}</Num>{' '}
        {ratio >= 1.95 ? 'the cleanest' : 'the cleanest moment'}. Gas supplied {sh(iMax, 'gas')} then
        {windDrop >= 8 ? <>, as wind fell from {sh(iMin, 'wind')} to {sh(iMax, 'wind')}</> : null}.
      </p>
    ),
  })

  // 4. Wind.
  const wind = slots.map((s) => share(s, 'wind'))
  const iWindHi = argMax(wind, (v) => v)
  const iWindLo = argMin(wind, (v) => v)
  const ledHalfHours = slots.filter((_, i) => topAt(i) === 'wind').length
  const windStart = wind[0]
  const windEnd = wind[n - 1]
  steps.push({
    id: 'wind',
    kicker: 'Wind',
    frame: { span: around(iWindHi, 6), focus: 'wind', note: { i: iWindHi, text: `wind peaks · ${pc(wind[iWindHi])}` } },
    body: (
      <p>
        {wind[iWindHi] >= 35 ? (
          <>
            Wind was the biggest single source for <Num tip={`${ledHalfHours} of ${n} half-hours`}>{ledHalfHours / 2} hours</Num> of the day, peaking at {sh(iWindHi, 'wind')} at {t(iWindHi)}.
          </>
        ) : wind[iWindHi] >= 15 ? (
          <>
            Wind had a modest day, never supplying more than {sh(iWindHi, 'wind')} (at {t(iWindHi)}) and dropping as low as {sh(iWindLo, 'wind')} at {t(iWindLo)}.
          </>
        ) : (
          <>Wind barely turned up: it never supplied more than {sh(iWindHi, 'wind')}.</>
        )}{' '}
        {Math.abs(windEnd - windStart) < 4 ? (
          <>It ended about where it began.</>
        ) : (
          <>
            It ended the day {windEnd > windStart ? 'stronger' : 'weaker'} than it started, <Num tip={`wind share at ${ukClock(slots[0].from)}: ${windStart.toFixed(1)}%`}>{pc(windStart)}</Num> →{' '}
            <Num tip={`wind share at ${ukClock(slots[n - 1].from)}: ${windEnd.toFixed(1)}%`}>{pc(windEnd)}</Num>.
          </>
        )}
      </p>
    ),
  })

  // 5. Solar.
  const solar = slots.map((s) => share(s, 'solar'))
  const iSun = argMax(solar, (v) => v)
  const lit = solar.map((v, i) => (v >= 0.5 ? i : -1)).filter((i) => i >= 0)
  const month = new Date(slots[0].from).getUTCMonth()
  const winter = month >= 9 || month <= 2
  steps.push({
    id: 'solar',
    kicker: 'Solar',
    frame: { span: lit.length ? [lit[0], lit.at(-1)!] : all, focus: 'solar', note: solar[iSun] >= 1 ? { i: iSun, text: `solar peaks · ${pc(solar[iSun])}` } : undefined },
    body:
      solar[iSun] < 1 ? (
        <p>
          Solar barely showed up: under <Num tip={`Peak solar share: ${solar[iSun].toFixed(1)}%`}>1%</Num> all day.
        </p>
      ) : (
        <p>
          Solar’s window opened around <Num tip={`First half-hour at 0.5% or more`}>{t(lit[0])}</Num> and closed by <Num tip="Last half-hour at 0.5% or more">{ukWords(slots[lit.at(-1)!].to)}</Num>. At its best, {t(iSun)}, it
          supplied {sh(iSun, 'solar')}
          {solar[iSun] < 8 && winter ? <>: a low winter sun doesn’t get far.</> : solar[iSun] >= 20 ? <>, a big share for a grid this far north.</> : <>.</>}
        </p>
      ),
  })

  // 6. Gas as the swing.
  const gas = slots.map((s) => share(s, 'gas'))
  const r = correlation(
    gas,
    slots.map((s) => s.intensity),
  )
  const iGasLo = argMin(gas, (v) => v)
  const iGasHi = argMax(gas, (v) => v)
  steps.push({
    id: 'gas',
    kicker: 'Gas, the swing',
    frame: { span: [Math.min(iGasLo, iGasHi), Math.max(iGasLo, iGasHi)], focus: 'gas', note: { i: iGasHi, text: `gas · ${pc(gas[iGasHi])}` } },
    body: (
      <p>
        {r >= 0.8 ? (
          <>
            Gas set the pace. Its share and the grid’s carbon moved almost in lockstep (<Num tip="Pearson correlation of gas share and intensity, 48 half-hours">r = {r.toFixed(2)}</Num>):{' '}
          </>
        ) : r >= 0.5 ? (
          <>
            Gas did much of the moving (<Num tip="Pearson correlation of gas share and intensity">r = {r.toFixed(2)}</Num>):{' '}
          </>
        ) : (
          <>
            Gas wasn’t the whole story today (<Num tip="Pearson correlation of gas share and intensity">r = {r.toFixed(2)}</Num>), but it still swung:{' '}
          </>
        )}
        from {sh(iGasLo, 'gas')} at {t(iGasLo)} to {sh(iGasHi, 'gas')} at {t(iGasHi)}. {r >= 0.5 ? <>When gas rose, intensity rose with it.</> : <>Imports and biomass filled more of the gaps.</>}
      </p>
    ),
  })

  // 7. The steady ones.
  const nuc = slots.map((s) => share(s, 'nuclear'))
  const imp = slots.map((s) => share(s, 'imports'))
  const iImpHi = argMax(imp, (v) => v)
  steps.push({
    id: 'steady',
    kicker: 'The floor',
    frame: { span: all, focus: 'nuclear' },
    body: (
      <p>
        Nuclear barely moved, between <Num tip={`Min nuclear share: ${Math.min(...nuc).toFixed(1)}%`}>{pc(Math.min(...nuc))}</Num> and{' '}
        <Num tip={`Max nuclear share: ${Math.max(...nuc).toFixed(1)}%`}>{pc(Math.max(...nuc))}</Num> all day: the floor everything else stands on. Imports from the continent and Norway covered{' '}
        <Num tip={`Mean imports share: ${mean(imp).toFixed(1)}%`}>{pc(mean(imp))}</Num> on average, most at {t(iImpHi)} ({sh(iImpHi, 'imports')}).
      </p>
    ),
  })

  // 8. What comes next.
  const now = Date.now()
  const ahead = carbon.filter((c) => c.from >= now).slice(0, 48)
  const nextAvg = mean(ahead.map((c) => c.forecast))
  const delta = (nextAvg - avg) / avg
  const best = bestWindow(ahead, 6)
  steps.push({
    id: 'next',
    kicker: 'Tomorrow, forecast',
    frame: { span: [n - 3, n - 1], focus: 'intensity', note: { i: n - 1, text: `now · ${slots[n - 1].intensity} g` } },
    body: ahead.length ? (
      <p>
        The next 24 hours look{' '}
        {Math.abs(delta) < 0.05 ? (
          <>much the same</>
        ) : (
          <>
            <Num tip={`Forecast mean ${nextAvg.toFixed(1)} vs past mean ${avg.toFixed(1)} gCO₂/kWh`}>
              {Math.round(Math.abs(delta) * 100)}% {delta < 0 ? 'cleaner' : 'dirtier'}
            </Num>
          </>
        )}
        , averaging <Num tip={`Mean of ${ahead.length} forecast half-hours`}>{Math.round(nextAvg)} g</Num>.
        {best && (
          <>
            {' '}
            The best three hours start at <Num tip={`${ukClock(best.start)}–${ukClock(best.end)} UK, mean forecast ${best.avg.toFixed(0)} g`}>{ukWords(best.start)}</Num>. For a plan built
            around that, see{' '}
            <a href={href('/lab/grid-clock')} className="font-medium text-foreground underline underline-offset-4">
              Grid Clock
            </a>
            .
          </>
        )}
      </p>
    ) : (
      <p>The forecast for the next 24 hours hasn’t been published yet.</p>
    ),
  })

  return steps
}

function Numbers({ slots }: { slots: DaySlot[] }) {
  return (
    <div className="max-h-[60vh] overflow-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">UK time</th>
            <th className="px-3 py-2 text-right font-medium">gCO₂/kWh</th>
            {GROUPS.map((g) => (
              <th key={g.key} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                {g.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {slots.map((s) => (
            <tr key={s.from}>
              <td className="px-3 py-1.5 tabular-nums">{ukClock(s.from)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {s.intensity}
                {!s.measured && <span className="text-muted-foreground">*</span>}
              </td>
              {GROUPS.map((g) => (
                <td key={g.key} className="px-3 py-1.5 text-right tabular-nums">
                  {(s.groups[g.key] ?? 0).toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">* forecast; not yet measured. Shares are percent of generation.</div>
    </div>
  )
}
