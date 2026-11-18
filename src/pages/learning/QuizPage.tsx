import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpen, Check, Lightbulb, Lock, RotateCcw, X } from 'lucide-react'

import { TaskBar } from '@/components/layout/TaskBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormatBadge, ItemCover, PersonChip } from '@/features/learning/components'
import { ITEM_BY_ID, formatMinutes } from '@/features/learning/data'
import { href, navigate } from '@/lib/router'
import { cn } from '@/lib/utils'

/* ---------- Questions ---------- */

interface Question {
  concept: string
  prompt: string
  sql: string
  options: { text: string; note: string }[]
  answer: number
  explain: ReactNode
  fix?: { label: string; sql: string }
  takeaway: string
  review: { label: string; path: string }
}

const QUESTIONS: Question[] = [
  {
    concept: 'LEFT JOIN, then WHERE',
    prompt: 'Customers who have never paid: are they in the result?',
    sql: `SELECT c.id, c.name, p.amount
FROM customers c
LEFT JOIN payments p ON p.customer_id = c.id
WHERE p.status = 'succeeded'`,
    options: [
      {
        text: 'Yes, with amount as NULL',
        note: 'That’s what the LEFT JOIN produces. But WHERE runs after the join and throws those rows away.',
      },
      { text: 'No, the WHERE clause removes them', note: "Right: their status is NULL, and NULL = 'succeeded' is never true." },
      {
        text: 'Only if they have at least one failed payment',
        note: "Those customers are dropped too: their rows say 'failed', which fails the filter.",
      },
      { text: 'It depends on the database', note: 'Standard SQL defines this, and Postgres, MySQL and BigQuery all agree.' },
    ],
    answer: 1,
    explain: (
      <>
        <p>
          The <Code>LEFT JOIN</Code> does keep every customer: those with no payments get one row with the payment columns set to{' '}
          <Code>NULL</Code>. Then <Code>WHERE</Code> filters the joined rows, and <Code>NULL = 'succeeded'</Code> is <em>unknown</em>, not
          true, so those rows go.
        </p>
        <p>
          The net effect is an inner join that only looks like an outer one. Move the condition into the join if you meant to keep everyone.
        </p>
      </>
    ),
    fix: {
      label: 'Keeps customers without a successful payment',
      sql: `LEFT JOIN payments p
  ON p.customer_id = c.id
 AND p.status = 'succeeded'`,
    },
    takeaway: 'A filter on the right-hand table belongs in ON, not WHERE, when you want to keep unmatched rows.',
    review: { label: 'Data literacy for builders, module 3: Joining tables', path: '/learn/course' },
  },
  {
    concept: 'COUNT(*) after an outer join',
    prompt: 'Ada signed up last week and has never paid. What does her row show?',
    sql: `SELECT c.name, COUNT(*) AS payments
FROM customers c
LEFT JOIN payments p ON p.customer_id = c.id
GROUP BY c.name`,
    options: [
      { text: '0', note: 'You’d get 0 from COUNT(p.id). COUNT(*) counts the row the LEFT JOIN made for her.' },
      { text: '1', note: 'Right: one row exists for Ada, full of NULLs on the payments side, and COUNT(*) counts rows.' },
      { text: 'NULL', note: 'COUNT never returns NULL. At worst it returns 0.' },
      { text: 'She has no row', note: 'The LEFT JOIN guarantees every customer at least one row.' },
    ],
    answer: 1,
    explain: (
      <>
        <p>
          <Code>COUNT(*)</Code> counts rows, whatever is in them. The join gave Ada exactly one row (her customer columns, then{' '}
          <Code>NULL</Code>s), so she shows 1 payment she never made.
        </p>
        <p>
          <Code>COUNT(column)</Code> skips <Code>NULL</Code>s. Count a column from the right-hand table and Ada correctly gets 0.
        </p>
      </>
    ),
    fix: { label: 'Counts payments, not rows', sql: `SELECT c.name, COUNT(p.id) AS payments` },
    takeaway: 'After an outer join, count a non-null column from the optional side, never *.',
    review: { label: 'Data literacy for builders, module 3: Joining tables', path: '/learn/course' },
  },
  {
    concept: 'NOT IN and NULL',
    prompt: 'One row in refunds has customer_id NULL (issued before the customer was linked). How many customers come back?',
    sql: `SELECT id
FROM customers
WHERE id NOT IN (SELECT customer_id FROM refunds)`,
    options: [
      {
        text: 'Every customer without a refund',
        note: 'That’s the English meaning, and what NOT EXISTS returns. One NULL in the list breaks NOT IN.',
      },
      { text: 'None', note: 'Right: a single NULL makes every NOT IN comparison unknown, so no row passes.' },
      { text: 'Every customer', note: 'The NULL isn’t ignored; it poisons the whole list.' },
      { text: 'The query errors', note: 'It runs without complaint, which is exactly what makes it dangerous.' },
    ],
    answer: 1,
    explain: (
      <>
        <p>
          <Code>x NOT IN (1, 2, NULL)</Code> means <Code>x &lt;&gt; 1 AND x &lt;&gt; 2 AND x &lt;&gt; NULL</Code>. That last comparison is
          unknown for every <Code>x</Code>, and <Code>AND</Code> with unknown is never true. So the result is empty, silently.
        </p>
        <p>
          <Code>NOT EXISTS</Code> asks a yes-or-no question per customer and isn’t tripped by <Code>NULL</Code>s. Plain <Code>IN</Code>{' '}
          (without <Code>NOT</Code>) is safe.
        </p>
      </>
    ),
    fix: {
      label: 'Returns customers with no refund',
      sql: `WHERE NOT EXISTS (
  SELECT 1 FROM refunds r
  WHERE r.customer_id = customers.id
)`,
    },
    takeaway: 'Reach for NOT EXISTS, not NOT IN, whenever the subquery’s column can be NULL.',
    review: { label: 'Data literacy for builders, module 2: Missing data', path: '/learn/course' },
  },
  {
    concept: 'Join fan-out',
    prompt: 'One $300 invoice has three “payouts” lines. How much does it add to billed?',
    sql: `SELECT i.customer_id, SUM(i.total) AS billed
FROM invoices i
JOIN invoice_lines l ON l.invoice_id = i.id
WHERE l.product = 'payouts'
GROUP BY i.customer_id`,
    options: [
      { text: '$300', note: 'It would with EXISTS. The join repeats the invoice once per matching line.' },
      { text: '$900', note: 'Right: three joined rows, each carrying the invoice’s $300 total.' },
      { text: '$100', note: 'Nothing divides the total. SUM adds every copy it sees.' },
      { text: 'It depends on the line amounts', note: 'The query never reads line amounts, only i.total.' },
    ],
    answer: 1,
    explain: (
      <>
        <p>
          A join makes one row per matching pair. Three lines match, so the invoice appears three times, and each copy carries{' '}
          <Code>i.total</Code>. <Code>SUM</Code> doesn’t know they’re the same invoice.
        </p>
        <p>
          This is fan-out: joining from the “one” side to a “many” side multiplies anything you sum from the “one” side. Revenue reports
          that run high are usually this.
        </p>
      </>
    ),
    fix: {
      label: 'Filters without multiplying',
      sql: `FROM invoices i
WHERE EXISTS (
  SELECT 1 FROM invoice_lines l
  WHERE l.invoice_id = i.id AND l.product = 'payouts'
)`,
    },
    takeaway: 'Before summing, ask what one row means after the join. If it isn’t one invoice, don’t sum invoice totals.',
    review: { label: 'Hands-on lab: Ship behind a feature flag (reading its metrics)', path: '/learn/lab' },
  },
  {
    concept: 'WHERE, HAVING and the order things run',
    prompt: 'Which statement about this query is true?',
    sql: `SELECT customer_id, SUM(amount) AS volume
FROM payments
WHERE created_at >= '2026-10-01'
GROUP BY customer_id
HAVING SUM(amount) > 10000
ORDER BY volume DESC`,
    options: [
      {
        text: 'WHERE SUM(amount) > 10000 would work the same as HAVING',
        note: 'Aggregates aren’t allowed in WHERE: there are no groups yet when it runs.',
      },
      { text: 'The date filter runs before grouping; the volume filter after', note: 'Right: WHERE filters rows, HAVING filters groups.' },
      { text: 'ORDER BY volume fails: aliases can’t be used there', note: 'ORDER BY runs after SELECT names the alias, so it works.' },
      { text: 'HAVING sees payments one at a time', note: 'HAVING sees one row per customer, after GROUP BY.' },
    ],
    answer: 1,
    explain: (
      <>
        <p>
          SQL is written <Code>SELECT</Code> first but runs in this order: <Code>FROM</Code> → <Code>WHERE</Code> → <Code>GROUP BY</Code> →{' '}
          <Code>HAVING</Code> → <Code>SELECT</Code> → <Code>ORDER BY</Code>.
        </p>
        <p>
          So payments before October never reach a group, and only customers whose October-on total tops $10,000 survive <Code>HAVING</Code>
          . The alias <Code>volume</Code> exists from <Code>SELECT</Code> on, which is why <Code>ORDER BY</Code> can use it and{' '}
          <Code>HAVING</Code> has to repeat <Code>SUM(amount)</Code>.
        </p>
      </>
    ),
    takeaway: 'Read a query in the order it runs, not the order it’s written.',
    review: { label: 'Data literacy for builders, module 2: Summaries', path: '/learn/course' },
  },
]

