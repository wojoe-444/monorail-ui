import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ArrowRight, Bookmark, BookmarkCheck, CalendarDays, CircleCheck, Clock, Share2, Users } from 'lucide-react'

import { CollapsingHeader } from '@/components/layout/CollapsingHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FormatBadge, ItemCover, PersonChip } from '@/features/learning/components'
import { FORMAT_LABELS, ITEM_BY_ID, formatMinutes } from '@/features/learning/data'
import { useActiveHeading } from '@/features/wiki/components'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Page 3 · Article. Long-form reading: a calm ~65ch column, the short version
 * up top (most readers never reach the end, so the summary has to stand on
 * its own), sidenotes in the margin on wide screens and inline below that, a
 * pull quote, contents that know where you are, and a reading position.
 */

const ITEM = ITEM_BY_ID['boring-tech']

const SECTIONS = [
  { id: 'said', label: 'What the essay said' },
  { id: 'right', label: 'What it got right' },
  { id: 'missed', label: 'What it missed' },
  { id: 'team', label: 'Boring belongs to the team' },
  { id: 'question', label: 'A better question' },
  { id: 'kestrel', label: 'What we do now' },
]

const TLDR: { text: string; section: string }[] = [
  {
    text: 'The cost of a new tool is mostly paid after launch, at 3 a.m., by whoever is on call. That part of the essay has aged perfectly.',
    section: 'right',
  },
  {
    text: '“Boring” isn’t a property of a technology. It’s a property of a team that has been woken up by it enough times.',
    section: 'team',
  },
  {
    text: 'Staying on a tool nobody understands any more is not the boring choice. It’s spending an innovation token without writing it down.',
    section: 'missed',
  },
  {
    text: 'At Kestrel, every proposal that adds a tool now names its token, its owner and a date we decide whether to keep it.',
    section: 'kestrel',
  },
]

/* ---------- Reading position ---------- */

/** 0–1: how far the article's end has come up the screen. Reads AppShell's scrolling body. */
function useReadingProgress(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const el = ref.current
    const scroller = el?.closest<HTMLElement>('[data-slot="app-body"]')
    if (!el || !scroller) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      const view = scroller.clientHeight
      const travelled = view * 0.35 - rect.top
      setProgress(Math.min(1, Math.max(0, travelled / (rect.height - view * 0.3))))
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      scroller.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ref])
  return progress
}

/* ---------- Prose pieces ---------- */

/** A paragraph, with an optional sidenote: in the margin from xl, under the paragraph below that. */
function P({ children, note, first }: { children: ReactNode; note?: { n: number; body: ReactNode }; first?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 xl:grid-cols-[minmax(0,65ch)_15rem]">
      <p
        className={cn(
          'text-base leading-7 text-pretty sm:text-lg sm:leading-8',
          first &&
            'first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:text-6xl first-letter:leading-[0.85] first-letter:font-semibold first-letter:text-primary',
        )}
      >
        {children}
      </p>
      {note && (
        <aside className="mt-3 flex gap-2 border-l-2 pl-3 text-sm leading-6 text-muted-foreground xl:mt-1.5 xl:border-l-0 xl:pl-0">
          <span className="font-mono text-xs leading-6 font-semibold text-primary">{note.n}</span>
          <span className="min-w-0">{note.body}</span>
        </aside>
      )}
    </div>
  )
}

function Ref({ n }: { n: number }) {
  return (
    <sup className="ml-0.5 font-mono text-xs font-semibold text-primary" aria-label={`Note ${n}`}>
      {n}
    </sup>
  )
}

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-6 max-w-[65ch] scroll-mt-28 text-2xl font-semibold tracking-tight text-balance">
      {children}
    </h2>
  )
}

function PullQuote({ children }: { children: ReactNode }) {
  return (
    <figure className="my-4 max-w-[65ch] border-l-4 border-primary py-1 pl-6 xl:max-w-none">
      <blockquote className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl">{children}</blockquote>
    </figure>
  )
}

/* ---------- Page ---------- */

