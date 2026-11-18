import { useMemo, type ReactNode } from 'react'
import { Shuffle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Num } from '@/features/lab/forecast/glyphs'
import { InlineTrend } from '@/features/lab/narrative/glyphs'
import { LoadGate } from '@/features/lab/LabKit'
import {
  CODES,
  META,
  ProseName,
  buildModel,
  displayName,
  fact,
  mostLike,
  proseName,
  regionWord,
  standout,
  yearReached,
  type Fact,
  type Model,
} from '@/features/lab/narrative/country'
import { DotStrip } from '@/features/lab/narrative/DotStrip'
import { NarrativeHeader, Row, joinList, ordinal } from '@/features/lab/narrative/kit'
import { LIFE_EXPECTANCY, WORLD_INDICATORS, type IndicatorCode, type IndicatorCountry, type LifeData, type WorldIndicators } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'
import { href, navigate, useSearchParams } from '@/lib/router'

/*
 * Country, Written: an encyclopedia entry composed from the World Bank
 * snapshot. Every sentence is a comparison (with the region, the median
 * country, the year 2000); the sidenotes place the number among all
 * countries; the infobox is the exact-values table.
 */

const DEFAULT = 'KEN'
const PATH = '/lab/narrative/country'

export function CountryPage() {
  const data = useLiveData<WorldIndicators>(WORLD_INDICATORS)
  const life = useLiveData<LifeData>(LIFE_EXPECTANCY, { key: 'feed:life' })
  const iso = useSearchParams().get('country')?.toUpperCase() ?? DEFAULT
  const model = useMemo(() => (data.data ? buildModel(data.data) : undefined), [data.data])
  return (
    <div className="flex flex-col gap-8">
      <NarrativeHeader id="country" feeds={[data, life]} href="https://databank.worldbank.org/source/world-development-indicators" />
      <LoadGate feeds={[data]} label="Opening the World Bank’s ledger">
        {() => {
          const c = model!.byIso.get(iso) ?? model!.byIso.get(DEFAULT)!
          return (
            <>
              <Picker model={model!} current={c} />
              <Article key={c.iso3} m={model!} c={c} life={life.data} />
            </>
          )
        }}
      </LoadGate>
    </div>
  )
}

function Picker({ model, current }: { model: Model; current: IndicatorCountry }) {
  const list = useMemo(() => [...model.data.countries].sort((a, b) => displayName(a.name).localeCompare(displayName(b.name))), [model])
  const go = (iso: string) => navigate(`${PATH}?country=${iso}`)
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex w-72 flex-col gap-1.5">
        <Label htmlFor="country-pick">Country</Label>
        <Input
          id="country-pick"
          list="country-list"
          key={current.iso3}
          defaultValue={displayName(current.name)}
          placeholder="Type a country"
          onChange={(e) => {
            const hit = list.find((c) => displayName(c.name).toLowerCase() === e.target.value.trim().toLowerCase())
            if (hit) go(hit.iso3)
          }}
          onFocus={(e) => e.currentTarget.select()}
        />
        <datalist id="country-list">
          {list.map((c) => (
            <option key={c.iso3} value={displayName(c.name)} />
          ))}
        </datalist>
      </div>
      <Button variant="outline" onClick={() => go(list[Math.floor(Math.random() * list.length)].iso3)}>
        <Shuffle />
        Another country
      </Button>
    </div>
  )
}

