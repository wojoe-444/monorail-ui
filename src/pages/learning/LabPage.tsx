import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Check,
  CircleCheck,
  CircleDashed,
  CircleX,
  FileCode2,
  Lightbulb,
  Lock,
  LogOut,
  RotateCcw,
  SquareTerminal,
  Timer,
  ToggleRight,
  TriangleAlert,
  Wand2,
} from 'lucide-react'

import { PageCommandBar } from '@/components/layout/PageCommandBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PersonChip } from '@/features/learning/components'
import { ITEM_BY_ID } from '@/features/learning/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Mockup 9 · Hands-on lab (layout: 'full'). Instructions on the left, a
 * simulated sandbox on the right: the change in an editor, a terminal that
 * takes real-looking commands, and a rollout panel whose error-rate graph
 * reacts to the percentage you pick. "Check my work" validates the current
 * task against the sandbox's state. Priya is on task 3 of 5. The story has a
 * twist on purpose: the new code has a bug that only shows as you roll out,
 * because that's the lesson flags exist to teach.
 */

const ITEM = ITEM_BY_ID['flags-lab']
const FLAG = 'checkout.new-summary'
const BUDGET = 0.5
const STARTED_SECONDS = 11 * 60 + 42
const SETTLE_SECONDS = 8

type TaskId = 'create' | 'wrap' | 'roll' | 'rollback' | 'fix'

interface Task {
  id: TaskId
  title: string
  short: string
  body: ReactNode
  hints: ReactNode[]
}

const code = (s: string) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{s}</code>

const TASKS: Task[] = [
  {
    id: 'create',
    title: 'Create the flag',
    short: 'Create the flag',
    body: <>Create {code(FLAG)}, off by default, owned by your team. A flag nobody owns never gets cleaned up.</>,
    hints: [<>Run {code(`kflags create ${FLAG} --default off --owner payments`)}.</>],
  },
  {
    id: 'wrap',
    title: 'Wrap the new summary in the flag',
    short: 'Wrap the change',
    body: (
      <>
        In {code('OrderSummary.tsx')}, render {code('NewSummary')} only when the flag is on for this user. Keep the old component as the
        default path.
      </>
    ),
    hints: [<>Pass the user to {code('flags.enabled')} so the rollout is sticky per person, not per page load.</>],
  },
  {
    id: 'roll',
    title: 'Roll out to 5% and read the graph',
    short: 'Roll out to 5%',
    body: (
      <>
        <p>
          Turn the flag on for 5% of checkouts. Five percent is enough traffic to see a problem and small enough that a problem is cheap.
        </p>
        <p>
          Then wait for the error rate to settle before you call it. The sandbox runs time 15× faster: {SETTLE_SECONDS} seconds here is two
          minutes of real traffic.
        </p>
      </>
    ),
    hints: [
      <>Drag the rollout slider, or run {code(`kflags set ${FLAG} --rollout 5`)} in the terminal.</>,
      <>The budget line is 0.5%. Look at where the line is heading, not where it is the moment you change it.</>,
    ],
  },
  {
    id: 'rollback',
    title: 'Find the bug, then roll back',
    short: 'Find it, roll back',
    body: (
      <>
        <p>
          At 5% the error rate crept up but stayed under budget. That creep is the signal. Push to 25% for a moment and it’s obvious: the
          new summary fails for some orders.
        </p>
        <p>
          Read the logs for checkouts on the new path to find which ones, then roll back to 0%. Rolling back is the point of the flag: no
          deploy, no revert.
        </p>
      </>
    ),
    hints: [<>Run {code('klog tail checkout --flag on')}.</>, <>Every failing order has a gift card field of {code('null')}.</>],
  },
  {
    id: 'fix',
    title: 'Fix it and go to 100%',
    short: 'Fix, then 100%',
    body: (
      <>
        <p>
          Open {code('NewSummary.tsx')} and guard the gift card balance. Then roll forward again, in steps: 5%, 25%, 100%, watching the
          graph each time.
        </p>
      </>
    ),
    hints: [
      <>Use the suggested fix in the editor’s NewSummary tab.</>,
      <>Errors should stay flat at every step. If they don’t, roll back.</>,
    ],
  },
]

