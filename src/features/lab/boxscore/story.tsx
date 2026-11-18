import type { ReactNode } from 'react'

import { Num } from '@/features/lab/forecast/glyphs'

import { FUEL_LABEL, pct, ukHm, type Game, type Player } from './model'

/*
 * The game story and the MVP line, written from the numbers. Each sentence
 * checks the data before it commits to a claim (solar only "came on" if it
 * cleared 1%; gas only "came off the bench" if its share swung 5+ points),
 * and the wording varies with the size of the effect.
 */

const P = (n: number, tip?: ReactNode) => <Num tip={tip}>{pct(n)}%</Num>
const at = (t: number) => <Num tip="UK time">{ukHm(t)}</Num>

export function mvpOf(g: Game): Player {
  return g.players.reduce((m, p) => (p.avg > m.avg ? p : m))
}

export function MvpLine({ g }: { g: Game }) {
  const m = mvpOf(g)
  const name = FUEL_LABEL[m.fuel]
  const steady = m.high - m.low < 6
  return (
    <p>
      <strong className="font-semibold">{name}</strong> {g.live ? 'is leading the way' : 'was the player of the day'} with a {P(m.avg, `${m.avg.toFixed(2)}% average share`)} average share
      {steady ? (
        <>
          , never straying far from it: between {P(m.low)} and {P(m.high)} all {g.live ? 'day so far' : 'day'}.
        </>
      ) : (
        <>
          , peaking at {P(m.high)} at {at(m.highAt)} and bottoming out at {P(m.low)} at {at(m.lowAt)}.
        </>
      )}
      {m.vsPrev !== null && Math.abs(m.vsPrev) >= 1 && (
        <>
          {' '}
          That’s <Num tip={`${m.vsPrev.toFixed(2)} percentage points`}>{Math.abs(m.vsPrev).toFixed(1)} points</Num> {m.vsPrev > 0 ? 'more' : 'less'} than the day before.
        </>
      )}
    </p>
  )
}

export function Story({ g }: { g: Game }) {
  const [low, fossil, imp] = g.teams
  const by = Object.fromEntries(g.players.map((p) => [p.fuel, p])) as Record<string, Player>
  const was = g.live ? 'is' : 'was'
  const sentences: ReactNode[] = []

  // Result.
  const margin = low.avg - fossil.avg
  sentences.push(
    margin > 30 ? (
      <>
        Low-carbon sources {g.live ? 'are running' : 'ran'} away with it, {P(low.avg)} to fossil fuels’ {P(fossil.avg)}, with imports chipping in {P(imp.avg)}.
      </>
    ) : margin > 0 ? (
      <>
        Low-carbon sources {g.live ? 'lead' : 'beat'} fossil fuels {P(low.avg)} to {P(fossil.avg)}, with imports {g.live ? 'adding' : 'adding'} {P(imp.avg)}.
      </>
    ) : (
      <>
        Fossil fuels {g.live ? 'have the edge' : 'took this one'}, {P(fossil.avg)} to low-carbon’s {P(low.avg)}, with imports at {P(imp.avg)}.
      </>
    ),
  )

  // Overnight leader (first period).
  const p1 = g.slots.filter((s) => s.from < g.start + 6 * 3600_000)
  if (p1.length >= 4) {
    const fuels = Object.keys(p1[0].mix) as (keyof typeof p1[0]['mix'])[]
    const lead = fuels.map((f) => ({ f, v: p1.reduce((a, s) => a + s.mix[f], 0) / p1.length })).sort((a, b) => b.v - a.v)[0]
    sentences.push(
      <>
        {FUEL_LABEL[lead.f]} carried the overnight, holding {P(lead.v)} of generation before dawn.
      </>,
    )
  }

  // Wind: streaky or steady.
  const w = by.wind
  if (w && !w.dnp) {
    sentences.push(
      w.high - w.low >= 15 ? (
        <>
          Wind {was} streaky: {P(w.high)} at {at(w.highAt)}, down to {P(w.low)} at {at(w.lowAt)}.
        </>
      ) : (
        <>
          Wind {was} dependable, between {P(w.low)} and {P(w.high)} throughout.
        </>
      ),
    )
  }

  // Solar's stretch.
  const s = by.solar
  if (s) {
    const on = g.slots.filter((x) => x.mix.solar >= 1)
    sentences.push(
      s.high < 1 ? (
        <>Solar barely got off the bench, topping out at {P(s.high)}.</>
      ) : (
        <>
          Solar came on at {at(on[0].from)}, peaked at {P(s.high)} around {at(s.highAt)}
          {on.at(-1)!.from < g.slots.at(-1)!.from ? <> and was done by {at(on.at(-1)!.from + 30 * 60_000)}</> : null}.
        </>
      ),
    )
  }

  // Gas off the bench, or steady.
  const gas = by.gas
  if (gas && !gas.dnp) {
    const evening = +ukHm(gas.highAt).slice(0, 2) >= 16
    sentences.push(
      gas.high - gas.low >= 5 ? (
        <>
          Gas came off the bench {evening ? 'for the evening peak' : `around ${ukHm(gas.highAt)}`}, climbing from {P(gas.low)} at {at(gas.lowAt)} to {P(gas.high)} at {at(gas.highAt)}.
        </>
      ) : (
        <>Gas played a steady {P(gas.avg)} all day.</>
      ),
    )
  }

  // Coal.
  if (by.coal?.dnp) sentences.push(<>Coal did not play.</>)

  // Intensity.
  if (g.intensity.length >= 4) {
    const avg = g.intensity.reduce((a, x) => a + x.v, 0) / g.intensity.length
    const mn = g.intensity.reduce((m, x) => (x.v < m.v ? x : m))
    const mx = g.intensity.reduce((m, x) => (x.v > m.v ? x : m))
    sentences.push(
      <>
        Carbon intensity averaged <Num tip={`${avg.toFixed(1)} gCO₂/kWh`}>{Math.round(avg)} g</Num>, cleanest at {at(mn.from)} (<Num>{mn.v} g</Num>) and dirtiest at {at(mx.from)} (
        <Num>{mx.v} g</Num>).
      </>,
    )
  }

  // Versus the day before.
  if (g.prevTeams) {
    const d = low.avg - g.prevTeams.low
    sentences.push(
      Math.abs(d) < 1 ? (
        <>Low-carbon’s share {g.live ? 'is' : 'was'} about the same as the day before ({P(g.prevTeams.low)}).</>
      ) : (
        <>
          That’s {d > 0 ? 'a better' : 'a worse'} showing than the day before, when low-carbon took {P(g.prevTeams.low)}.
        </>
      ),
    )
  }

  return (
    <p className="text-sm leading-relaxed text-foreground/90">
      {sentences.map((x, i) => (
        <span key={i}>
          {i > 0 && ' '}
          {x}
        </span>
      ))}
    </p>
  )
}