function Article({ m, c, life }: { m: Model; c: IndicatorCountry; life?: LifeData }) {
  const F = Object.fromEntries(CODES.map((code) => [code, fact(m, c, code)])) as Record<IndicatorCode, Fact | undefined>
  const name = proseName(c.name)
  const Name = ProseName(c.name)
  const region = regionWord(c.region)
  const regionSet = useMemo(() => new Set(m.data.countries.filter((o) => o.region === c.region).map((o) => o.iso3)), [m, c])
  const strip = (code: IndicatorCode, caption: string) => {
    const vals = m.data.countries.flatMap((o) => {
      const l = m.latestBy[code].get(o.iso3)
      return l ? [{ iso: o.iso3, name: displayName(o.name), value: l[1] }] : []
    })
    return F[code] ? <DotStrip values={vals} mine={c.iso3} region={regionSet} fmt={META[code].fmt} log={META[code].log} caption={caption} name={displayName(c.name)} /> : undefined
  }
  const n = (code: IndicatorCode, text?: ReactNode) => {
    const f = F[code]!
    return (
      <Num tip={`World Bank ${code}, ${f.year}: ${f.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}>{text ?? META[code].fmt(f.value)}</Num>
    )
  }
  const spark = (code: IndicatorCode) => {
    const f = F[code]
    if (!f || f.series.length < 4) return null
    return (
      <InlineTrend
        points={f.series.map((p) => ({ label: String(p.year), value: p.value, text: META[code].fmt(p.value) }))}
        summary={`${META[code].label}, ${f.series[0].year}–${f.year}`}
      />
    )
  }
  const yr = (f: Fact) => (f.year < new Date().getFullYear() - 3 ? <span className="text-muted-foreground"> (as of {f.year})</span> : null)

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-1 lg:pl-[calc(7rem+2.5rem)]">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{displayName(c.name)}</h2>
        <p className="text-sm text-muted-foreground">
          {c.region} · {c.income}
        </p>
      </header>

      <Row kicker="In brief" lede note={<Infobox F={F} />}>
        <Lede m={m} c={c} F={F} life={life} Name={Name} region={region} n={n} />
      </Row>

      {F['SP.POP.TOTL'] && (
        <Row kicker="People" note={strip('SP.DYN.TFRT.IN', 'Births per woman, every country')}>
          <People F={F} name={name} Name={Name} region={region} n={n} spark={spark} yr={yr} />
        </Row>
      )}

      {F['SP.DYN.LE00.IN'] && (
        <Row kicker="Health" note={strip('SP.DYN.LE00.IN', 'Life expectancy at birth, every country')}>
          <Health F={F} name={name} region={region} life={life} n={n} spark={spark} yr={yr} />
        </Row>
      )}

      {F['NY.GDP.PCAP.CD'] && (
        <Row kicker="Money" note={strip('NY.GDP.PCAP.CD', 'GDP per person, every country')}>
          <Money F={F} name={name} Name={Name} region={region} n={n} spark={spark} yr={yr} />
        </Row>
      )}

      {(F['EG.ELC.ACCS.ZS'] || F['EN.GHG.CO2.PC.CE.AR5']) && (
        <Row kicker="Energy" note={strip('EN.GHG.CO2.PC.CE.AR5', 'CO₂ per person, every country')}>
          <Energy F={F} name={name} Name={Name} n={n} spark={spark} yr={yr} />
        </Row>
      )}

      {F['IT.NET.USER.ZS'] && (
        <Row kicker="Online" note={strip('IT.NET.USER.ZS', 'Share of people online, every country')}>
          <Online F={F} name={name} Name={Name} region={region} n={n} spark={spark} yr={yr} />
        </Row>
      )}

      <Row kicker="Kin">
        <Kin m={m} c={c} Name={Name} region={region} />
      </Row>
    </article>
  )
}

type N = (code: IndicatorCode, text?: ReactNode) => ReactNode
type Spark = (code: IndicatorCode) => ReactNode
type Yr = (f: Fact) => ReactNode

/** "the 5th highest of 210" / "the highest of 210" / "the lowest of 210" */
function rankWords(f: Fact, high = 'highest', low = 'lowest'): ReactNode {
  const fromBottom = f.of - f.rank + 1
  const text =
    f.rank === 1
      ? `the ${high} of ${f.of}`
      : fromBottom === 1
        ? `the ${low} of ${f.of}`
        : f.rank <= f.of / 2
          ? `${ordinal(f.rank)} ${high} of ${f.of}`
          : `${ordinal(fromBottom)} ${low} of ${f.of}`
  return <Num tip={`Rank ${f.rank} of ${f.of} countries with a ${f.year >= 2000 ? 'recent ' : ''}figure (1 = highest)`}>{text}</Num>
}

/** "2.1 times" / "about the same as" / "40% below" a reference. */
function versus(v: number, ref: number, refName: string): ReactNode {
  const r = v / ref
  if (r >= 1.9) return <>{r.toFixed(r >= 10 ? 0 : 1)} times {refName}</>
  if (r <= 0.55) {
    const k = Math.round(1 / r)
    const words = ['', '', 'half', 'a third', 'a quarter', 'a fifth', 'a sixth', 'a seventh', 'an eighth', 'a ninth', 'a tenth']
    if (k <= 10 && Math.abs(1 / r - k) < 0.2) return <>{words[k]} {k === 2 ? 'that of' : 'of'} {refName}</>
    if (r >= 0.1) return <>{Math.round(r * 100)}% of {refName}</>
    return <>one {ordinal(k)} of {refName}</>
  }
  if (Math.abs(r - 1) < 0.06) return <>about the same as {refName}</>
  return (
    <>
      {Math.round(Math.abs(r - 1) * 100)}% {r > 1 ? 'above' : 'below'} {refName}
    </>
  )
}

function Infobox({ F }: { F: Record<IndicatorCode, Fact | undefined> }) {
  return (
    <table className="w-full text-xs">
      <caption className="mb-2 text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">At a glance</caption>
      <tbody className="divide-y">
        {CODES.map((code) => {
          const f = F[code]
          return (
            <tr key={code}>
              <th scope="row" className="py-1.5 pr-2 text-left font-normal text-muted-foreground">
                {META[code].short}
              </th>
              <td className="py-1.5 text-right font-medium tabular-nums">{f ? META[code].fmt(f.value) : '–'}</td>
              <td className="py-1.5 pl-2 text-right text-muted-foreground tabular-nums">{f ? `#${f.rank}` : ''}</td>
              <td className="py-1.5 pl-2 text-right text-muted-foreground tabular-nums">{f?.year ?? ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Lede({
  m,
  c,
  F,
  life,
  Name,
  region,
  n,
}: {
  m: Model
  c: IndicatorCountry
  F: Record<IndicatorCode, Fact | undefined>
  life?: LifeData
  Name: string
  region: string
  n: N
}) {
  const pop = F['SP.POP.TOTL']
  const le = F['SP.DYN.LE00.IN']
  const gdp = F['NY.GDP.PCAP.CD']
  const worldLe = life ? Object.entries(life.world).sort((a, b) => +a[0] - +b[0]).at(-1) : undefined
  const regionPops = m.data.countries.filter((o) => o.region === c.region).map((o) => ({ o, v: m.latestBy['SP.POP.TOTL'].get(o.iso3)?.[1] ?? 0 }))
  const regionRank = [...regionPops].sort((a, b) => b.v - a.v).findIndex((r) => r.o.iso3 === c.iso3) + 1
  return (
    <p>
      {pop ? (
        <>
          {Name} is home to {n('SP.POP.TOTL', peopleWords(pop.value))} people,{' '}
          {pop.rank <= 20 ? (
            <>the {pop.rank === 1 ? '' : `${ordinal(pop.rank)} `}most populous country on Earth.</>
          ) : regionRank === 1 ? (
            <>the most populous country in {region}.</>
          ) : pop.value < 1e6 ? (
            <>one of the {pop.of - pop.rank + 1 <= 40 ? 'smallest' : 'smaller'} countries in the World Bank’s list.</>
          ) : (
            <>
              the {ordinal(regionRank)} most populous of the {regionPops.length} countries in {region}.
            </>
          )}
        </>
      ) : (
        <>{Name} is in {region}.</>
      )}{' '}
      {le && (
        <>
          A child born there today can expect to live {n('SP.DYN.LE00.IN', `${Math.round(le.value)} years`)}
          {worldLe ? (
            Math.abs(le.value - worldLe[1]) < 1 ? (
              <>, right at the world average.</>
            ) : (
              <>
                ,{' '}
                <Num tip={`World Bank world life expectancy, ${worldLe[0]}: ${worldLe[1].toFixed(1)} years`}>
                  {Math.round(Math.abs(le.value - worldLe[1]))} {le.value > worldLe[1] ? 'more' : 'fewer'}
                </Num>{' '}
                than the world average.
              </>
            )
          ) : (
            '.'
          )}
        </>
      )}{' '}
      {gdp && (
        <>
          Its economy produces {n('NY.GDP.PCAP.CD')} per person a year, {versus(gdp.value, gdp.worldMedian, 'the median country')}.
        </>
      )}
    </p>
  )
}

function peopleWords(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} billion`
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)} million`
  return Math.round(v).toLocaleString('en-US')
}

function change(f: Fact): { from: number; fromYear: number; abs: number; rel: number } | undefined {
  if (!f.first || f.first.year === f.year) return undefined
  return { from: f.first.value, fromYear: f.first.year, abs: f.value - f.first.value, rel: (f.value - f.first.value) / Math.abs(f.first.value || 1) }
}

function People({ F, name, Name, region, n, spark, yr }: { F: Record<IndicatorCode, Fact | undefined>; name: string; Name: string; region: string; n: N; spark: Spark; yr: Yr }) {
  const pop = F['SP.POP.TOTL']!
  const urb = F['SP.URB.TOTL.IN.ZS']
  const fer = F['SP.DYN.TFRT.IN']
  const pc = change(pop)
  return (
    <p>
      {pc && (
        <>
          Since {pc.fromYear}, {name}’s population {spark('SP.POP.TOTL')}{' '}
          {Math.abs(pc.rel) < 0.03 ? (
            <>has barely changed.</>
          ) : pc.rel > 0 ? (
            <>
              has grown by{' '}
              <Num tip={`${peopleWords(pc.from)} in ${pc.fromYear} → ${peopleWords(pop.value)} in ${pop.year}`}>{pc.rel >= 1 ? `${(pc.rel + 1).toFixed(1)} times` : `${Math.round(pc.rel * 100)}%`}</Num>
              {pc.rel >= 0.5 ? ', fast by any standard.' : '.'}
            </>
          ) : (
            <>
              has shrunk by <Num tip={`${peopleWords(pc.from)} in ${pc.fromYear} → ${peopleWords(pop.value)} in ${pop.year}`}>{Math.round(-pc.rel * 100)}%</Num>, one of the few countries getting
              smaller.
            </>
          )}{' '}
        </>
      )}
      {urb && (
        <>
          {urb.value >= 80 ? 'Most people live in cities: ' : urb.value >= 50 ? 'A majority now live in towns and cities, ' : 'Most people still live in the countryside; only '}
          {n('SP.URB.TOTL.IN.ZS')} are urban
          {change(urb) && Math.abs(change(urb)!.abs) >= 2 ? (
            <>
              , {change(urb)!.abs > 0 ? 'up' : 'down'} from <Num tip={`World Bank SP.URB.TOTL.IN.ZS, ${change(urb)!.fromYear}`}>{Math.round(change(urb)!.from)}%</Num> in {change(urb)!.fromYear}
            </>
          ) : null}
          .{' '}
        </>
      )}
      {fer && (
        <>
          Women have {n('SP.DYN.TFRT.IN', `${fer.value.toFixed(1)} children`)} on average,{' '}
          {fer.value < 1.5 ? (
            <>far below the 2.1 that keeps a population steady without migration</>
          ) : fer.value < 2.05 ? (
            <>below the 2.1 that keeps a population steady</>
          ) : fer.value < 2.4 ? (
            <>close to the 2.1 that keeps a population steady</>
          ) : fer.value < 4 ? (
            <>above the 2.1 replacement level</>
          ) : (
            <>among the highest rates in the world ({rankWords(fer)})</>
          )}
          {change(fer) && Math.abs(change(fer)!.abs) >= 0.2 ? (
            <>
              ; in {change(fer)!.fromYear} it was <Num tip={`World Bank SP.DYN.TFRT.IN, ${change(fer)!.fromYear}`}>{change(fer)!.from.toFixed(1)}</Num>
            </>
          ) : null}
          {yr(fer)}.{' '}
          {fer.regionMedian != null && Math.abs(fer.value - fer.regionMedian) >= 0.5 && (
            <>
              That’s {fer.value > fer.regionMedian ? 'high' : 'low'} even for {region}, where the median is{' '}
              <Num tip={`Median of ${fer.regionN} countries in the region`}>{fer.regionMedian.toFixed(1)}</Num>.
            </>
          )}
        </>
      )}
      {!fer && !urb && !pc && <>{Name} has {n('SP.POP.TOTL', peopleWords(pop.value))} people.</>}
    </p>
  )
}

function Health({
  F,
  name,
  region,
  life,
  n,
  spark,
  yr,
}: {
  F: Record<IndicatorCode, Fact | undefined>
  name: string
  region: string
  life?: LifeData
  n: N
  spark: Spark
  yr: Yr
}) {
  const le = F['SP.DYN.LE00.IN']!
  const im = F['SP.DYN.IMRT.IN']
  const lc = change(le)
  const worldFirst = life && lc ? life.world[String(lc.fromYear)] : undefined
  const worldNow = life ? life.world[String(le.year)] : undefined
  return (
    <p>
      Life expectancy {spark('SP.DYN.LE00.IN')} stands at {n('SP.DYN.LE00.IN')}, {rankWords(le)}
      {le.regionMedian != null && (
        <>
          {' '}
          and {Math.abs(le.value - le.regionMedian) < 1 ? 'about level with' : le.value > le.regionMedian ? `${Math.round(le.value - le.regionMedian)} years above` : `${Math.round(le.regionMedian - le.value)} years below`} the median for{' '}
          {region}
        </>
      )}
      {yr(le)}.{' '}
      {lc && (
        <>
          {Math.abs(lc.abs) < 0.5 ? (
            <>It is about where it was in {lc.fromYear}.</>
          ) : lc.abs > 0 ? (
            <>
              Since {lc.fromYear} it has risen by <Num tip={`${lc.from.toFixed(1)} → ${le.value.toFixed(1)} years`}>{lc.abs.toFixed(1)} years</Num>
              {worldFirst && worldNow ? (
                <>
                  , {lc.abs > worldNow - worldFirst + 1 ? 'faster than' : lc.abs < worldNow - worldFirst - 1 ? 'slower than' : 'in step with'} the world’s{' '}
                  <Num tip={`World: ${worldFirst.toFixed(1)} → ${worldNow.toFixed(1)}`}>{(worldNow - worldFirst).toFixed(1)}</Num>.
                </>
              ) : (
                '.'
              )}
            </>
          ) : (
            <>
              It has <em>fallen</em> since {lc.fromYear}, by <Num tip={`${lc.from.toFixed(1)} → ${le.value.toFixed(1)} years`}>{(-lc.abs).toFixed(1)} years</Num>, which few countries can say.
            </>
          )}{' '}
        </>
      )}
      {im && (
        <>
          {im.value < 3 ? (
            <>
              Infant deaths are rare: {n('SP.DYN.IMRT.IN', im.value.toFixed(1))} per 1,000 births.
            </>
          ) : (
            <>
              Of every 1,000 babies born in {name}, {n('SP.DYN.IMRT.IN', Math.round(im.value))} die before their first birthday
              {change(im) && change(im)!.rel <= -0.15 ? (
                <>
                  , <Num tip={`${change(im)!.from.toFixed(1)} in ${change(im)!.fromYear} → ${im.value.toFixed(1)} in ${im.year}`}>{Math.round(-change(im)!.rel * 100)}% fewer</Num> than in{' '}
                  {change(im)!.fromYear}
                </>
              ) : null}
              .
            </>
          )}{' '}
        </>
      )}
    </p>
  )
}

function Money({ F, name, Name, region, n, spark, yr }: { F: Record<IndicatorCode, Fact | undefined>; name: string; Name: string; region: string; n: N; spark: Spark; yr: Yr }) {
  const g = F['NY.GDP.PCAP.CD']!
  const gc = change(g)
  return (
    <p>
      At {n('NY.GDP.PCAP.CD')} of output per person {spark('NY.GDP.PCAP.CD')}, {name} ranks {rankWords(g, 'richest', 'poorest')}
      {g.regionMedian != null && <>, {versus(g.value, g.regionMedian, `the median in ${region}`)}</>}{yr(g)}.{' '}
      {gc && (
        <>
          In current dollars that is{' '}
          {gc.rel >= 0.1 ? (
            <>
              <Num tip={`${META['NY.GDP.PCAP.CD'].fmt(gc.from)} in ${gc.fromYear} → ${META['NY.GDP.PCAP.CD'].fmt(g.value)} in ${g.year}`}>{gc.rel >= 1 ? `${(gc.rel + 1).toFixed(1)} times` : `${Math.round(gc.rel * 100)}% more than`}</Num>{' '}
              {gc.rel >= 1 ? `its ${gc.fromYear} level` : `in ${gc.fromYear}`}
            </>
          ) : gc.rel <= -0.1 ? (
            <>
              <Num tip={`${META['NY.GDP.PCAP.CD'].fmt(gc.from)} in ${gc.fromYear} → ${META['NY.GDP.PCAP.CD'].fmt(g.value)} in ${g.year}`}>{Math.round(-gc.rel * 100)}% less</Num> than in {gc.fromYear}
            </>
          ) : (
            <>about where it was in {gc.fromYear}</>
          )}
          , before inflation, so read it as a direction more than a size.{' '}
        </>
      )}
      {g.pctile >= 0.9 ? <>{Name} sits in the richest tenth of the world.</> : g.pctile <= 0.1 ? <>{Name} sits in the poorest tenth of the world.</> : null}
    </p>
  )
}

function Energy({ F, name, Name, n, spark, yr }: { F: Record<IndicatorCode, Fact | undefined>; name: string; Name: string; n: N; spark: Spark; yr: Yr }) {
  const el = F['EG.ELC.ACCS.ZS']
  const rn = F['EG.FEC.RNEW.ZS']
  const co = F['EN.GHG.CO2.PC.CE.AR5']
  const without = el ? 100 - el.value : 0
  return (
    <p>
      {el && (
        <>
          {el.value >= 99.5 ? (
            <>Practically everyone in {name} has electricity. </>
          ) : el.value >= 90 ? (
            <>
              {n('EG.ELC.ACCS.ZS')} of people have electricity; about{' '}
              <Num tip={`100 − ${el.value.toFixed(1)}%`}>1 in {Math.max(2, Math.round(100 / Math.max(without, 0.1)))}</Num> still go without.{' '}
            </>
          ) : (
            <>
              Only {n('EG.ELC.ACCS.ZS')} of people have electricity {spark('EG.ELC.ACCS.ZS')}
              {change(el) && change(el)!.abs >= 5 ? (
                <>
                  , up from <Num tip={`World Bank EG.ELC.ACCS.ZS, ${change(el)!.fromYear}`}>{Math.round(change(el)!.from)}%</Num> in {change(el)!.fromYear}
                </>
              ) : null}
              {yr(el)}.{' '}
            </>
          )}
        </>
      )}
      {rn && (
        <>
          Renewables supply {n('EG.FEC.RNEW.ZS')} of the energy people use
          {rn.value >= 60 && el && el.value < 70 ? <>, much of it likely wood and other traditional biomass rather than wind or solar</> : rn.value >= 50 ? <>, a large share</> : rn.value < 10 ? <>, a small share</> : null}
          {yr(rn)}.{' '}
        </>
      )}
      {co && (
        <>
          Each person accounts for {n('EN.GHG.CO2.PC.CE.AR5', `${co.value.toFixed(co.value < 10 ? 1 : 0)} tonnes`)} of CO₂ a year {spark('EN.GHG.CO2.PC.CE.AR5')},{' '}
          {versus(co.value, co.worldMedian, 'the median country')}
          {co.pctile >= 0.9 ? <>; {Name} is among the world’s heaviest emitters per head</> : co.pctile <= 0.15 ? <>; {Name} barely registers in the world’s emissions per head</> : null}{yr(co)}.
        </>
      )}
    </p>
  )
}

function Online({ F, name, Name, region, n, spark, yr }: { F: Record<IndicatorCode, Fact | undefined>; name: string; Name: string; region: string; n: N; spark: Spark; yr: Yr }) {
  const net = F['IT.NET.USER.ZS']!
  const half = yearReached(net, 50)
  return (
    <p>
      {net.value >= 90 ? <>Nearly everyone is online: </> : net.value >= 50 ? <>Most people are online: </> : <>Most people are not yet online: only </>}
      {n('IT.NET.USER.ZS')} use the internet {spark('IT.NET.USER.ZS')}, {rankWords(net)}{yr(net)}.{' '}
      {half && half > 2000 ? (
        <>
          {Name} crossed the halfway mark in <Num tip={`First year at 50% or more: ${half}`}>{half}</Num>
          {half <= 2008 ? ', early' : half >= 2018 ? ', recently' : ''}.{' '}
        </>
      ) : net.first && net.first.year === 2000 && net.first.value >= 50 ? (
        <>Half of {name} was already online by 2000. </>
      ) : null}
      {net.regionMedian != null && Math.abs(net.value - net.regionMedian) >= 8 && (
        <>
          That’s {net.value > net.regionMedian ? 'ahead of' : 'behind'} {region}, where the median is <Num tip={`Median of ${net.regionN} countries`}>{Math.round(net.regionMedian)}%</Num>.
        </>
      )}
    </p>
  )
}

function Kin({ m, c, Name, region }: { m: Model; c: IndicatorCountry; Name: string; region: string }) {
  const like = mostLike(m, c)
  const odd = standout(m, c)
  const link = (o: IndicatorCountry) => (
    <a key={o.iso3} href={href(`${PATH}?country=${o.iso3}`)} className="font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
      {proseName(o.name)}
    </a>
  )
  return (
    <p>
      {like.length ? (
        <>
          By the numbers, {Name} looks most like {joinList(like.map((l) => link(l.c)))}
          {like.every((l) => l.c.region === c.region) ? <>, all in {region}</> : like.some((l) => l.c.region !== c.region) && like.every((l) => l.c.region !== c.region) ? <>, none of them neighbors</> : null}.{' '}
        </>
      ) : (
        <>There are too few figures for {Name} to say which countries it resembles. </>
      )}
      {odd && (
        <>
          What sets it apart in {region} is {META[odd.code].label}:{' '}
          <Num tip={`World Bank ${odd.code}, ${odd.f.year}`}>{META[odd.code].fmt(odd.f.value)}</Num>, against a regional median of{' '}
          <Num tip={`Median of ${odd.f.regionN} countries in the region`}>{META[odd.code].fmt(odd.f.regionMedian!)}</Num>.
        </>
      )}{' '}
      <span className="text-muted-foreground">Similarity is measured across nine indicators, each scaled so no single one dominates.</span>
    </p>
  )
}
