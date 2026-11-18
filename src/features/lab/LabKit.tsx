import { useState, type ReactNode } from 'react'
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { timeAgo, useNow, type LiveData } from './useLiveData'

/**
 * Provenance line every experiment carries: where the numbers come from,
 * that they're live, and how fresh they are. Tiny, mono, never decorative.
 */
export function SourceLine({
  source,
  href,
  feeds,
  className,
}: {
  source: string
  href?: string
  feeds: LiveData<unknown>[]
  className?: string
}) {
  const now = useNow(15_000)
  const updated = Math.min(...feeds.map((f) => f.updatedAt ?? Infinity))
  const refreshing = feeds.some((f) => f.refreshing || f.loading)
  const error = feeds.find((f) => f.error)?.error
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground', className)}>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className={cn('size-1.5 rounded-full', error ? 'bg-destructive' : 'bg-success', refreshing && 'animate-pulse')}
        />
        {error ? 'feed error' : 'live'}
      </span>
      <span>·</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-foreground hover:underline">
          {source}
        </a>
      ) : (
        <span>{source}</span>
      )}
      <span>·</span>
      <span>updated {Number.isFinite(updated) ? timeAgo(updated, now) : '…'}</span>
      <button
        type="button"
        onClick={() => feeds.forEach((f) => f.reload())}
        className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Refresh data"
      >
        <RefreshCw className={cn('size-3', refreshing && 'animate-spin')} />
      </button>
    </div>
  )
}

/**
 * Gate for a page's first paint: a calm loading line, or the error with a
 * retry. Once data exists the children render and later refetches never
 * come back here (charts hold their frame).
 */
export function LoadGate({
  feeds,
  children,
  label = 'Fetching live data',
  className,
}: {
  feeds: LiveData<unknown>[]
  children: () => ReactNode
  label?: string
  className?: string
}) {
  const missing = feeds.filter((f) => f.data === undefined)
  if (missing.length === 0) return <>{children()}</>
  const error = missing.find((f) => f.error)
  return (
    <div className={cn('flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground', className)}>
      {error ? (
        <>
          <AlertTriangle className="size-5 text-destructive" />
          <div>Couldn’t reach the feed: {error.error}</div>
          <Button variant="outline" size="sm" onClick={() => missing.forEach((f) => f.reload())}>
            <RefreshCw />
            Try again
          </Button>
        </>
      ) : (
        <>
          <LoaderCircle className="size-5 animate-spin" />
          <div>{label}…</div>
        </>
      )}
    </div>
  )
}

/** Floating chart tooltip positioned at a point inside a `relative` container. */
export function FloatingTip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const flip = x > width - 220
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: flip ? undefined : x + 14, right: flip ? width - x + 14 : undefined, top: Math.max(0, y - 12) }}
    >
      {children}
    </div>
  )
}

/** A `useState` that also returns a stable toggle, for show/hide table views. */
export function useToggle(initial = false) {
  const [on, set] = useState(initial)
  return [on, () => set((v) => !v), set] as const
}