export function ArticlePage() {
  const articleRef = useRef<HTMLElement>(null)
  const progress = useReadingProgress(articleRef)
  const [ids] = useState(() => SECTIONS.map((s) => s.id))
  const active = useActiveHeading(ids)
  const [saved, setSaved] = useState(false)
  const finished = progress > 0.98
  const minutesLeft = Math.max(1, Math.round(ITEM.minutes * (1 - progress)))
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="flex flex-col gap-8">
      {/* Reading position: a hairline under the top bar. */}
      <div
        role="progressbar"
        aria-label="Reading position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="sticky top-16 z-10 -mx-6 -mt-6 -mb-8 h-0.5 lg:-mx-8 lg:-mt-8"
      >
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      <CollapsingHeader
        eyebrow={`${FORMAT_LABELS.article} · Engineering · Opinion`}
        title={ITEM.title}
        description="Ten years ago an essay gave engineers permission to pick the dull option. It was right about the cost of new things, and quietly wrong about the cost of old ones."
        meta={[
          { label: <PersonChip id="ben" showRole /> },
          { icon: Clock, label: `${ITEM.minutes} min read` },
          { icon: CalendarDays, label: 'Oct 28, 2026' },
          { icon: Users, label: `${ITEM.learners.toLocaleString('en-US')} finished` },
        ]}
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Share link">
                  <Share2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
            <Button variant={saved ? 'soft' : 'outline'} onClick={() => setSaved((s) => !s)} aria-pressed={saved}>
              {saved ? <BookmarkCheck /> : <Bookmark />}
              {saved ? 'Saved' : 'Read later'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
        {/* Contents + where you are */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-6">
            <nav aria-label="Contents">
              <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contents</div>
              <ol className="flex flex-col border-l">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => jump(s.id)}
                      className={cn(
                        '-ml-px flex w-full gap-2 border-l-2 py-1.5 pl-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active === s.id && progress > 0.02
                          ? 'border-primary font-medium text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="font-mono text-xs leading-5 tabular-nums opacity-60">{i + 1}</span>
                      {s.label}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">
                {finished ? 'Finished' : `${Math.round(progress * 100)}% read`}
              </span>
              <span>{finished ? 'Added to your record' : `About ${minutesLeft} min left`}</span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-10">
          {/* The short version */}
          <section aria-labelledby="tldr" className="max-w-[65ch] rounded-xl border border-primary/15 bg-primary-soft/50 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="tldr" className="text-xs font-semibold tracking-[0.08em] text-primary-soft-foreground uppercase">
                The short version
              </h2>
              <span className="text-xs text-muted-foreground">1 min · if you read nothing else</span>
            </div>
            <ol className="mt-4 flex flex-col gap-3">
              {TLDR.map((t, i) => (
                <li key={t.section} className="flex gap-3 text-sm leading-6">
                  <span className="font-mono text-xs leading-6 font-semibold text-primary">{i + 1}</span>
                  <span className="min-w-0">
                    {t.text}{' '}
                    <button
                      type="button"
                      onClick={() => jump(t.section)}
                      className="inline-flex items-center gap-0.5 rounded-sm font-medium whitespace-nowrap text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      The argument
                      <ArrowRight className="size-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <article ref={articleRef} className="flex flex-col gap-6">
            <H2 id="said">What the essay said</H2>
            <P first>
              Back in 2015, Dan McKinley published a short essay called “Choose Boring Technology,” and for a decade it has been the
              most-forwarded link in architecture reviews here and almost everywhere else. Its central image was simple. Every team gets a
              small number of innovation tokens, maybe three. Adopting something new and unproven spends one. Spend them on the things that
              make your product different, and use the dull, well-understood option for everything else.
            </P>
            <P
              note={{
                n: 1,
                body: 'Our 2019 architecture guide quoted it twice and linked it four times. The guide is still in the wiki, with a banner asking you not to follow it.',
              }}
            >
              I was one of the people forwarding it. When I joined Kestrel we had seven ways to run a background job, and the essay gave me
              a vocabulary for saying no to an eighth without sounding like I was saying no to the person proposing it.
              <Ref n={1} /> It turned taste into a budget, and budgets are much easier to argue about than taste.
            </P>
            <P>
              Ten years is long enough to check the work. Some of the essay reads as if it was written last week. Some of it, I think, has
              done quiet damage, mostly because of how we used it rather than what it said.
            </P>

            <H2 id="right">What it got right</H2>
            <P>
              The essay’s best insight was about where costs land. A new database is cheap on the day you adopt it. The bill arrives later,
              spread across people who weren’t in the meeting: the on-call engineer reading a stack trace from a driver nobody has seen
              before, the new hire who can’t find an answer online, the security team writing a patching process from scratch.
            </P>
            <P
              note={{
                n: 2,
                body: 'From our incident reviews, Jan 2024 – Sep 2026. “Involved” means the component was named in the timeline, not that it caused the incident.',
              }}
            >
              Our own incident history agrees. Of the 41 incidents we classed as severe in the last three years, 29 involved a component
              that fewer than three people at Kestrel could confidently operate.
              <Ref n={2} /> Not because unfamiliar tools are worse, but because when they misbehave the time between “something is wrong”
              and “I know what is wrong” stretches from minutes into hours.
            </P>
            <P>
              The other thing it got right was the cost of variety itself. Two queues are not twice as much work as one; they are more,
              because every shared concern, from monitoring to backups to the runbook, now has to be solved twice and kept in sync forever.
            </P>

            <H2 id="missed">What it missed</H2>
            <P>
              Here is where I have changed my mind. The essay treated “boring” as a fixed property of a technology, something you could look
              up. And it treated not changing as free. Neither holds up.
            </P>
            <P
              note={{
                n: 3,
                body: 'Hopper was retired in March 2025. Its last commit message, from 2021, reads “temporary fix, revisit after launch.”',
              }}
            >
              Consider Hopper, the job runner we wrote in 2017. By any outside measure it was boring: a few thousand lines, built on
              Postgres, no exotic dependencies. By 2023 the two people who understood it had left, and it had become the most frightening
              system we ran.
              <Ref n={3} /> Every proposal to replace it was turned down with a link to the boring-technology essay, because the replacement
              was new and Hopper was old.
            </P>
            <P>
              We were spending an innovation token every single day on Hopper. We just weren’t writing it down. The essay gave us a word for
              the risk of change and no word at all for the risk of standing still.
            </P>

            <PullQuote>
              Boring isn’t a property of a technology. It’s a property of a team that has been woken up by it enough times.
            </PullQuote>

            <H2 id="team">Boring belongs to the team</H2>
            <P>
              A tool is boring for you when its failure modes are known <em>to you</em>: when somebody nearby has seen it break, fixed it,
              and written down how. Postgres is boring for our Platform team and was genuinely exotic for the three-person team that ran
              Hopper. Kafka is boring at a company with a streaming group and terrifying at one without.
            </P>
            <P
              note={{
                n: 4,
                body: 'The Failure Modes series covers this better than I can. Episode 3, “The queue that ate Tuesday,” is the Hopper story told by the people who were paged.',
              }}
            >
              That reframing changes the question from “is this technology mature?” to “how much does this team know about how it breaks,
              and how fast can it learn the rest?”
              <Ref n={4} /> The first question has one answer for the whole industry. The second has a different answer for every team, and
              it can change: you can make something boring on purpose, by investing in it.
            </P>

            <H2 id="question">A better question</H2>
            <P>
              When a team brings me a proposal now, I ask one thing before anything else: what will this be like at 3 a.m.? Who gets paged,
              what do they see, and where do they look first? If the answer is a name, a dashboard and a runbook, the tool is boring enough,
              however new it is. If the answer is a shrug, it isn’t, however old it is.
            </P>
            <P>
              It is a deliberately uncomfortable question, because it can’t be answered by citing popularity or age. It can only be answered
              by someone who has thought about operating the thing, which is exactly the thinking the original essay wanted to provoke.
            </P>

            <H2 id="kestrel">What we do now</H2>
            <P note={{ n: 5, body: 'The template lives in “Write a proposal that gets a decision.” The token note is the third heading.' }}>
              We kept the tokens and added bookkeeping. Every proposal that adds a tool, or keeps one past its review date, includes a short
              token note: what we are spending, who owns it, what 3 a.m. looks like, and the date we will decide whether to keep it.
              <Ref n={5} /> Each team holds three tokens. Retiring something hands one back.
            </P>
            <P>
              The results are unglamorous, which is the point. We have adopted two new things this year and retired four. Nobody has
              forwarded me the essay in months. I think that means it finally worked.
            </P>
          </article>

          {/* End of article */}
          <Card className={cn('max-w-[65ch] transition-colors', finished && 'ring-success/40')}>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  finished ? 'bg-success-soft text-success-soft-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                <CircleCheck className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{finished ? 'You finished it. Most people don’t.' : 'Reached the end?'}</div>
                <p className="text-sm text-muted-foreground">
                  {finished
                    ? 'Added to your learning record. Ben reads every reply in #eng-architecture.'
                    : 'Scroll to the end and we’ll add it to your record.'}
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href={href('/learn/progress')}>My learning</a>
              </Button>
            </CardContent>
          </Card>

          <ReadNext />
        </div>
      </div>
    </div>
  )
}

const NEXT: { id: string; why: string }[] = [
  { id: 'failure-modes', why: 'The Hopper outage, told by the people who were paged.' },
  { id: 'which-store', why: 'The token question, turned into four questions and an answer.' },
  { id: 'proposal', why: 'Where the token note lives, and how to write one.' },
]

function ReadNext() {
  return (
    <section aria-labelledby="read-next" className="flex flex-col gap-4 border-t pt-8">
      <h2 id="read-next" className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Read next
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {NEXT.map(({ id, why }) => {
          const item = ITEM_BY_ID[id]
          return (
            <a
              key={id}
              href={href(item.path ?? '/learn/pages')}
              className="group flex flex-col gap-3 rounded-xl p-2 -m-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ItemCover item={item} className="aspect-[16/9]" />
              <div className="flex flex-wrap items-center gap-2">
                <FormatBadge format={item.format} />
                <span className="text-xs text-muted-foreground">{formatMinutes(item.minutes)}</span>
                {item.progress !== undefined && item.progress < 100 && <Badge variant="primary">{item.progress}% done</Badge>}
              </div>
              <div className="text-base font-semibold tracking-tight text-balance group-hover:underline">{item.title}</div>
              <p className="text-sm text-muted-foreground">{why}</p>
            </a>
          )
        })}
      </div>
    </section>
  )
}