const TOTAL_IN_QUIZ = 12
const LETTERS = ['A', 'B', 'C', 'D']

/* ---------- Page ---------- */

type Result = { choice: number | null; correct: boolean }

export function QuizPage() {
  const [order, setOrder] = useState<number[]>(() => QUESTIONS.map((_, i) => i))
  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<Record<number, Result>>({})
  const done = step >= order.length
  const qi = order[step]
  const q = QUESTIONS[qi]

  const check = (pick: number | null) => {
    setChecked(true)
    setResults((r) => ({ ...r, [qi]: { choice: pick, correct: pick === q.answer } }))
  }
  const next = () => {
    setStep((s) => s + 1)
    setChoice(null)
    setChecked(false)
  }
  const restart = (only?: number[]) => {
    setOrder(only ?? QUESTIONS.map((_, i) => i))
    setStep(0)
    setChoice(null)
    setChecked(false)
    if (!only) setResults({})
  }

  // Keyboard: A–D or 1–4 to pick, Enter to check and move on.
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target instanceof HTMLElement ? e.target : document.body
      if (t.closest('input, textarea, [contenteditable]')) return
      const k = e.key.toLowerCase()
      const idx = '1234'.includes(k) ? Number(k) - 1 : 'abcd'.indexOf(k)
      if (!checked && idx >= 0 && idx < q.options.length && k.length === 1) setChoice(idx)
      if (e.key === 'Enter' && !t.closest('button, a')) {
        if (!checked && choice !== null) check(choice)
        else if (checked) next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <TaskBar
        title="Can you read this query?"
        closeLabel="Leave quiz"
        onClose={() => navigate('/learn/home/today')}
        status={
          <>
            <Lock className="size-3.5" />
            Answers are only visible to you
          </>
        }
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {done ? (
          <Results results={results} onRetry={restart} />
        ) : (
          <>
            <QuizProgress order={order} step={step} results={results} checkedNow={checked} />
            <QuestionCard key={`${qi}-${step}`} q={q} number={qi + 1} choice={choice} checked={checked} onPick={setChoice} />
            {checked && <Feedback q={q} correct={results[qi]?.correct ?? false} skipped={results[qi]?.choice === null} />}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="hidden text-xs text-muted-foreground sm:block">
                Keys: <Kbd>A</Kbd>–<Kbd>D</Kbd> to pick, <Kbd>Enter</Kbd> to {checked ? 'continue' : 'check'}
              </p>
              <div className="ml-auto flex items-center gap-2">
                {!checked ? (
                  <>
                    <Button variant="ghost" onClick={() => check(null)}>
                      Show me
                    </Button>
                    <Button onClick={() => check(choice)} disabled={choice === null}>
                      Check answer
                    </Button>
                  </>
                ) : (
                  <Button onClick={next}>
                    {step === order.length - 1 ? 'See results' : 'Next question'}
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function QuizProgress({
  order,
  step,
  results,
  checkedNow,
}: {
  order: number[]
  step: number
  results: Record<number, Result>
  checkedNow: boolean
}) {
  const quiz = ITEM_BY_ID['sql-check']
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FormatBadge format="quiz" />
        <span className="text-xs text-muted-foreground">Data literacy · {quiz.level}</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          Question {step + 1} of {order.length}
          <span className="max-sm:hidden"> · sample of {TOTAL_IN_QUIZ}</span>
        </span>
      </div>
      <ol className="flex gap-1.5" aria-label="Progress">
        {order.map((qi, i) => {
          const r = results[qi]
          const answered = i < step || (i === step && checkedNow)
          return (
            <li
              key={qi}
              aria-label={`Question ${qi + 1}: ${answered ? (r?.correct ? 'right' : 'missed') : i === step ? 'current' : 'to do'}`}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                answered ? (r?.correct ? 'bg-success' : 'bg-destructive') : i === step ? 'bg-primary' : 'bg-muted',
              )}
            />
          )
        })}
      </ol>
    </div>
  )
}

function QuestionCard({
  q,
  number,
  choice,
  checked,
  onPick,
}: {
  q: Question
  number: number
  choice: number | null
  checked: boolean
  onPick: (i: number) => void
}) {
  return (
    <Card className="gap-5">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{q.concept}</span>
          <h2 id={`q-${number}`} className="text-lg leading-snug font-semibold tracking-tight">
            {q.prompt}
          </h2>
        </div>
        <SqlBlock sql={q.sql} />
        <div role="radiogroup" aria-labelledby={`q-${number}`} className="flex flex-col gap-2">
          {q.options.map((o, i) => {
            const selected = choice === i
            const isAnswer = i === q.answer
            const state = !checked ? (selected ? 'selected' : 'idle') : isAnswer ? 'right' : selected ? 'wrong' : 'other'
            return (
              <button
                key={o.text}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={checked}
                onClick={() => onPick(i)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-default',
                  state === 'idle' && 'hover:bg-accent hover:text-accent-foreground',
                  state === 'selected' && 'border-primary bg-primary-soft/50',
                  state === 'right' && 'border-success bg-success-soft/50',
                  state === 'wrong' && 'border-destructive bg-destructive-soft/50',
                  state === 'other' && 'opacity-70',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold',
                    state === 'selected' && 'border-primary bg-primary text-primary-foreground',
                    state === 'right' && 'border-success bg-success-soft text-success-soft-foreground',
                    state === 'wrong' && 'border-destructive bg-destructive-soft text-destructive-soft-foreground',
                    (state === 'idle' || state === 'other') && 'bg-card text-muted-foreground',
                  )}
                >
                  {state === 'right' ? <Check className="size-3.5" /> : state === 'wrong' ? <X className="size-3.5" /> : LETTERS[i]}
                </span>
                <span className="flex min-w-0 flex-col gap-1 pt-0.5">
                  <span className={cn('font-medium', /^(\d+|NULL|\$[\d,]+)$/.test(o.text) && 'font-mono')}>{o.text}</span>
                  {checked && <span className="text-xs text-muted-foreground">{o.note}</span>}
                </span>
                {checked && (state === 'right' || state === 'wrong') && (
                  <span className="sr-only">{state === 'right' ? 'Correct answer' : 'Your answer, incorrect'}</span>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function Feedback({ q, correct, skipped }: { q: Question; correct: boolean; skipped: boolean }) {
  return (
    <section
      aria-live="polite"
      className={cn(
        'flex flex-col gap-4 rounded-xl border-l-4 bg-card p-5 ring-1 ring-foreground/10',
        correct ? 'border-l-success' : 'border-l-destructive',
      )}
    >
      <h3 className="flex items-center gap-2 font-semibold">
        {correct ? <Check className="size-4 text-success" /> : <X className="size-4 text-destructive" />}
        {correct ? 'Right, and here’s why.' : skipped ? 'Here’s how to read it.' : 'Not quite. Here’s what happens.'}
      </h3>
      <div className="flex flex-col gap-3 text-sm leading-relaxed">{q.explain}</div>
      {q.fix && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">{q.fix.label}</span>
          <SqlBlock sql={q.fix.sql} />
        </div>
      )}
      <p className="flex items-start gap-2 rounded-lg bg-primary-soft/60 px-3 py-2.5 text-sm text-primary-soft-foreground">
        <Lightbulb className="mt-0.5 size-4 shrink-0" />
        {q.takeaway}
      </p>
    </section>
  )
}

function Results({ results, onRetry }: { results: Record<number, Result>; onRetry: (only?: number[]) => void }) {
  const right = QUESTIONS.filter((_, i) => results[i]?.correct).length
  const missed = QUESTIONS.map((_, i) => i).filter((i) => !results[i]?.correct)
  const reviews = Array.from(new Map(missed.map((i) => [QUESTIONS[i].review.label, QUESTIONS[i].review])).values())
  const verdict =
    right === QUESTIONS.length
      ? 'You read every query the way the database does. That’s rarer than it sounds.'
      : right >= 3
        ? 'Solid. The ones you missed are the traps that catch experienced people too.'
        : 'These five are the classic traps, and now you’ve seen each one. Try the misses again in a day or two.'
  const path = ITEM_BY_ID['data-path']
  const store = ITEM_BY_ID['which-store']

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sample finished</span>
        <h2 className="text-2xl font-semibold tracking-tight tabular-nums">
          {right} of {QUESTIONS.length} right
        </h2>
        <p className="text-sm text-muted-foreground">
          {verdict} The full quiz has {TOTAL_IN_QUIZ - QUESTIONS.length} more, on window functions and dates.
        </p>
      </div>

      <Card className="gap-0 py-0">
        <ul className="divide-y">
          {QUESTIONS.map((q, i) => {
            const ok = results[i]?.correct
            return (
              <li key={q.concept} className="flex items-start gap-3 px-5 py-3.5">
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                    ok ? 'bg-success-soft text-success-soft-foreground' : 'bg-destructive-soft text-destructive-soft-foreground',
                  )}
                >
                  {ok ? <Check className="size-3" /> : <X className="size-3" />}
                  <span className="sr-only">{ok ? 'Right' : 'Missed'}</span>
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{q.concept}</span>
                  <span className="text-xs text-muted-foreground">{q.takeaway}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-2">
        {missed.length > 0 && (
          <Button onClick={() => onRetry(missed)}>
            <RotateCcw />
            Retry the {missed.length} you missed
          </Button>
        )}
        <Button variant={missed.length ? 'outline' : 'default'} onClick={() => onRetry()}>
          Start over
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <BookOpen className="size-4" />
          Review next
        </h3>
        {reviews.length > 0 && (
          <ul className="flex flex-col gap-2">
            {reviews.map((r) => (
              <li key={r.label}>
                <a href={href(r.path)} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm hover:bg-accent">
                  <span className="min-w-0 flex-1">{r.label}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[path, store].map((item) => (
            <a
              key={item.id}
              href={href(item.path ?? '/learn')}
              className="group flex min-w-0 gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 hover:bg-accent"
            >
              <ItemCover item={item} className="size-16 shrink-0" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-sm leading-snug font-medium group-hover:underline">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {item.format === 'path' ? `${item.parts} modules · ${formatMinutes(item.minutes)}` : `${formatMinutes(item.minutes)}`}
                </span>
              </span>
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          Written by <PersonChip id="ana" /> · questions reviewed by the Data team each quarter.
        </div>
      </section>
    </div>
  )
}

/* ---------- Bits ---------- */

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border bg-card px-1 font-mono text-[11px]">{children}</kbd>
}

const KEYWORDS = /\b(SELECT|FROM|LEFT|JOIN|ON|AND|WHERE|GROUP|BY|HAVING|ORDER|DESC|AS|NOT|IN|EXISTS|COUNT|SUM)\b|('[^']*')/g

/** SQL with keywords and strings picked out. Theme tokens only. */
function SqlBlock({ sql }: { sql: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of sql.matchAll(KEYWORDS)) {
    const i = m.index ?? 0
    if (i > last) parts.push(sql.slice(last, i))
    parts.push(
      m[2] ? (
        <span key={i} className="text-highlight-soft-foreground">
          {m[0]}
        </span>
      ) : (
        <span key={i} className="font-semibold text-primary">
          {m[0]}
        </span>
      ),
    )
    last = i + m[0].length
  }
  parts.push(sql.slice(last))
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/60 px-4 py-3 font-mono text-[13px] leading-relaxed">
      <code>{parts}</code>
    </pre>
  )
}
