import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import {
  useCarbonWindow,
  useGenerationNow,
  useHackerNews,
  useKpForecast,
  useKpNow,
  useLaunchesUpcoming,
  useQuakesDay,
  useWeather,
  useWikiLatest,
  weatherWords,
  type HnStory,
  type Launch,
  type Weather,
} from '@/features/lab/feeds'
import { Num } from '@/features/lab/forecast/glyphs'
import { LoadGate } from '@/features/lab/LabKit'
import { compose, LENGTHS, prepare, sayDeg, sayPlace, type Length, type Prepared, type Segment } from '@/features/lab/narrative/briefing'
import { InlineCounts, InlineTrend } from '@/features/lab/narrative/glyphs'
import { NarrativeHeader, ordinal } from '@/features/lab/narrative/kit'
import { CITIES, type CarbonSlot, type City, type FuelShare, type KpPoint, type Quake, type WikiArticle } from '@/features/lab/sources'
import { prefs } from '@/lib/prefs'
import { cn } from '@/lib/utils'

/*
 * Briefing, Spoken: the lab's feeds composed into a radio-style briefing and
 * read aloud by the browser (Web Speech API). The transcript is the
 * dashboard: the sentence being read is highlighted, and so is the word, from
 * the voice's own boundary events. Three lengths decide what makes the cut.
 * Without speech it is still a briefing you can read.
 */

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export function BriefingPage() {
  const [cityId, setCityId] = useState(() => prefs.getItem('briefing.city') ?? 'nyc')
  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0]
  const weather = useWeather(city)
  const quakes = useQuakesDay()
  const carbon = useCarbonWindow()
  const gen = useGenerationNow()
  const kpf = useKpForecast()
  const kpNow = useKpNow()
  const wiki = useWikiLatest()
  const launches = useLaunchesUpcoming()
  const hn = useHackerNews(5)
  const core = [weather, carbon, kpf]

  return (
    <div className="flex flex-col gap-8">
      <NarrativeHeader id="briefing" feeds={[weather, quakes, carbon, kpf, wiki, launches, hn]} />
      <LoadGate feeds={core} label="Writing your briefing">
        {() => (
          <Player
            city={city}
            setCity={(id) => {
              prefs.setItem('briefing.city', id)
              setCityId(id)
            }}
            segments={buildSegments({
              city,
              w: weather.data!,
              quakes: quakes.data,
              carbon: carbon.data!,
              mix: gen.data?.mix,
              kpf: kpf.data!,
              kpNow: kpNow.data?.kp,
              wiki: wiki.data?.articles,
              wikiDaysAgo: wiki.daysAgo,
              launches: launches.data,
              hn: hn.data,
            })}
          />
        )}
      </LoadGate>
    </div>
  )
}

// ── The player ──────────────────────────────────────────────────────────────

type State = 'idle' | 'playing' | 'paused'