/* ---------- Simulation ---------- */

function targetError(rollout: number, fixed: boolean) {
  return 0.18 + (fixed ? 0.002 : 0.042) * rollout
}

function seedSeries(n: number) {
  return Array.from({ length: n }, (_, i) => 0.18 + Math.sin(i * 1.7) * 0.015 + ((i * 37) % 7) * 0.004)
}

type Line = { kind: 'in' | 'out' | 'ok' | 'err' | 'dim'; text: string }

const INITIAL_LINES: Line[] = [
  { kind: 'dim', text: '# task 1' },
  { kind: 'in', text: `kflags create ${FLAG} --default off --owner payments` },
  { kind: 'ok', text: `✓ created ${FLAG} (off, owner: payments)` },
  { kind: 'dim', text: '# task 2' },
  { kind: 'in', text: 'git diff --stat' },
  { kind: 'out', text: ' src/checkout/OrderSummary.tsx | 6 ++++--' },
  { kind: 'in', text: 'npm test -- checkout' },
  { kind: 'ok', text: '✓ 24 passed (2.1s)' },
  { kind: 'dim', text: '# task 3 · type "help" for commands' },
]

const INITIAL_HISTORY = [
  { at: 6 * 60 + 10, text: 'Flag created, off' },
  { at: 10 * 60 + 55, text: 'Wrapped OrderSummary, tests passed' },
]

function fmtClock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function errorTone(v: number) {
  if (v > BUDGET) return { label: 'Over budget', className: 'text-destructive', icon: CircleX }
  if (v > BUDGET * 0.75) return { label: 'Close to budget', className: 'text-warning-soft-foreground', icon: TriangleAlert }
  return { label: 'Within budget', className: 'text-success', icon: CircleCheck }
}

/* ---------- Page ---------- */

