import { useState, type ReactNode } from 'react'
import { ArrowRight, Archive, BellRing, Check, Headphones, Mail, PenLine } from 'lucide-react'

import { CollapsingHeader } from '@/components/layout/CollapsingHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Cover, FormatBadge, ItemCover, PersonChip } from '@/features/learning/components'
import { HUB, ITEM_BY_ID, formatMinutes } from '@/features/learning/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Home C · Magazine. The hub as a weekly issue with editors and a voice: a
 * cover story, a letter from the editor, regular departments (Field notes,
 * Ask Sol, One chart, Night Shift), a short reading list and the people who
 * made the issue. The hierarchy comes from type scale and rules, not boxes.
 */

const COVER = ITEM_BY_ID['boring-tech']

const CONTENTS = [
  { id: 'cover', name: 'Cover story' },
  { id: 'letter', name: 'From the editor' },
  { id: 'ask', name: 'Ask Sol' },
  { id: 'notes', name: 'Field notes' },
  { id: 'chart', name: 'One chart' },
  { id: 'listen', name: 'Night Shift' },
  { id: 'list', name: 'The reading list' },
]

const FIELD_NOTES: { team: string; title: string; body: string }[] = [
  {
    team: 'Payments',
    title: 'We deleted 41,000 lines and nobody noticed',
    body: 'Hopper’s last callers moved off in October. The repo is archived; the on-call runbook lost eleven pages.',
  },
  {
    team: 'Design systems',
    title: 'The button has one size now',
    body: 'After a quarter of audits, three button heights became one. Theo has a chart and strong feelings.',
  },
  {
    team: 'Support',
    title: 'Shadow a call, Thursdays at 2',
    body: 'Iris’s team has opened two seats a week for engineers. The waiting list is short, for now.',
  },
]

const CHART: { label: string; hours: number }[] = [
  { label: 'Under 50 lines', hours: 2.1 },
  { label: '50–200', hours: 4.8 },
  { label: '200–500', hours: 11.5 },
  { label: 'Over 500', hours: 26 },
]

const READING: { id: string; gloss: string }[] = [
  { id: 'charts-lie', gloss: 'Read it before you put this week’s One chart in a slide deck.' },
  { id: 'failure-modes', gloss: 'Episode 3 is the Hopper story the cover piece keeps alluding to.' },
  { id: 'design-crit', gloss: 'For anyone whose critiques have started to feel like hearings.' },
  { id: 'threat-model', gloss: 'June runs it live on Tuesday. Bring a launch you’re nervous about.' },
  { id: 'git-sheet', gloss: 'Not reading, exactly. Print it and pin it; everyone does.' },
]

const CONTRIBUTORS: { id: string; did: string }[] = [
  { id: 'ben', did: 'Wrote the cover story' },
  { id: 'sol', did: 'Edited the issue, answered the mail' },
  { id: 'ana', did: 'Drew this week’s chart' },
  { id: 'kwame', did: 'Hosted Night Shift' },
  { id: 'june', did: 'Guest on Night Shift' },
]

const BACK_ISSUES = [
  { n: 45, date: 'Nov 11', headline: 'The meeting that should have been a doc' },
  { n: 44, date: 'Nov 04', headline: 'What a year of on-call taught our newest hires' },
  { n: 43, date: 'Oct 28', headline: 'Numbers you can say out loud' },
]

/** A department rule: number, name, a hairline to the edge. */
function Dept({ n, name, className }: { n: string; name: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-xs font-semibold tracking-[0.12em] uppercase', className)}>
      <span className="font-mono text-primary">{n}</span>
      <span>{name}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}

function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a
      href={href(to)}
      className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="size-3.5" />
    </a>
  )
}