function Player({ city, setCity, segments }: { city: City; setCity: (id: string) => void; segments: Segment[] }) {
  const [length, setLength] = useState<Length>('medium')
  const [rate, setRate] = useState<'0.9' | '1' | '1.2'>('1')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceUri, setVoiceUri] = useState(() => prefs.getItem('briefing.voice') ?? '')
  const [state, setState] = useState<State>('idle')
  const [cur, setCur] = useState<{ s: number; t: number } | null>(null)
  // While speaking, the transcript is frozen so live updates can't shift the words under the voice.
  const [frozen, setFrozen] = useState<Prepared[] | null>(null)
  const run = useRef(0)
  const [settings, setSettings] = useState(false)

  const live = useMemo(() => compose(segments, LENGTHS[length].words, LENGTHS[length].long).map(prepare), [segments, length])
  const script = frozen ?? live
  const words = script.reduce((n, s) => n + s.words, 0)
  const seconds = Math.round((words / 155) * 60 / Number(rate))

  useEffect(() => {
    if (!canSpeak) return
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')))
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      window.speechSynthesis.cancel()
    }
  }, [])

  const stop = useCallback(() => {
    run.current++
    if (canSpeak) window.speechSynthesis.cancel()
    setState('idle')
    setCur(null)
    setFrozen(null)
  }, [])

  const speakFrom = useCallback(
    (start: number, lines: Prepared[]) => {
      if (!canSpeak) return
      window.speechSynthesis.cancel()
      const id = ++run.current
      setFrozen(lines)
      setState('playing')
      const voice = voices.find((v) => v.voiceURI === voiceUri)
      const say = (i: number) => {
        if (id !== run.current) return
        if (i >= lines.length) {
          setState('idle')
          setCur(null)
          setFrozen(null)
          return
        }
        setCur({ s: i, t: 0 })
        const u = new SpeechSynthesisUtterance(lines[i].spoken)
        if (voice) u.voice = voice
        u.rate = Number(rate)
        u.onboundary = (e) => {
          if (id !== run.current || e.name !== 'word') return
          const t = lines[i].tokens.findIndex((tk) => e.charIndex >= tk.start && e.charIndex < tk.end)
          if (t >= 0) setCur({ s: i, t })
        }
        u.onend = () => say(i + 1)
        u.onerror = () => {
          if (id === run.current) say(i + 1)
        }
        window.speechSynthesis.speak(u)
      }
      say(start)
    },
    [voices, voiceUri, rate],
  )

  const toggle = useCallback(() => {
    if (!canSpeak) return
    if (state === 'playing') {
      window.speechSynthesis.pause()
      setState('paused')
    } else if (state === 'paused') {
      window.speechSynthesis.resume()
      setState('playing')
    } else speakFrom(0, live)
  }, [state, speakFrom, live])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLButtonElement) return
      if (e.key === ' ') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'ArrowRight' && cur) speakFrom(Math.min(script.length - 1, cur.s + 1), script)
      if (e.key === 'ArrowLeft' && cur) speakFrom(Math.max(0, cur.s - 1), script)
      if (e.key === 'Escape') stop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, cur, script, speakFrom, stop])

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,64ch)_18rem] lg:justify-between">
      <article aria-live="off" className="order-2 flex flex-col gap-5 text-lg leading-relaxed text-pretty sm:text-xl sm:leading-[1.7] lg:order-1">
        {groups(script).map((grp) => (
          <p key={grp[0].i}>
            {grp.map(({ s, i }) => (
          <span key={s.id + i}>
            <button
              type="button"
              onClick={() => (canSpeak ? speakFrom(i, script) : undefined)}
              className={cn(
                'rounded-md px-1 py-0.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                canSpeak && 'cursor-pointer hover:bg-accent',
                cur?.s === i ? 'bg-primary-soft text-primary-soft-foreground' : cur ? 'text-foreground/55' : 'text-foreground/90',
              )}
              aria-label={canSpeak ? `Read from here: ${s.spoken}` : undefined}
              tabIndex={canSpeak ? 0 : -1}
            >
              {s.tokens.map((tk, j) => {
                const on = cur?.s === i && cur.t === j && state !== 'idle'
                if (tk.figure) {
                  const g = tk.figure.glyph
                  return (
                    <span key={j} className={cn(on && 'underline decoration-2 underline-offset-4')}>
                      <Num tip={tk.figure.tip}>{tk.text}</Num>
                      {g ? g.kind === 'trend' ? <InlineTrend points={g.values} summary={g.summary} /> : <InlineCounts points={g.values} summary={g.summary} /> : null}
                    </span>
                  )
                }
                return (
                  <span key={j} className={cn(on && 'rounded-sm bg-primary/15 font-semibold text-foreground')}>
                    {tk.text}
                  </span>
                )
              })}
            </button>{' '}
          </span>
            ))}
          </p>
        ))}
      </article>

      <aside className="order-1 lg:order-2">
        <Card className="gap-5 px-5 py-5 lg:sticky lg:top-18">
          <div className="flex items-center gap-3">
            <Button size="lg" onClick={toggle} disabled={!canSpeak} aria-label={state === 'playing' ? 'Pause (Space)' : 'Play (Space)'} className="min-w-28">
              {state === 'playing' ? <Pause /> : <Play />}
              {state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : 'Listen'}
            </Button>
            <Button variant="ghost" size="icon" onClick={stop} disabled={state === 'idle'} aria-label="Stop (Esc)">
              <RotateCcw />
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${cur ? ((cur.s + 1) / script.length) * 100 : 0}%` }} />
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {cur ? `Sentence ${cur.s + 1} of ${script.length}` : `${script.length} sentences`} · {words} words · about {seconds < 75 ? `${seconds} s` : `${Math.round(seconds / 60)} min`}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-fit lg:hidden" onClick={() => setSettings((v) => !v)} aria-expanded={settings}>
            {settings ? 'Hide settings' : 'Length, speed and voice'}
          </Button>
          {!canSpeak && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <VolumeX className="mt-0.5 size-3.5 shrink-0" />
              This browser can’t speak, so the briefing is text only.
            </p>
          )}
          <div className={cn('flex-col gap-5 lg:flex', settings ? 'flex' : 'hidden')}>
          <div className="flex flex-col gap-1.5">
            <Label>Length</Label>
            <Segmented<Length>
              aria-label="Length"
              value={length}
              onChange={(l) => {
                stop()
                setLength(l)
              }}
              options={Object.entries(LENGTHS).map(([k, v]) => ({ value: k as Length, label: v.label }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Speed</Label>
            <Segmented
              aria-label="Speed"
              value={rate}
              onChange={(r) => {
                stop()
                setRate(r)
              }}
              options={[
                { value: '0.9', label: '0.9×' },
                { value: '1', label: '1×' },
                { value: '1.2', label: '1.2×' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="briefing-city">Weather for</Label>
            <NativeSelect
              id="briefing-city"
              value={city.id}
              onChange={(e) => {
                stop()
                setCity(e.target.value)
              }}
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          {canSpeak && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="briefing-voice">Voice</Label>
              <NativeSelect
                id="briefing-voice"
                value={voiceUri}
                onChange={(e) => {
                  stop()
                  setVoiceUri(e.target.value)
                  prefs.setItem('briefing.voice', e.target.value)
                }}
              >
                <option value="">System default</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">Space plays and pauses, ← → skip a sentence, Esc stops. Click any sentence to read from there.</p>
          </div>
        </Card>
      </aside>
    </div>
  )
}

/** Sentences grouped into paragraphs by segment (ids look like "grid:1"). */
function groups(script: Prepared[]): { s: Prepared; i: number }[][] {
  const out: { s: Prepared; i: number }[][] = []
  script.forEach((s, i) => {
    const seg = s.id.split(':')[0]
    const last = out.at(-1)
    if (last && last[0].s.id.split(':')[0] === seg) last.push({ s, i })
    else out.push([{ s, i }])
  })
  return out
}

// ── The script ──────────────────────────────────────────────────────────────

interface Inputs {
  city: City
  w: Weather
  quakes?: Quake[]
  carbon: CarbonSlot[]
  mix?: FuelShare[]
  kpf: KpPoint[]
  kpNow?: number
  wiki?: WikiArticle[]
  wikiDaysAgo: number
  launches?: Launch[]
  hn?: HnStory[]
}

function buildSegments(x: Inputs): Segment[] {
  const out: Segment[] = []
  const f = x.city.id === 'nyc'
  const T = (c: number) => Math.round(f ? c * 1.8 + 32 : c)
  const deg = (c: number, tip: string) => ({ text: `${T(c)}°`, say: sayDeg(T(c)), tip })
  const local = x.w.current.time
  const hour = Number(local.slice(11, 13))
  const greet = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const date = new Date(`${local.slice(0, 10)}T12:00:00Z`)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  const monthDay = `${date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })} ${ordinal(date.getUTCDate())}`
  const clock = `${hour % 12 === 0 ? 12 : hour % 12}:${local.slice(14, 16)} ${hour < 12 ? 'a.m.' : 'p.m.'}`

  // Greeting.
  out.push({
    id: 'hello',
    priority: -10,
    short: [{ id: 'hello:0', parts: [`${greet}. Here’s your briefing for ${dayName}.`] }],
    long: [{ id: 'hello:0', parts: [`${greet}. It’s ${clock} in ${x.city.name} on ${dayName}, ${monthDay}, and this is your briefing.`] }],
  })

  // Weather.
  const w = x.w
  const ti = Math.max(0, w.daily.time.indexOf(local.slice(0, 10)))
  const tomorrow = ti + 1
  const iNow = Math.max(0, w.hourly.time.indexOf(`${local.slice(0, 13)}:00`))
  const next = w.hourly.temp.slice(iNow, iNow + 24)
  const rainHour = w.hourly.rainChance.slice(iNow, iNow + 24).findIndex((p) => p >= 50)
  const trend = {
    kind: 'trend' as const,
    values: next.map((t, i) => ({ label: w.hourly.time[iNow + i].slice(11, 16), value: t, text: `${T(t)}°` })),
    summary: 'Temperature, next 24 hours',
  }
  const feelsGap = w.current.feels - w.current.temp
  out.push({
    id: 'weather',
    priority: 0,
    short: [
      {
        id: 'weather:0',
        parts: [
          `In ${x.city.name} it’s `,
          { ...deg(w.current.temp, `Open-Meteo temperature_2m: ${w.current.temp} °C`), glyph: trend },
          ` and ${weatherWords(w.current.code)}, with a high tomorrow of `,
          deg(w.daily.max[tomorrow], `temperature_2m_max ${w.daily.time[tomorrow]}: ${w.daily.max[tomorrow]} °C`),
          '.',
        ],
      },
    ],
    long: [
      {
        id: 'weather:0',
        parts: [
          `In ${x.city.name} it’s `,
          { ...deg(w.current.temp, `Open-Meteo temperature_2m: ${w.current.temp} °C`), glyph: trend },
          ` and ${weatherWords(w.current.code)}`,
          ...(Math.abs(feelsGap) >= 2 ? [', though it feels like ', deg(w.current.feels, `apparent_temperature: ${w.current.feels} °C`)] : []),
          '.',
        ],
      },
      {
        id: 'weather:1',
        parts: [
          'Tomorrow runs from ',
          deg(w.daily.min[tomorrow], `temperature_2m_min: ${w.daily.min[tomorrow]} °C`),
          ' to ',
          deg(w.daily.max[tomorrow], `temperature_2m_max: ${w.daily.max[tomorrow]} °C`),
          rainHour >= 0
            ? `, and rain is likely from ${hourName(w.hourly.time[iNow + rainHour])}.`
            : w.daily.rainChance[tomorrow] >= 40
              ? `, with a ${w.daily.rainChance[tomorrow]} percent chance of rain.`
              : ', and it stays dry.',
        ],
      },
    ],
  })

  // Earthquakes: lead story if big.
  if (x.quakes?.length) {
    const top = x.quakes.reduce((a, b) => (b.mag > a.mag ? b : a))
    const n5 = x.quakes.filter((q) => q.mag >= 5).length
    const big = top.mag >= 6
    out.push({
      id: 'quakes',
      priority: big ? 1 : top.mag >= 5 ? 4 : 8,
      short: [
        {
          id: 'quakes:0',
          parts: [
            big ? 'A strong earthquake: magnitude ' : 'The largest earthquake in the past day was magnitude ',
            { text: top.mag.toFixed(1), tip: `USGS ${top.id}: M${top.mag}` },
            ', ',
            { text: top.place, say: sayPlace(top.place) },
            '.',
          ],
        },
      ],
      long: [
        {
          id: 'quakes:0',
          parts: [
            big ? 'A strong earthquake: magnitude ' : 'The largest earthquake in the past day was magnitude ',
            { text: top.mag.toFixed(1), tip: `USGS ${top.id}: M${top.mag}` },
            ', ',
            { text: top.place, say: sayPlace(top.place) },
            ', at a depth of ',
            { text: `${Math.round(top.depth)} km`, say: `${Math.round(top.depth)} kilometers`, tip: `depth ${top.depth} km` },
            top.tsunami ? ', and a tsunami bulletin was issued.' : '.',
          ],
        },
        {
          id: 'quakes:1',
          parts: [
            'In all, the U.S. Geological Survey logged ',
            { text: x.quakes.length.toLocaleString('en-US'), tip: 'All magnitudes, past 24 hours (mostly small US events)' },
            ` earthquakes in 24 hours, ${n5 === 0 ? 'none of them above magnitude five' : n5 === 1 ? 'one of them above magnitude five' : `${n5} of them above magnitude five`}.`,
          ],
        },
      ],
    })
  }

  // The grid.
  const now = Date.now()
  const cur = x.carbon.find((c) => c.from <= now && c.to > now) ?? x.carbon.at(-1)!
  const ahead = x.carbon.filter((c) => c.from >= cur.from).slice(0, 24)
  const best = ahead.reduce((a, b) => (b.forecast < a.forecast ? b : a), ahead[0])
  const g = cur.actual ?? cur.forecast
  const topFuel = x.mix ? [...x.mix].sort((a, b) => b.perc - a.perc)[0] : undefined
  const ukTime = (t: number) => new Date(t).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' })
  const gridGlyph = {
    kind: 'trend' as const,
    values: ahead.map((c) => ({ label: `${ukTime(c.from)} UK`, value: c.forecast, text: `${c.forecast} g` })),
    summary: 'Carbon intensity forecast, next 12 hours',
  }
  out.push({
    id: 'grid',
    priority: g >= 200 || g <= 60 ? 3 : 5,
    short: [
      {
        id: 'grid:0',
        parts: [
          'Britain’s electricity is running at ',
          { text: `${g} g`, say: `${g} grams of carbon dioxide per kilowatt hour`, tip: `NESO intensity ${cur.actual != null ? 'actual' : 'forecast'}: ${g} gCO₂/kWh`, glyph: gridGlyph },
          `, which counts as ${cur.index}.`,
        ],
      },
    ],
    long: [
      {
        id: 'grid:0',
        parts: [
          'Britain’s electricity is running at ',
          { text: `${g} g`, say: `${g} grams of carbon dioxide per kilowatt hour`, tip: `NESO intensity: ${g} gCO₂/kWh`, glyph: gridGlyph },
          `, which counts as ${cur.index}`,
          ...(topFuel ? [`, with ${topFuel.fuel} the biggest source at `, { text: `${Math.round(topFuel.perc)}%`, say: `${Math.round(topFuel.perc)} percent`, tip: `NESO generation mix: ${topFuel.perc}%` }] : []),
          '.',
        ],
      },
      {
        id: 'grid:1',
        parts:
          best.from === cur.from
            ? ['That’s the cleanest it gets in the next twelve hours.']
            : ['The cleanest half hour in the next twelve starts at ', { text: ukTime(best.from), tip: `${best.forecast} gCO₂/kWh forecast` }, ' UK time, at ', { text: `${best.forecast} g`, say: `${best.forecast} grams`, tip: 'forecast' }, '.'],
      },
    ],
  })

  // Space weather.
  const future = x.kpf.filter((k) => k.time > now - 3 * 3600_000)
  const peak = future.reduce((a, b) => (b.kp > a.kp ? b : a), future[0])
  const kpVal = x.kpNow ?? future[0]?.kp ?? 0
  const storm = peak && peak.kp >= 5
  const kpGlyph = { kind: 'counts' as const, values: future.slice(0, 24).map((k) => ({ label: new Date(k.time).toISOString().slice(5, 13).replace('T', ' ') + 'h UTC', value: k.kp, text: `Kp ${k.kp.toFixed(1)}` })), summary: 'Kp, 3-hour blocks ahead' }
  out.push({
    id: 'space',
    priority: storm ? 2 : 6,
    short: [
      {
        id: 'space:0',
        parts: storm
          ? ['Space weather: a geomagnetic storm is expected, with the K-index reaching ', { text: peak.kp.toFixed(1), tip: `NOAA SWPC Kp ${peak.kind}`, glyph: kpGlyph }, '. Look up tonight if you’re far north.']
          : ['Space weather is ', kpVal >= 4 ? 'active' : kpVal >= 3 ? 'unsettled' : 'quiet', ', with the K-index at ', { text: kpVal.toFixed(1), tip: 'NOAA SWPC estimated Kp', glyph: kpGlyph }, '.'],
      },
    ],
    long: [
      {
        id: 'space:0',
        parts: [
          'Space weather is ',
          kpVal >= 5 ? 'stormy' : kpVal >= 4 ? 'active' : kpVal >= 3 ? 'unsettled' : 'quiet',
          ', with the planetary K-index at ',
          { text: kpVal.toFixed(1), tip: 'NOAA SWPC estimated Kp', glyph: kpGlyph },
          peak ? `, and forecast to peak at ` : '.',
          ...(peak ? [{ text: peak.kp.toFixed(1), tip: `${new Date(peak.time).toISOString().slice(0, 16)}Z` }, storm ? ': storm levels, so the northern lights may reach lower latitudes than usual.' : ', below storm level.'] : []),
        ],
      },
    ],
  })

  // Wikipedia.
  if (x.wiki?.length) {
    const top = x.wiki[0]
    const second = x.wiki[1]
    const when = x.wikiDaysAgo === 1 ? 'yesterday' : 'on the latest day published'
    out.push({
      id: 'wiki',
      priority: 7,
      short: [{ id: 'wiki:0', parts: [`On Wikipedia, the most read article ${when} was ${top.title}, with `, { text: millions(top.views), tip: `${top.views.toLocaleString('en-US')} views` }, ' views.'] }],
      long: [
        { id: 'wiki:0', parts: [`On Wikipedia, the most read article ${when} was ${top.title}, with `, { text: millions(top.views), tip: `${top.views.toLocaleString('en-US')} views` }, ' views.'] },
        ...(second ? [{ id: 'wiki:1', parts: [`Second was ${second.title}, at `, { text: millions(second.views), tip: `${second.views.toLocaleString('en-US')} views` }, '.'] }] : []),
      ],
    })
  }

  // Launches.
  const nextLaunch = x.launches?.find((l) => l.net > now)
  if (nextLaunch) {
    const hrs = (nextLaunch.net - now) / 3600_000
    const site = nextLaunch.location.split(',').slice(-1)[0].trim()
    const inWords = hrs < 1 ? 'within the hour' : hrs < 48 ? `in about ${Math.round(hrs)} hours` : `in ${Math.round(hrs / 24)} days`
    out.push({
      id: 'launch',
      priority: hrs < 6 ? 3.5 : 9,
      short: [{ id: 'launch:0', parts: [`The next rocket launch is a ${nextLaunch.rocket}, `, { text: inWords, tip: new Date(nextLaunch.net).toUTCString() }, '.'] }],
      long: [
        {
          id: 'launch:0',
          parts: [
            `The next rocket launch is a ${nextLaunch.rocket} carrying ${nextLaunch.mission || 'an undisclosed payload'}, from ${site}, `,
            { text: inWords, tip: `${new Date(nextLaunch.net).toUTCString()} (${nextLaunch.precision || 'unknown'} precision)` },
            nextLaunch.status === 'Go' ? ', and it’s go for launch.' : '.',
          ],
        },
      ],
    })
  }

  // Hacker News.
  if (x.hn?.length) {
    const top = x.hn[0]
    out.push({
      id: 'hn',
      priority: 10,
      short: [{ id: 'hn:0', parts: [`And on Hacker News, the top story is “${top.title}”, with `, { text: `${top.score} points`, tip: `${top.comments} comments` }, '.'] }],
      long: [
        { id: 'hn:0', parts: [`And on Hacker News, the top story is “${top.title}”, with `, { text: `${top.score} points`, tip: `${top.comments} comments, ${top.domain}` }, '.'] },
        ...(x.hn[1] ? [{ id: 'hn:1', parts: [`Close behind: “${x.hn[1].title}”.`] }] : []),
      ],
    })
  }

  // Closing.
  out.push({
    id: 'close',
    priority: 100,
    short: [{ id: 'close:0', parts: ['That’s the briefing.'] }],
    long: [{ id: 'close:0', parts: ['That’s the briefing. The numbers came from the U.S. Geological Survey, NOAA, Britain’s grid operator, Open-Meteo, Wikimedia and Launch Library.'] }],
  })
  return out
}

function hourName(t: string): string {
  const h = Number(t.slice(11, 13))
  if (h === 0) return 'midnight'
  if (h === 12) return 'noon'
  return `${h % 12} ${h < 12 ? 'a.m.' : 'p.m.'}`
}
function millions(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : `${Math.round(n / 1000)} thousand`
}