export function LabPage() {
  const [taskIndex, setTaskIndex] = useState(2)
  const [viewing, setViewing] = useState(2)
  const [hints, setHints] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ ok: boolean; text: ReactNode } | null>(null)
  const [elapsed, setElapsed] = useState(STARTED_SECONDS)
  const [pane, setPane] = useState<'instructions' | 'sandbox'>('instructions')

  const [rollout, setRolloutState] = useState(0)
  const [settled, setSettled] = useState(0)
  const [series, setSeries] = useState(() => seedSeries(48))
  const [lines, setLines] = useState<Line[]>(INITIAL_LINES)
  const [readLogs, setReadLogs] = useState(false)
  const [fixed, setFixed] = useState(false)
  const [peak, setPeak] = useState(0)
  const [history, setHistory] = useState(INITIAL_HISTORY)

  useEffect(() => {
    const t = window.setInterval(() => {
      setElapsed((e) => e + 1)
      setSettled((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(t)
  }, [])

  // The error-rate series eases toward the level the rollout implies, with noise.
  const rolloutRef = useRef(rollout)
  const fixedRef = useRef(fixed)
  useEffect(() => {
    rolloutRef.current = rollout
    fixedRef.current = fixed
  }, [rollout, fixed])
  useEffect(() => {
    let n = 0
    const t = window.setInterval(() => {
      n++
      setSeries((prev) => {
        const last = prev[prev.length - 1]
        const target = targetError(rolloutRef.current, fixedRef.current)
        const noise = (Math.sin(n * 2.3) + Math.sin(n * 0.7)) * 0.012 * (1 + target)
        return [...prev.slice(1), Math.max(0.05, last + (target - last) * 0.28 + noise)]
      })
    }, 500)
    return () => window.clearInterval(t)
  }, [])

  const current = series[series.length - 1]
  const task = TASKS[taskIndex]
  const shown = TASKS[viewing]

  const setRollout = (v: number, from: 'slider' | 'terminal' = 'slider') => {
    const next = Math.max(0, Math.min(100, Math.round(v)))
    if (next === rollout) return
    setRolloutState(next)
    setSettled(0)
    setPeak((p) => Math.max(p, next))
    setHistory((h) => [...h, { at: elapsed, text: `${rollout}% → ${next}%${from === 'terminal' ? ' (terminal)' : ''}` }])
    setResult(null)
    if (from === 'slider') {
      setLines((l) => [
        ...l,
        { kind: 'dim', text: `# from the rollout panel` },
        { kind: 'in', text: `kflags set ${FLAG} --rollout ${next}` },
        { kind: 'ok', text: `✓ ${FLAG} → ${next}%` },
      ])
    }
  }

  const run = (raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return
    const out: Line[] = [{ kind: 'in', text: cmd }]
    const set = cmd.match(/^kflags\s+set\s+(\S+)\s+--rollout\s+(\d+)%?$/)
    if (cmd === 'clear') {
      setLines([])
      return
    } else if (cmd === 'help') {
      out.push(
        { kind: 'out', text: `kflags status ${FLAG}` },
        { kind: 'out', text: `kflags set ${FLAG} --rollout <0-100>` },
        { kind: 'out', text: 'klog tail checkout [--flag on]' },
        { kind: 'out', text: 'clear' },
      )
    } else if (set) {
      if (set[1] !== FLAG) out.push({ kind: 'err', text: `✗ no flag named ${set[1]}` })
      else {
        const v = Math.min(100, +set[2])
        setRollout(v, 'terminal')
        out.push({ kind: 'ok', text: `✓ ${FLAG} → ${v}%` })
      }
    } else if (/^kflags\s+status/.test(cmd)) {
      out.push(
        { kind: 'out', text: `${FLAG}  rollout ${rollout}%  owner payments  sticky by user.id` },
        { kind: 'out', text: `errors (1m) ${current.toFixed(2)}%  budget ${BUDGET}%` },
      )
    } else if (/^klog\s+tail\s+checkout/.test(cmd)) {
      const onlyNew = /--flag\s+on/.test(cmd)
      if (rollout === 0 && !onlyNew) out.push({ kind: 'out', text: '200 POST /checkout/summary 41ms  (legacy)' })
      else if (rollout === 0) out.push({ kind: 'dim', text: 'no traffic on the new path: rollout is 0%' })
      else if (fixed)
        out.push(
          { kind: 'out', text: '200 POST /checkout/summary 38ms  flag=on' },
          { kind: 'out', text: '200 POST /checkout/summary 44ms  flag=on' },
        )
      else {
        setReadLogs(true)
        out.push(
          { kind: 'out', text: '200 POST /checkout/summary 39ms  flag=on' },
          { kind: 'err', text: "500 TypeError: Cannot read properties of null (reading 'balance')" },
          { kind: 'dim', text: '    at NewSummary (src/checkout/NewSummary.tsx:6)  order=ord_8XkQ giftCard=null' },
          { kind: 'out', text: '200 POST /checkout/summary 42ms  flag=on' },
          { kind: 'err', text: "500 TypeError: Cannot read properties of null (reading 'balance')" },
          { kind: 'dim', text: '    at NewSummary (src/checkout/NewSummary.tsx:6)  order=ord_2mVn giftCard=null' },
        )
      }
    } else {
      out.push({ kind: 'err', text: `command not found: ${cmd.split(' ')[0]} (try "help")` })
    }
    setLines((l) => [...l, ...out])
  }

  const reset = () => {
    setRolloutState(0)
    setSettled(0)
    setSeries(seedSeries(48))
    setLines(INITIAL_LINES)
    setReadLogs(false)
    setFixed(false)
    setPeak(0)
    setHistory(INITIAL_HISTORY)
    setTaskIndex(2)
    setViewing(2)
    setResult(null)
    setHints({})
  }

  /** What "done" means for the current task, checked live against the sandbox. */
  const criteria: { label: string; met: boolean }[] = useMemo(() => {
    if (task.id === 'roll')
      return [
        { label: 'Rollout is at 5%', met: rollout === 5 },
        {
          label: rollout === 5 ? `Graph has settled (${Math.min(settled, SETTLE_SECONDS)}/${SETTLE_SECONDS} s)` : 'Graph has settled at 5%',
          met: rollout === 5 && settled >= SETTLE_SECONDS,
        },
        { label: 'Error rate under the 0.5% budget', met: current <= BUDGET },
      ]
    if (task.id === 'rollback')
      return [
        { label: 'Read the logs for the new path', met: readLogs },
        { label: 'Rolled back to 0%', met: rollout === 0 && peak > 5 },
      ]
    if (task.id === 'fix')
      return [
        { label: 'Gift card guard applied', met: fixed },
        { label: 'Rollout at 100%', met: rollout === 100 },
        { label: 'Error rate under budget', met: current <= BUDGET && settled >= 4 },
      ]
    return []
  }, [task.id, rollout, settled, current, readLogs, peak, fixed])

  const check = () => {
    const missing = criteria.find((c) => !c.met)
    if (task.id === 'roll' && rollout > 10) {
      setResult({
        ok: false,
        text: (
          <>
            That’s {rollout}%: one in {Math.round(100 / rollout)} checkouts on untested code. Start at 5%; you can always go up.
          </>
        ),
      })
      return
    }
    if (task.id === 'fix' && rollout === 100 && !fixed) {
      setResult({ ok: false, text: <>Errors are over budget at 100%. Roll back now, then apply the fix in NewSummary.tsx first.</> })
      return
    }
    if (missing) {
      setResult({ ok: false, text: <>Not yet: {missing.label.replace(/\s*\(.*\)$/, '').toLowerCase()}.</> })
      return
    }
    const last = taskIndex === TASKS.length - 1
    setResult({
      ok: true,
      text: last ? (
        <>Lab complete in {fmtClock(elapsed)}. You rolled out, caught a bug at 5% instead of 100%, and shipped it fixed.</>
      ) : task.id === 'roll' ? (
        <>Passed. Error rate {current.toFixed(2)}% at 5%: under budget, but up from 0.18%. Keep that in mind.</>
      ) : (
        <>Passed. Rolled back without a deploy: that’s the whole reason the flag exists.</>
      ),
    })
  }

  const next = () => {
    const n = Math.min(taskIndex + 1, TASKS.length - 1)
    setTaskIndex(n)
    setViewing(n)
    setResult(null)
  }

  const passed = result?.ok === true
  const finished = passed && taskIndex === TASKS.length - 1

  return (
    <div className="flex h-full flex-col">
      <PageCommandBar
        title={ITEM.title}
        description="Hands-on lab: wrap a change in a feature flag, roll it out, read the graph, roll back."
        actions={
          <>
            <span className="hidden items-center gap-1.5 text-sm text-muted-foreground lg:inline-flex">
              Task {taskIndex + 1} of {TASKS.length}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs tabular-nums"
              aria-label={`Elapsed ${fmtClock(elapsed)}`}
            >
              <Timer className="size-3.5 text-muted-foreground" />
              {fmtClock(elapsed)}
              <span className="hidden text-muted-foreground sm:inline">/ ~{ITEM.minutes}:00</span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 max-sm:hidden" aria-label="Reset sandbox" onClick={reset}>
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset sandbox</TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" asChild>
              <a href={href('/learn/pages')} aria-label="Exit lab">
                <LogOut />
                <span className="hidden sm:inline">Exit lab</span>
              </a>
            </Button>
          </>
        }
      />

      <div className="border-b p-2 md:hidden">
        <Segmented
          aria-label="Show"
          value={pane}
          onChange={setPane}
          options={[
            { value: 'instructions', label: 'Instructions' },
            { value: 'sandbox', label: 'Sandbox' },
          ]}
          className="w-full [&>*]:flex-1"
        />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ---------- Instructions ---------- */}
        <aside
          className={cn(
            'w-full shrink-0 flex-col border-r bg-card md:flex md:w-[22rem] xl:w-[26rem]',
            pane === 'instructions' ? 'flex' : 'hidden',
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 border-b p-5">
              <div className="flex items-center justify-between gap-3">
                <PersonChip id={ITEM.author} showRole />
                <Badge variant="outline">{ITEM.level}</Badge>
              </div>
              <ol className="flex gap-1" aria-label="Tasks">
                {TASKS.map((t, i) => {
                  const state = i < taskIndex || (finished && i === taskIndex) ? 'done' : i === taskIndex ? 'active' : 'locked'
                  return (
                    <li key={t.id} className="flex min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={state === 'locked'}
                        onClick={() => setViewing(i)}
                        aria-current={viewing === i ? 'step' : undefined}
                        className={cn(
                          'flex min-w-0 flex-1 flex-col gap-1.5 rounded-md p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
                          viewing === i ? 'bg-accent' : state !== 'locked' && 'hover:bg-accent/60',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1 rounded-full',
                            state === 'done' ? 'bg-primary' : state === 'active' ? 'bg-primary/40' : 'bg-muted',
                          )}
                        />
                        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          {state === 'done' ? (
                            <Check className="size-3 text-primary" />
                          ) : state === 'locked' ? (
                            <Lock className="size-3" />
                          ) : (
                            <CircleDashed className="size-3 text-primary" />
                          )}
                          {i + 1}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
              <ul className="flex flex-col gap-0.5 text-sm">
                {TASKS.map((t, i) => {
                  const state = i < taskIndex || (finished && i === taskIndex) ? 'done' : i === taskIndex ? 'active' : 'locked'
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={state === 'locked'}
                        onClick={() => setViewing(i)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
                          viewing === i && 'bg-accent font-medium',
                          state === 'locked' ? 'text-muted-foreground/70' : 'hover:bg-accent/60',
                          state === 'done' && viewing !== i && 'text-muted-foreground',
                        )}
                      >
                        <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate">{t.short}</span>
                        {state === 'done' && <span className="text-xs text-muted-foreground">done</span>}
                        {state === 'active' && <span className="text-xs font-medium text-primary">now</span>}
                        {state === 'locked' && <Lock className="size-3" aria-label="locked" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="flex flex-col gap-4 p-5">
              <div>
                <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Task {viewing + 1} {viewing < taskIndex || (finished && viewing === taskIndex) ? '· done' : ''}
                </div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{shown.title}</h2>
              </div>
              <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_p]:m-0">{shown.body}</div>

              {viewing === taskIndex && criteria.length > 0 && (
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">Done when</div>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {criteria.map((c) => (
                      <li key={c.label} className="flex items-center gap-2">
                        {c.met ? (
                          <CircleCheck className="size-4 shrink-0 text-success" />
                        ) : (
                          <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className={cn(c.met ? 'text-foreground' : 'text-muted-foreground')}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {shown.hints.slice(0, hints[shown.id] ?? 0).map((h, i) => (
                  <div key={i} className="flex gap-2 rounded-lg bg-primary-soft p-3 text-sm text-primary-soft-foreground">
                    <Lightbulb className="mt-0.5 size-4 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
                {(hints[shown.id] ?? 0) < shown.hints.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start text-muted-foreground"
                    onClick={() => setHints((h) => ({ ...h, [shown.id]: (h[shown.id] ?? 0) + 1 }))}
                  >
                    <Lightbulb />
                    Show a hint ({(hints[shown.id] ?? 0) + 1} of {shown.hints.length})
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t p-4">
            {result && (
              <div
                role="status"
                className={cn(
                  'flex gap-2 rounded-lg p-3 text-sm',
                  result.ok ? 'bg-success-soft text-success-soft-foreground' : 'bg-destructive-soft text-destructive-soft-foreground',
                )}
              >
                {result.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleX className="mt-0.5 size-4 shrink-0" />}
                <span>{result.text}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {passed && !finished ? (
                <Button className="flex-1" onClick={next}>
                  Next: {TASKS[taskIndex + 1].short}
                </Button>
              ) : (
                <Button className="flex-1" onClick={check} disabled={viewing !== taskIndex || finished}>
                  <Check />
                  {finished ? 'Lab complete' : 'Check my work'}
                </Button>
              )}
              <Button variant="outline" className="md:hidden" onClick={() => setPane('sandbox')}>
                Sandbox
              </Button>
            </div>
          </div>
        </aside>

        {/* ---------- Sandbox ---------- */}
        <section
          aria-label="Sandbox"
          className={cn(
            'min-w-0 flex-1 flex-col gap-3 overflow-y-auto bg-muted/40 p-3 md:flex xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[minmax(0,1fr)_minmax(0,15rem)] xl:overflow-hidden',
            pane === 'sandbox' ? 'flex' : 'hidden',
          )}
        >
          <Editor fixed={fixed} canFix={task.id === 'fix' || readLogs} onFix={() => setFixed(true)} />
          <RolloutPanel
            rollout={rollout}
            onChange={setRollout}
            series={series}
            current={current}
            settled={settled}
            fixed={fixed}
            history={history}
          />
          <Terminal lines={lines} onRun={run} />
        </section>
      </div>
    </div>
  )
}

/* ---------- Panels ---------- */

function Panel({
  title,
  icon: Icon,
  meta,
  className,
  children,
}: {
  title: string
  icon: typeof FileCode2
  meta?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card', className)}>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3 text-xs">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{title}</span>
        <span className="ml-auto flex min-w-0 items-center gap-2 text-muted-foreground">{meta}</span>
      </div>
      {children}
    </div>
  )
}

const KEYWORDS = /\b(import|from|export|function|return|if|const|null)\b/

function Highlighted({ text }: { text: string }) {
  const parts = text.split(/('[^']*'|\/\/.*$|\b(?:import|from|export|function|return|if|const|null)\b|<\/?[A-Z]\w*)/)
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null
        if (p.startsWith('//'))
          return (
            <span key={i} className="text-muted-foreground italic">
              {p}
            </span>
          )
        if (p.startsWith("'"))
          return (
            <span key={i} className="text-highlight">
              {p}
            </span>
          )
        if (KEYWORDS.test(p) && p.match(KEYWORDS)?.[0] === p)
          return (
            <span key={i} className="text-primary">
              {p}
            </span>
          )
        if (/^<\/?[A-Z]/.test(p))
          return (
            <span key={i} className="font-medium text-foreground">
              {p}
            </span>
          )
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

type DiffLine = [' ' | '+' | '-', string]

const ORDER_SUMMARY: DiffLine[] = [
  [' ', "import { flags } from '@/lib/flags'"],
  [' ', "import { LegacySummary } from './LegacySummary'"],
  ['+', "import { NewSummary } from './NewSummary'"],
  [' ', ''],
  [' ', 'export function OrderSummary({ order, user }: Props) {'],
  ['-', '  return <LegacySummary order={order} />'],
  ['+', "  if (flags.enabled('checkout.new-summary', user)) {"],
  ['+', '    return <NewSummary order={order} />'],
  ['+', '  }'],
  ['+', '  return <LegacySummary order={order} />'],
  [' ', '}'],
]

function newSummary(fixed: boolean): DiffLine[] {
  return [
    [' ', "import { formatMoney } from '@/lib/money'"],
    [' ', ''],
    [' ', 'export function NewSummary({ order }: Props) {'],
    [' ', '  const subtotal = order.lines.reduce(sum, 0)'],
    [' ', '  // Gift card credit comes off before tax'],
    ...(fixed
      ? ([
          ['-', '  const credit = order.giftCard.balance'],
          ['+', '  const credit = order.giftCard?.balance ?? 0'],
        ] as DiffLine[])
      : ([[' ', '  const credit = order.giftCard.balance']] as DiffLine[])),
    [' ', '  const total = subtotal - credit + order.tax'],
    [' ', '  return <SummaryCard total={formatMoney(total)} />'],
    [' ', '}'],
  ]
}

function Editor({ fixed, canFix, onFix }: { fixed: boolean; canFix: boolean; onFix: () => void }) {
  const [file, setFile] = useState<'order' | 'new'>('order')
  const rows = file === 'order' ? ORDER_SUMMARY : newSummary(fixed)
  const bugLine = file === 'new' && !fixed ? 5 : -1
  let n = 0
  return (
    <Panel
      title="Editor"
      icon={FileCode2}
      className="h-80 shrink-0 xl:h-auto"
      meta={<span className="truncate font-mono">src/checkout/</span>}
    >
      <div className="flex shrink-0 items-center gap-0.5 border-b bg-muted/40 px-2 pt-1.5" role="tablist" aria-label="Files">
        {(
          [
            ['order', 'OrderSummary.tsx'],
            ['new', 'NewSummary.tsx'],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={file === id}
            onClick={() => setFile(id)}
            className={cn(
              '-mb-px rounded-t-md border border-b-0 px-3 py-1.5 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring',
              file === id ? 'bg-card text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {name}
            {id === 'order' && <span className="ml-1.5 text-success">M</span>}
            {id === 'new' && fixed && <span className="ml-1.5 text-success">M</span>}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-2 font-mono text-xs leading-6">
        {rows.map(([mark, text], i) => {
          if (mark !== '-') n++
          return (
            <div
              key={`${file}-${i}`}
              className={cn(
                'flex min-w-max pr-4',
                mark === '+' && 'bg-success-soft/70',
                mark === '-' && 'bg-destructive-soft/70',
                i === bugLine && 'bg-warning-soft/60',
              )}
            >
              <span className="w-10 shrink-0 pr-3 text-right text-muted-foreground/60 select-none">{mark === '-' ? '' : n}</span>
              <span
                className={cn(
                  'w-4 shrink-0 select-none',
                  mark === '+' ? 'text-success' : mark === '-' ? 'text-destructive' : 'text-transparent',
                )}
              >
                {mark}
              </span>
              <span className="whitespace-pre text-foreground/85">
                <Highlighted text={text} />
              </span>
            </div>
          )
        })}
        {file === 'new' && !fixed && canFix && (
          <div className="mx-3 mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3 font-sans">
            <Wand2 className="size-4 text-primary" />
            <span className="min-w-0 flex-1 text-xs text-muted-foreground">
              Suggested: guard <code className="font-mono">order.giftCard</code>, which is <code className="font-mono">null</code> when
              there’s no card.
            </span>
            <Button size="sm" variant="soft" onClick={onFix}>
              Apply fix
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}

function Terminal({ lines, onRun }: { lines: Line[]; onRun: (cmd: string) => void }) {
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [hIndex, setHIndex] = useState(-1)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [lines])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onRun(value)
    if (value.trim()) setHistory((h) => [value, ...h])
    setHIndex(-1)
    setValue('')
  }
  return (
    <Panel
      title="Terminal"
      icon={SquareTerminal}
      meta={<span className="font-mono">sandbox · ~/checkout</span>}
      className="h-72 shrink-0 xl:col-start-1 xl:row-start-2 xl:h-auto"
    >
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5"
        onClick={() => document.getElementById('lab-term')?.focus()}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              'break-all whitespace-pre-wrap',
              l.kind === 'ok' && 'text-success',
              l.kind === 'err' && 'text-destructive',
              l.kind === 'dim' && 'text-muted-foreground',
            )}
          >
            {l.kind === 'in' && <span className="text-primary select-none">$ </span>}
            {l.text}
          </div>
        ))}
        <form onSubmit={submit} className="flex items-center">
          <label htmlFor="lab-term" className="text-primary select-none">
            $<span className="sr-only">Command</span>&nbsp;
          </label>
          <input
            id="lab-term"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' && history.length) {
                e.preventDefault()
                const n = Math.min(hIndex + 1, history.length - 1)
                setHIndex(n)
                setValue(history[n])
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                const n = hIndex - 1
                setHIndex(Math.max(n, -1))
                setValue(n >= 0 ? history[n] : '')
              }
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="type a command, e.g. help"
            className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </form>
      </div>
    </Panel>
  )
}

const STOPS = [0, 1, 5, 25, 50, 100]

function RolloutPanel({
  rollout,
  onChange,
  series,
  current,
  settled,
  fixed,
  history,
}: {
  rollout: number
  onChange: (v: number) => void
  series: number[]
  current: number
  settled: number
  fixed: boolean
  history: { at: number; text: string }[]
}) {
  const tone = errorTone(current)
  const ToneIcon = tone.icon
  const sessions = Math.round(rollout * 46.4)
  const failing = Math.round((sessions * Math.max(0, current - 0.18)) / 100)

  return (
    <Panel
      title="Rollout"
      icon={ToggleRight}
      meta={<span className="truncate font-mono">{FLAG}</span>}
      className="shrink-0 xl:col-start-2 xl:row-span-2 xl:row-start-1"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Checkouts on the new summary</div>
            <div className="text-4xl font-semibold tracking-tight tabular-nums">
              {rollout}
              <span className="text-2xl text-muted-foreground">%</span>
            </div>
          </div>
          <Badge variant={rollout === 0 ? 'secondary' : 'primary'}>
            {rollout === 0 ? 'Off' : rollout === 100 ? 'Everyone' : 'Rolling out'}
          </Badge>
        </div>

        <div className="flex flex-col gap-3">
          <Slider value={[rollout]} min={0} max={100} step={1} onValueChange={([v]) => onChange(v)} thumbLabels={['Rollout percentage']} />
          <div className="flex flex-wrap gap-1">
            {STOPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                aria-pressed={rollout === s}
                className={cn(
                  'h-7 min-w-10 flex-1 rounded-md border px-1.5 text-xs font-medium tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  rollout === s ? 'border-primary bg-primary-soft text-primary-soft-foreground' : 'hover:bg-accent',
                )}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium">Checkout error rate</span>
            <span className="text-xs text-muted-foreground">last 24 s · budget {BUDGET}%</span>
          </div>
          <ErrorChart series={series} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xl font-semibold tabular-nums">{current.toFixed(2)}%</span>
            <span className={cn('inline-flex items-center gap-1 text-xs font-medium', tone.className)}>
              <ToneIcon className="size-3.5" />
              {tone.label}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-xs">
          <div>
            <dt className="text-muted-foreground">New-path sessions</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{sessions.toLocaleString('en-US')}/min</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Failing / min</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{rollout === 0 ? '0' : failing.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">At this level for</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{fmtClock(settled * 15)} sim</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Build</dt>
            <dd className="mt-0.5 font-mono text-sm">{fixed ? 'a91f3c2' : '7e04b18'}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 border-t pt-4">
          <div className="text-xs font-medium">History</div>
          <ol className="flex flex-col gap-1.5 text-xs">
            {[...history]
              .reverse()
              .slice(0, 5)
              .map((h) => (
                <li key={h.at + h.text} className="flex gap-3">
                  <span className="w-10 shrink-0 font-mono text-muted-foreground tabular-nums">{fmtClock(h.at)}</span>
                  <span className="min-w-0 flex-1">{h.text}</span>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </Panel>
  )
}

function ErrorChart({ series }: { series: number[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const w = 300
  const h = 96
  const max = Math.max(1, ...series.map((v) => v * 1.15))
  const y = (v: number) => h - 4 - (v / max) * (h - 8)
  const x = (i: number) => (i / (series.length - 1)) * w
  const d = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const over = series[series.length - 1] > BUDGET
  const by = y(BUDGET)
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={cn('h-24 w-full overflow-visible', over ? 'text-destructive' : 'text-primary')}
        role="img"
        aria-label={`Error rate, now ${series[series.length - 1].toFixed(2)} percent against a ${BUDGET} percent budget`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setHover(Math.round(((e.clientX - r.left) / r.width) * (series.length - 1)))
        }}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={0} x2={w} y1={h - 0.5} y2={h - 0.5} stroke="var(--border)" />
        <line
          x1={0}
          x2={w}
          y1={by}
          y2={by}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          opacity={0.7}
        />
        <path d={`${d} L${w},${h} L0,${h} Z`} fill="currentColor" opacity={0.1} />
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={0}
            y2={h}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <span
        className="pointer-events-none absolute right-0 text-[10px] text-muted-foreground"
        style={{ top: `calc(${(by / h) * 100}% - 14px)` }}
      >
        budget
      </span>
      {hover !== null && (
        <span
          className="pointer-events-none absolute -top-7 rounded-md border bg-popover px-1.5 py-0.5 text-[11px] text-popover-foreground tabular-nums shadow-elevation-2"
          style={{ left: `clamp(0px, calc(${(hover / (series.length - 1)) * 100}% - 40px), calc(100% - 80px))` }}
        >
          {series[hover].toFixed(2)}% · −{((series.length - 1 - hover) / 2).toFixed(0)} s
        </span>
      )}
    </div>
  )
}
