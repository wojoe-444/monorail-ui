import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { cn } from '@/lib/utils'

interface PageStepsProps {
  steps: PageTab[]
  'aria-label': string
  /** Let people jump ahead to later steps. By default only earlier steps are links. */
  allowSkip?: boolean
  className?: string
}

/**
 * Sub-pages in a set order (setup flows, multi-page forms): numbered steps
 * joined by a line, finished steps checked. Pair it with `PageStepsFooter`.
 * Like `PageTabs`, the step lives in the URL (`?tab=<id>`); read it with
 * `usePageTab(steps)`.
 */
export function PageSteps({ steps, allowSkip = false, className, ...rest }: PageStepsProps) {
  const [active, , hrefFor] = usePageTab(steps)
  const current = steps.findIndex((s) => s.id === active)

  return (
    <nav aria-label={rest['aria-label']} className={cn('flex overflow-x-auto [scrollbar-width:none]', className)}>
      <ol className="flex min-w-full shrink-0 items-center gap-3">
        {steps.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo'
          const content = (
            <>
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors',
                  state === 'done' && 'border-primary bg-primary text-primary-foreground',
                  state === 'current' && 'border-primary bg-primary-soft text-primary-soft-foreground',
                  state === 'todo' && 'bg-card text-muted-foreground',
                )}
              >
                {state === 'done' ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={state === 'todo' ? 'text-muted-foreground' : 'text-foreground'}>{step.label}</span>
            </>
          )
          const itemClass =
            'inline-flex shrink-0 items-center gap-2 rounded-md py-1 pr-1 text-sm font-medium whitespace-nowrap'
          const linked = state !== 'todo' || allowSkip

          return (
            <li key={step.id} className={cn('flex items-center gap-3', i < steps.length - 1 && 'flex-1')}>
              {linked ? (
                <a
                  href={hrefFor(step.id)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={cn(
                    itemClass,
                    'outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  )}
                >
                  {content}
                </a>
              ) : (
                <span className={itemClass}>{content}</span>
              )}
              {i < steps.length - 1 && (
                <span aria-hidden className={cn('h-px min-w-6 flex-1', i < current ? 'bg-primary' : 'bg-border')} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface PageStepsFooterProps {
  steps: PageTab[]
  /** Label of the button on the last step. */
  finishLabel?: string
  onFinish: () => void
  /** Disable Next (e.g. while the current step is invalid). */
  nextDisabled?: boolean
}

/** Back / "Step n of N" / Next row for a `PageSteps` flow. Next becomes `finishLabel` on the last step. */
export function PageStepsFooter({ steps, finishLabel = 'Finish', onFinish, nextDisabled }: PageStepsFooterProps) {
  const [active, setActive] = usePageTab(steps)
  const index = steps.findIndex((s) => s.id === active)
  const prev = steps[index - 1]
  const next = steps[index + 1]

  return (
    <div className="flex items-center justify-between gap-4 border-t pt-6">
      <Button variant="outline" disabled={!prev} onClick={() => prev && setActive(prev.id)}>
        <ArrowLeft />
        Back
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums">
        Step {index + 1} of {steps.length}
      </span>
      <Button disabled={nextDisabled} onClick={() => (next ? setActive(next.id) : onFinish())}>
        {next ? (
          <>
            Next
            <ArrowRight />
          </>
        ) : (
          finishLabel
        )}
      </Button>
    </div>
  )
}
