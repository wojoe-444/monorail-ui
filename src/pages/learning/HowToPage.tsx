import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  Check,
  SearchCheck,
  Copy,
  Flag,
  KeyRound,
  OctagonAlert,
  Pause,
  Play,
  RotateCcw,
  Siren,
  ThumbsDown,
  ThumbsUp,
  Timer,
  TriangleAlert,
  Wrench,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FormatBadge, PersonChip } from '@/features/learning/components'
import { ITEM_BY_ID } from '@/features/learning/data'
import { readJson, writeJson } from '@/lib/prefs'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Mockup 1 · How-to. A procedure you follow while doing it, under pressure:
 * what to have ready, seven numbered steps you tick off, the exact commands
 * (with your key's name filled in), a check after each step and a clock
 * against the ten-minute promise. The format's weakness is that it goes stale,
 * so the page says when it was last verified, against what, and lets the
 * reader flag the step that no longer matches.
 */

const ITEM = ITEM_BY_ID['rotate-keys']
const STORE = 'learning.howto.rotate-keys'
const BUDGET_SECONDS = 10 * 60
const PLACEHOLDER = 'payments/stripe-live'

interface Step {
  id: string
  title: string
  body: ReactNode
  /** Commands to run, `{key}` is replaced with the secret's path. */
  commands?: string[]
  check: ReactNode
  callout?: { tone: 'warning' | 'destructive'; title: string; body: ReactNode }
  minutes: number
}

const STEPS: Step[] = [
  {
    id: 'declare',
    title: 'Declare an incident',
    body: (
      <>
        Do this first, even if you think you can fix it alone. The incident bot opens a channel, pages the security on-call and starts the
        timeline you will need in step 7.
      </>
    ),
    commands: ['/incident new sev2 "Leaked secret: {key}"'],
    check: (
      <>
        A channel named <code className="font-mono text-xs">#inc-</code> followed by a number appears, and the security on-call joins it
        within five minutes.
      </>
    ),
    minutes: 1,
  },
  {
    id: 'describe',
    title: 'Find out what the key can do',
    body: <>Look up the secret’s owner, scopes and when it was last used. Paste the output into the incident channel.</>,
    commands: ['kv secrets describe {key} --show-scopes'],
    check: (
      <>
        An <code className="font-mono text-xs">owner</code>, a list of <code className="font-mono text-xs">scopes</code> and a{' '}
        <code className="font-mono text-xs">last_used</code> time. Note the current <code className="font-mono text-xs">version</code>: you
        revoke it in step 5.
      </>
    ),
    minutes: 1,
  },
  {
    id: 'issue',
    title: 'Issue a new version beside the old one',
    body: (
      <>
        Create the replacement while the leaked version keeps working, so production doesn’t go down while you rotate. If the key comes from
        a provider (Stripe, Twilio, AWS), roll it there first and pass the new value with{' '}
        <code className="font-mono text-xs">--from-stdin</code>.
      </>
    ),
    commands: ['kv secrets rotate {key} --keep-previous 30m'],
    check: (
      <>
        <code className="font-mono text-xs">version 8 created · version 7 still active for 30m</code>. The numbers will differ; there should
        be two active versions.
      </>
    ),
    callout: {
      tone: 'warning',
      title: 'Don’t revoke first',
      body: <>Revoking before the new version is deployed stops every service that reads this secret. Payments fail within seconds.</>,
    },
    minutes: 2,
  },
  {
    id: 'deploy',
    title: 'Restart the services that use it',
    body: <>Services read secrets at start-up. Restart everything that mounts this one, one zone at a time.</>,
    commands: ['kestrel deploy restart --uses-secret {key} --env prod', 'kestrel deploy status --uses-secret {key}'],
    check: (
      <>
        Every row reads <code className="font-mono text-xs">ready</code> with <code className="font-mono text-xs">secret v8</code>. Any row
        still on v7 after three minutes: stop and ask in the incident channel.
      </>
    ),
    minutes: 3,
  },
  {
    id: 'revoke',
    title: 'Revoke the leaked version',
    body: <>Now nothing should depend on the old version. Revoke it, and give the incident number as the reason.</>,
    commands: ['kv secrets revoke {key} --version 7 --reason "leaked, INC-2291"'],
    check: (
      <>
        <code className="font-mono text-xs">version 7 revoked</code>, and a request with the old value returns{' '}
        <code className="font-mono text-xs">401 Unauthorized</code>.
      </>
    ),
    callout: {
      tone: 'destructive',
      title: 'This can’t be undone',
      body: <>Check the version number twice. Revoking the new version by mistake takes production down and needs a second rotation.</>,
    },
    minutes: 1,
  },
  {
    id: 'audit',
    title: 'Look for anyone who used it',
    body: <>Pull every call made with the leaked version since it was exposed. Calls from our own services are expected.</>,
    commands: ['kv audit --secret {key} --version 7 --since 72h --group-by source'],
    check: (
      <>
        Only sources inside <code className="font-mono text-xs">10.0.0.0/8</code> or named Kestrel services. Anything else: post it in the
        incident channel and leave the digging to security.
      </>
    ),
    minutes: 1,
  },
  {
    id: 'close',
    title: 'Clean up where it leaked, and write it down',
    body: (
      <>
        Delete the message or paste. If it was pushed to git, don’t rewrite history yourself: security scrubs it with the mirror owners. Add
        the four times to the timeline, then resolve.
      </>
    ),
    commands: ['/incident timeline add "leaked 14:02 · detected 14:09 · rotated 14:15 · revoked 14:16"', '/incident resolve'],
    check: <>The incident shows Resolved, with a timeline from leak to revoke. Security will book a 15-minute review with you.</>,
    minutes: 1,
  },
]

function fmtClock(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1400)
    return () => window.clearTimeout(t)
  }, [copied])
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg border bg-muted/60 py-1 pr-1 pl-3">
      <span aria-hidden className="shrink-0 py-1.5 font-mono text-xs text-muted-foreground select-none">
        $
      </span>
      <code className="min-w-0 flex-1 py-1.5 font-mono text-xs break-all whitespace-pre-wrap sm:overflow-x-auto sm:break-normal sm:whitespace-pre">
        {command}
      </code>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={copied ? 'Copied' : 'Copy command'}
            onClick={() => {
              void navigator.clipboard?.writeText(command).catch(() => undefined)
              setCopied(true)
            }}
          >
            {copied ? <Check className="text-success" /> : <Copy />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copied' : 'Copy'}</TooltipContent>
      </Tooltip>
    </div>
  )
}

