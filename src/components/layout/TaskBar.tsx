import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { cn } from '@/lib/utils'

import { TopBarPortal } from './TopBarSlot'

interface TaskBarProps {
  title: string
  onClose: () => void
  closeLabel?: string
  /** Steps of the task, shown in the middle of the bar. Read the active one with `usePageTab(steps)`. */
  steps?: PageTab[]
  /** Short state before the actions, e.g. an "Unsaved changes" dot. Hidden on phones. */
  status?: ReactNode
  /** Back / Save / Continue. One `default` button. */
  actions?: ReactNode
}

/**
 * Header style H: while a task is open (create, edit, a wizard) the top bar
 * becomes the task's bar: a way out, the title, the steps, its save state
 * and the commit button, in reach at every scroll position. Put the body in
 * a narrow column (`mx-auto w-full max-w-2xl`). Render it first in the page;
 * it draws nothing in the page body.
 */
export function TaskBar({ title, onClose, closeLabel = 'Close', steps, status, actions }: TaskBarProps) {
  return (
    <TopBarPortal>
      <Button variant="ghost" size="sm" onClick={onClose} className="-ml-1 text-muted-foreground">
        <X />
        <span className="hidden sm:inline">{closeLabel}</span>
      </Button>
      <span className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />
      {/* Phones keep the title for screen readers only; the bar needs the room for the actions. */}
      <h1 className="sr-only min-w-0 truncate text-base font-semibold tracking-tight sm:not-sr-only">{title}</h1>
      <div className="flex min-w-0 flex-1 justify-center">{steps && <TaskSteps steps={steps} />}</div>
      {status && <div className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">{status}</div>}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </TopBarPortal>
  )
}

/** Compact steps for the bar: dots and labels from `md` up, "2 / 3" below. */
function TaskSteps({ steps }: { steps: PageTab[] }) {
  const [active, , hrefFor] = usePageTab(steps)
  const current = steps.findIndex((s) => s.id === active)

  return (
    <>
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums md:hidden">
        <span className="sr-only">Step </span>
        {current + 1} / {steps.length}
      </span>
      <nav aria-label="Steps" className="hidden md:block">
        <ol className="flex items-center gap-2">
          {steps.map((step, i) => {
            const state = i < current ? 'done' : i === current ? 'current' : 'todo'
            const content = (
              <>
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                    state === 'done' && 'border-primary bg-primary text-primary-foreground',
                    state === 'current' && 'border-primary bg-primary-soft text-primary-soft-foreground',
                    state === 'todo' && 'bg-card text-muted-foreground',
                  )}
                >
                  {state === 'done' ? <Check className="size-3" /> : i + 1}
                </span>
                {step.label}
              </>
            )
            const itemClass = cn(
              'inline-flex items-center gap-1.5 rounded-md text-sm whitespace-nowrap',
              state === 'current' ? 'font-medium text-foreground' : 'text-muted-foreground',
            )
            return (
              <li key={step.id} className="flex items-center gap-2">
                {state === 'done' ? (
                  <a
                    href={hrefFor(step.id)}
                    className={cn(itemClass, 'outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring')}
                  >
                    {content}
                  </a>
                ) : (
                  <span className={itemClass} aria-current={state === 'current' ? 'step' : undefined}>
                    {content}
                  </span>
                )}
                {i < steps.length - 1 && <span aria-hidden className={cn('h-px w-6', i < current ? 'bg-primary' : 'bg-border')} />}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