export function HomeMagazine() {
  const [subscribed, setSubscribed] = useState(false)
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="flex flex-col gap-12">
      <CollapsingHeader
        eyebrow="Issue 46 · Wednesday, November 18, 2026"
        title={`${HUB.name} Weekly`}
        description="Notes from the people who run Kestrel’s systems, teams and sentences. This week: why boring won, what 3 a.m. teaches, and a chart about waiting."
        meta={[
          {
            label: (
              <span className="inline-flex items-center gap-2">
                Edited by <PersonChip id="sol" />
              </span>
            ),
          },
          { label: '6 pieces · about an hour of reading' },
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={href('/learn/home/magazine')}>
                <Archive />
                Past issues
              </a>
            </Button>
            <Button variant={subscribed ? 'soft' : 'outline'} onClick={() => setSubscribed((s) => !s)} aria-pressed={subscribed}>
              {subscribed ? <Check /> : <Mail />}
              {subscribed ? 'In your inbox Wednesdays' : 'Get it by email'}
            </Button>
          </>
        }
      />

      {/* Contents */}
      <nav aria-label="In this issue" className="-mt-4">
        <ol className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-7">
          {CONTENTS.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => jump(c.id)}
                className="group flex w-full items-baseline gap-2 rounded-sm border-t pt-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm font-medium group-hover:text-primary">{c.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Cover story */}
      <section
        id="cover"
        aria-labelledby="cover-title"
        className="grid scroll-mt-24 grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12"
      >
        <a
          href={href('/learn/article')}
          className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={-1}
          aria-hidden
        >
          <ItemCover item={COVER} className="aspect-[4/3] rounded-xl transition-transform duration-300 group-hover:scale-[1.01]">
            <div className="flex size-full items-end p-5">
              <span className="rounded-md bg-background/85 px-2 py-1 font-mono text-xs font-semibold tracking-wide">No. 46 · Cover</span>
            </div>
          </ItemCover>
        </a>
        <div className="flex min-w-0 flex-col gap-5">
          <div className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Cover story · Engineering</div>
          <h2 id="cover-title" className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl">
            Boring won. Now&nbsp;what?
          </h2>
          <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
            Ten years after “innovation tokens,” Ben Achebe re-reads the essay that shaped how we pick our tools, and finds the part it got
            wrong.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <PersonChip id="ben" showRole />
            <span>{COVER.minutes} min read</span>
          </div>
          <blockquote className="border-l-2 border-primary pl-4 text-base leading-7 text-pretty">
            “We were spending an innovation token every single day on Hopper. We just weren’t writing it down.”
          </blockquote>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={href('/learn/article')}>
                Read the story
                <ArrowRight />
              </a>
            </Button>
            <Button variant="ghost" asChild>
              <a href={href('/learn/article')}>The 1-minute version</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Letter + Ask Sol */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section id="letter" aria-labelledby="letter-title" className="flex scroll-mt-24 flex-col gap-5">
          <Dept n="02" name="From the editor" />
          <h2 id="letter-title" className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            On writing it down before breakfast
          </h2>
          <div className="flex max-w-[62ch] flex-col gap-4 text-base leading-7 text-pretty">
            <p className="first-letter:float-left first-letter:mt-1 first-letter:mr-2 first-letter:text-5xl first-letter:leading-[0.85] first-letter:font-semibold first-letter:text-primary">
              Two pieces in this issue arrived separately and turned out to be about the same thing. Ben’s cover story is about a tool we
              kept too long because nobody wrote down what it was costing us. June’s night on Night Shift is about a review she wrote at
              nine the next morning, before she’d had time to make herself look good in it.
            </p>
            <p>
              Both are arguments for the unglamorous habit of writing things down while they are still true. Not the polished version for a
              slide, but the note that says what we’re spending, what we don’t know yet, and when we’ll look again.
            </p>
            <p>
              Elsewhere: Ana has a chart that will make you split your next pull request, and the reading list is short on purpose. If you
              only have ten minutes this week, read the short version of the cover story and listen to the first chapter of Night Shift on
              your way home.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-lg font-semibold tracking-tight italic">Sol</span>
            <span className="text-muted-foreground">Sol Haddad, editor</span>
          </div>
        </section>

        <section id="ask" aria-labelledby="ask-title" className="flex scroll-mt-24 flex-col gap-5">
          <Dept n="03" name="Ask Sol" />
          <Card className="gap-5 bg-highlight-soft/60 ring-highlight/20">
            <CardContent className="flex flex-col gap-5">
              <h2 id="ask-title" className="sr-only">
                Ask Sol
              </h2>
              <p className="text-lg leading-snug font-semibold tracking-tight text-balance text-highlight-soft-foreground">
                “My design docs get a row of LGTMs and no real feedback. How do I get people to actually read them?”
              </p>
              <p className="text-xs text-muted-foreground">Ignored in Infrastructure</p>
              <div className="flex flex-col gap-3 text-sm leading-6 text-pretty">
                <p>
                  Dear Ignored: an LGTM is what people give a document they agree with in general and haven’t read in particular. Make that
                  harder.
                </p>
                <p>
                  Put the decision you need in the first line, as a question with a deadline. Then name two reviewers and give each one a
                  section. “Mara, does section 3 survive a region outage?” gets an answer. “Thoughts?” gets a thumbs-up.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-highlight/20 pt-4">
                <TextLink to="/learn/topic">Write a proposal that gets a decision</TextLink>
                <Button variant="ghost" size="sm">
                  <PenLine />
                  Ask a question
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Departments */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
        <section id="notes" aria-labelledby="notes-title" className="flex scroll-mt-24 flex-col gap-5">
          <Dept n="04" name="Field notes" />
          <h2 id="notes-title" className="sr-only">
            Field notes
          </h2>
          <ul className="flex flex-col divide-y">
            {FIELD_NOTES.map((n) => (
              <li key={n.title} className="flex flex-col gap-1.5 py-4 first:pt-0">
                <span className="text-xs font-medium text-muted-foreground">{n.team}</span>
                <span className="text-base leading-snug font-semibold tracking-tight text-balance">{n.title}</span>
                <span className="text-sm text-pretty text-muted-foreground">{n.body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="chart" aria-labelledby="chart-title" className="flex scroll-mt-24 flex-col gap-5">
          <Dept n="05" name="One chart" />
          <div className="flex flex-col gap-1">
            <h2 id="chart-title" className="text-xl leading-snug font-semibold tracking-tight text-balance">
              Big pull requests wait twelve times longer for a first review
            </h2>
            <p className="text-sm text-muted-foreground">Median hours from opening a pull request to its first review, by size.</p>
          </div>
          <OneChart />
          <p className="text-sm text-pretty">
            The wait isn’t laziness. A 600-line diff needs an hour nobody has between meetings, so it waits for one. Split it, and it gets
            read over coffee. <span className="text-muted-foreground">— Ana Ruiz</span>
          </p>
          <p className="text-xs text-muted-foreground">Kestrel repositories, Aug–Oct 2026 · 9,412 pull requests</p>
        </section>

        <section id="listen" aria-labelledby="listen-title" className="flex scroll-mt-24 flex-col gap-5 md:col-span-2 xl:col-span-1">
          <Dept n="06" name="Night Shift" />
          <a
            href={href('/learn/podcast')}
            className="group flex flex-col gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-row xl:flex-col"
          >
            <Cover seed="night-shift-14" series={5} motif="waves" className="aspect-[16/9] md:w-64 md:shrink-0 xl:w-auto">
              <div className="flex size-full items-end justify-between p-4">
                <span className="text-xs font-semibold tracking-[0.12em] uppercase">Night Shift · 14</span>
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevation-1">
                  <Headphones className="size-5" />
                </span>
              </div>
            </Cover>
            <div className="flex min-w-0 flex-col gap-2">
              <h2 id="listen-title" className="text-xl leading-snug font-semibold tracking-tight group-hover:underline">
                The 3 a.m. rollback
              </h2>
              <p className="text-sm text-pretty text-muted-foreground">
                June rolled back nine minutes in, before anyone knew why. Then the graph didn’t move. Kwame and June on deciding fast and
                saying “I don’t know.”
              </p>
              <p className="text-sm italic">“A time for the next update is worth more than a guess about the cause.”</p>
              <span className="text-xs text-muted-foreground">38 min · 7 chapters · transcript</span>
            </div>
          </a>
        </section>
      </div>

      {/* Reading list */}
      <section
        id="list"
        aria-labelledby="list-title"
        className="grid scroll-mt-24 grid-cols-1 gap-8 border-t pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12"
      >
        <div className="flex flex-col gap-3">
          <Dept n="07" name="Editors’ picks" />
          <h2 id="list-title" className="text-3xl font-semibold tracking-tight">
            The reading list
          </h2>
          <p className="max-w-sm text-sm text-pretty text-muted-foreground">
            Five things, picked by the editors, with a line on why. Nothing here takes longer than a lunch break except the video series,
            and that one’s worth it.
          </p>
        </div>
        <ol className="flex flex-col divide-y">
          {READING.map(({ id, gloss }, i) => {
            const item = ITEM_BY_ID[id]
            return (
              <li key={id}>
                <a
                  href={href(item.path ?? '/learn/topic')}
                  className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 rounded-md py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
                >
                  <span className="font-mono text-3xl leading-none font-light text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-base font-semibold tracking-tight text-balance group-hover:text-primary">{item.title}</span>
                    <span className="text-sm text-pretty text-muted-foreground">{gloss}</span>
                  </span>
                  <span className="col-start-2 flex items-center gap-2 sm:col-start-3 sm:flex-col sm:items-end">
                    <FormatBadge format={item.format} />
                    <span className="text-xs text-muted-foreground tabular-nums">{formatMinutes(item.minutes)}</span>
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Contributors + colophon */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 border-t pt-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="contrib-title" className="flex flex-col gap-5">
          <h2 id="contrib-title" className="text-xs font-semibold tracking-[0.12em] uppercase">
            In this issue
          </h2>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {CONTRIBUTORS.map((c) => (
              <li key={c.id} className="flex flex-col gap-1.5">
                <PersonChip id={c.id} showRole size="md" />
                <span className="pl-10 text-xs text-muted-foreground">{c.did}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="archive-title" className="flex flex-col gap-5">
          <h2 id="archive-title" className="text-xs font-semibold tracking-[0.12em] uppercase">
            From the archive
          </h2>
          <ul className="flex flex-col gap-3">
            {BACK_ISSUES.map((b) => (
              <li key={b.n} className="flex items-baseline gap-3">
                <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">No. {b.n}</span>
                <a
                  href={href('/learn/home/magazine')}
                  className="min-w-0 rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {b.headline}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 rounded-xl bg-muted p-4 text-sm">
            <p className="text-pretty">
              <span className="font-semibold">Got a story?</span> {HUB.name} Weekly is written by people at {HUB.org}. Pitches are three
              sentences, to Sol, by Friday.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <PenLine />
                Pitch a piece
              </Button>
              <Button variant="ghost" size="sm">
                <BellRing />
                Remind me Wednesday
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/** Single-series horizontal bars, labeled directly; the title names the measure. */
function OneChart() {
  const max = Math.max(...CHART.map((d) => d.hours))
  return (
    <figure
      className="flex flex-col gap-2.5"
      role="img"
      aria-label="Median hours to first review: under 50 lines 2.1, 50 to 200 lines 4.8, 200 to 500 lines 11.5, over 500 lines 26."
    >
      {CHART.map((d) => (
        <div
          key={d.label}
          className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3"
          title={`${d.label} lines: ${d.hours} h median`}
        >
          <span className="truncate text-xs text-muted-foreground">{d.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-4 rounded-r-sm" style={{ width: `${(d.hours / max) * 80}%`, background: 'var(--series-1)' }} />
            <span className="text-xs font-medium tabular-nums">{d.hours} h</span>
          </span>
        </div>
      ))}
    </figure>
  )
}