function StepCallout({ tone, title, children }: { tone: 'warning' | 'destructive'; title: string; children: ReactNode }) {
  const Icon = tone === 'warning' ? TriangleAlert : OctagonAlert
  return (
    <div
      role="note"
      className={cn(
        'flex gap-3 rounded-lg border-l-4 p-3 text-sm',
        tone === 'warning'
          ? 'border-warning bg-warning-soft text-warning-soft-foreground'
          : 'border-destructive bg-destructive-soft text-destructive-soft-foreground',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 opacity-90">{children}</div>
      </div>
    </div>
  )
}

interface Saved {
  done: string[]
  key: string
  elapsed: number
}

export function HowToPage() {
  const [saved] = useState(() => readJson<Saved>(STORE, { done: ['declare', 'describe'], key: '', elapsed: 194 }))
  const [done, setDone] = useState<Set<string>>(() => new Set(saved.done))
  const [secret, setSecret] = useState(saved.key)
  const [elapsed, setElapsed] = useState(saved.elapsed)
  const [running, setRunning] = useState(saved.done.length > 0 && saved.done.length < STEPS.length)
  const [flagged, setFlagged] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<'yes' | 'partly' | 'no' | null>(null)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearInterval(t)
  }, [running])

  useEffect(() => {
    writeJson(STORE, { done: [...done], key: secret, elapsed })
  }, [done, secret, elapsed])

  const keyPath = secret.trim() || PLACEHOLDER
  const count = done.size
  const allDone = count === STEPS.length
  const current = STEPS.find((s) => !done.has(s.id))
  const remainingMinutes = STEPS.filter((s) => !done.has(s.id)).reduce((n, s) => n + s.minutes, 0)
  const over = elapsed > BUDGET_SECONDS

  useEffect(() => {
    if (allDone) setRunning(false)
  }, [allDone])

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (!running && !allDone) setRunning(true)
  }

  const reset = () => {
    setDone(new Set())
    setElapsed(0)
    setRunning(false)
    setVerdict(null)
    setSent(false)
    setNote('')
  }

  const scrollTo = (id: string) => document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const clock = useMemo(
    () => (
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums',
            over ? 'text-destructive' : 'text-foreground',
          )}
          aria-live="off"
        >
          <Timer className="size-4 text-muted-foreground" />
          {fmtClock(elapsed)}
        </div>
        <span className="text-xs text-muted-foreground">of 10:00</span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-8"
          aria-label={running ? 'Pause timer' : 'Start timer'}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? <Pause /> : <Play />}
        </Button>
      </div>
    ),
    [elapsed, over, running],
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <FormatBadge format="howto" />
          <Badge variant="outline">Security</Badge>
          <Badge variant="outline">
            {ITEM.parts} steps · about {ITEM.minutes} min
          </Badge>
        </div>
        <PageHeader
          title={ITEM.title}
          description="Follow along while you do it. Tick each step when its check passes; your place is kept if you close the tab."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw />
                Start over
              </Button>
              <Button variant="outline" size="sm" onClick={() => document.getElementById('before')?.scrollIntoView({ behavior: 'smooth' })}>
                <Siren />
                Who to page
              </Button>
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <PersonChip id={ITEM.author} showRole />
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <BadgeCheck className="size-4 text-success" />
            Verified Nov 12, 2026 against <code className="font-mono text-xs">kv 3.4</code> and{' '}
            <code className="font-mono text-xs">kestrel 2.19</code>
          </span>
          <span className="text-muted-foreground">Used {ITEM.learners} times in 90 days</span>
        </div>
      </div>

      {/* Phone: a sticky progress strip. */}
      <div className="sticky top-16 z-[5] -mx-6 flex items-center gap-3 border-b bg-background/85 px-6 py-2 backdrop-blur lg:hidden">
        <span className="text-sm font-medium tabular-nums">
          {count}/{STEPS.length}
        </span>
        <Progress value={(count / STEPS.length) * 100} className="flex-1" indicatorClassName={allDone ? 'bg-success' : undefined} />
        <span className={cn('font-mono text-sm tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')}>
          {fmtClock(elapsed)}
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <Card id="before" className="scroll-mt-24 gap-0 py-0">
            <div className="flex items-center gap-2 border-b px-5 py-3">
              <Wrench className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Before you start</h2>
              <span className="ml-auto text-xs text-muted-foreground">30 seconds</span>
            </div>
            <CardContent className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">You need</h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      The <code className="font-mono text-xs">kv</code> CLI signed in with the{' '}
                      <code className="font-mono text-xs">secrets:rotate</code> role
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>Deploy rights for the service that owns the key</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>A link to where it leaked (commit, message, paste)</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Who to page</h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  <li>
                    <span className="font-medium">Security on-call</span>{' '}
                    <span className="text-muted-foreground">
                      always, via <code className="font-mono text-xs">/page sec-primary</code>
                    </span>
                  </li>
                  <li>
                    <span className="font-medium">Owning team’s on-call</span>{' '}
                    <span className="text-muted-foreground">before step 4 restarts their services</span>
                  </li>
                  <li>
                    <span className="font-medium">Privacy desk</span>{' '}
                    <span className="text-muted-foreground">only if the key can read customer data</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="secret-path" className="flex items-center gap-1.5">
                  <KeyRound className="size-4 text-muted-foreground" />
                  The leaked secret’s path
                </Label>
                <Input
                  id="secret-path"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={PLACEHOLDER}
                  className="font-mono text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">Every command below fills it in, so you can copy them as they are.</p>
              </div>
            </CardContent>
          </Card>

          <ol className="flex flex-col">
            {STEPS.map((step, i) => {
              const isDone = done.has(step.id)
              const isCurrent = current?.id === step.id
              const last = i === STEPS.length - 1
              return (
                <li key={step.id} id={`step-${step.id}`} className="relative flex scroll-mt-28 gap-3 pb-6 last:pb-0 sm:gap-4 sm:pb-8">
                  {!last && (
                    <span aria-hidden className={cn('absolute top-9 bottom-0 left-[15px] w-0.5', isDone ? 'bg-primary' : 'bg-border')} />
                  )}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isDone}
                    aria-label={`Step ${i + 1} done: ${step.title}`}
                    onClick={() => toggle(step.id)}
                    className={cn(
                      'relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                      isDone
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isCurrent
                          ? 'border-primary bg-card text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/60',
                    )}
                  >
                    {isDone ? <Check className="size-4" /> : i + 1}
                  </button>

                  <div
                    className={cn(
                      'flex min-w-0 flex-1 flex-col gap-3 rounded-xl p-3.5 transition-colors sm:p-5',
                      isCurrent ? 'bg-card ring-2 ring-primary/40' : 'bg-card ring-1 ring-foreground/10',
                      isDone && 'opacity-70',
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h2 className={cn('text-base font-semibold', isDone && 'line-through decoration-muted-foreground/60')}>
                        {step.title}
                      </h2>
                      <span className="text-xs text-muted-foreground tabular-nums">~{step.minutes} min</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    {step.callout && (
                      <StepCallout tone={step.callout.tone} title={step.callout.title}>
                        {step.callout.body}
                      </StepCallout>
                    )}
                    {step.commands && (
                      <div className="flex flex-col gap-2">
                        {step.commands.map((c) => (
                          <CopyCommand key={c} command={c.replaceAll('{key}', keyPath)} />
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-sm">
                      <SearchCheck className="mt-0.5 size-4 shrink-0 text-info" />
                      <div className="min-w-0">
                        <span className="font-medium">Check: you should see </span>
                        <span className="text-muted-foreground">{step.check}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant={isCurrent ? 'default' : 'outline'} onClick={() => toggle(step.id)}>
                        <Check />
                        {isDone ? 'Done, undo' : 'Check passed, done'}
                      </Button>
                      {flagged === step.id ? (
                        <span className="text-xs text-muted-foreground">Thanks. June gets a note with the step and what you saw.</span>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setFlagged(step.id)}>
                          <Flag />
                          Step looks wrong
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          <Card className="gap-4 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold">Did it work?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {allDone
                  ? `All seven steps in ${fmtClock(elapsed)}. ${over ? 'Over the ten minutes: what slowed you down?' : 'Inside ten minutes.'}`
                  : 'Tell June when you’re through, or where you got stuck. This page is only right if people say when it isn’t.'}
              </p>
            </div>
            {sent ? (
              <div className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-sm text-success-soft-foreground">
                <Check className="size-4" />
                Sent to June Park. You’ll hear back if the page changes.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={verdict === 'yes' ? 'soft' : 'outline'}
                    size="sm"
                    onClick={() => setVerdict('yes')}
                    aria-pressed={verdict === 'yes'}
                  >
                    <ThumbsUp />
                    Yes, key rotated
                  </Button>
                  <Button
                    variant={verdict === 'partly' ? 'soft' : 'outline'}
                    size="sm"
                    onClick={() => setVerdict('partly')}
                    aria-pressed={verdict === 'partly'}
                  >
                    Partly
                  </Button>
                  <Button
                    variant={verdict === 'no' ? 'soft' : 'outline'}
                    size="sm"
                    onClick={() => setVerdict('no')}
                    aria-pressed={verdict === 'no'}
                  >
                    <ThumbsDown />
                    No, I got stuck
                  </Button>
                </div>
                {verdict && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="howto-note">
                      {verdict === 'yes' ? 'Anything we should change? (optional)' : 'Which step, and what did you see?'}
                    </Label>
                    <Textarea
                      id="howto-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        verdict === 'yes' ? 'Step 4 took longer than three minutes because…' : 'Step 4: kestrel deploy status showed…'
                      }
                    />
                    <div>
                      <Button size="sm" variant="secondary" onClick={() => setSent(true)}>
                        Send to June
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <div className="flex flex-col gap-3 border-t pt-6 text-sm">
            <h2 className="font-semibold">After the incident</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a href={href('/learn/podcast')} className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent">
                <div className="font-medium">Night Shift, ep. 14: The 3 a.m. rollback</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Writing it up after, without blame · 38 min</div>
              </a>
              <a href={href('/learn/live')} className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent">
                <div className="font-medium">Threat modeling in 30 minutes</div>
                <div className="mt-0.5 text-xs text-muted-foreground">So the next secret never leaks · live, Nov 16</div>
              </a>
            </div>
          </div>
        </div>

        {/* Desktop: progress rail. */}
        <aside className="sticky top-24 hidden flex-col gap-4 lg:flex">
          <Card className="gap-4 p-4">
            {clock}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium tabular-nums">
                  {count} of {STEPS.length} done
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{allDone ? 'Finished' : `~${remainingMinutes} min left`}</span>
              </div>
              <Progress value={(count / STEPS.length) * 100} indicatorClassName={allDone ? 'bg-success' : undefined} />
            </div>
            {over && !allDone && (
              <p className="flex gap-2 text-xs text-warning-soft-foreground">
                <TriangleAlert className="size-3.5 shrink-0" />
                Past ten minutes. Keep going: correct beats fast.
              </p>
            )}
            <nav aria-label="Steps">
              <ol className="flex flex-col gap-0.5">
                {STEPS.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(s.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                        current?.id === s.id
                          ? 'bg-primary-soft font-medium text-primary-soft-foreground'
                          : done.has(s.id)
                            ? 'text-muted-foreground'
                            : '',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums',
                          done.has(s.id) ? 'bg-primary text-primary-foreground' : 'border',
                        )}
                      >
                        {done.has(s.id) ? <Check className="size-3" /> : i + 1}
                      </span>
                      <span className="truncate">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </Card>
          <div className="flex flex-col gap-2 px-1 text-xs text-muted-foreground">
            <span>
              Owner <span className="font-medium text-foreground">June Park</span>, Security
            </span>
            <span>Last verified Nov 12 · reviewed every 60 days</span>
            <span>Next review Jan 11, 2027</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
