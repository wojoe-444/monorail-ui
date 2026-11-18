import { cn } from '@/lib/utils'

interface DivergenceBarProps {
  /** Drawn to the left of the center line, in red (e.g. commits behind). */
  left: number
  /** Drawn to the right, in green (e.g. commits ahead). */
  right: number
  /** The value that fills a side. Values above it are capped. */
  max?: number
  /** Words for the tooltip: "3 behind, 5 ahead of main". */
  leftLabel?: string
  rightLabel?: string
  of?: string
  /** Show the two numbers after the bar (default). */
  numbers?: boolean
  className?: string
}

/**
 * Two-sided mini bar for a pair of opposing counts, sized to sit in a table
 * cell: behind | ahead of a branch, lost | gained, out | in. Red grows left
 * from the center line, green grows right, each side 40px at `max`.
 */
export function DivergenceBar({
  left,
  right,
  max = 12,
  leftLabel = 'behind',
  rightLabel = 'ahead',
  of,
  numbers = true,
  className,
}: DivergenceBarProps) {
  const width = (n: number) => `${Math.round((Math.min(Math.max(n, 0), max) / max) * 40)}px`
  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      title={`${left} ${leftLabel}, ${right} ${rightLabel}${of ? ` of ${of}` : ''}`}
    >
      <span aria-hidden className="inline-grid grid-cols-[40px_1px_40px] items-center">
        <span className="h-1.5 justify-self-end rounded-l-full bg-destructive/75" style={{ width: width(left) }} />
        <span className="h-3 w-px bg-muted-foreground/50" />
        <span className="h-1.5 rounded-r-full bg-success/80" style={{ width: width(right) }} />
      </span>
      {numbers && (
        <span className="font-mono text-xs tabular-nums">
          <span className="text-destructive">{left}</span>
          <span className="text-muted-foreground"> | </span>
          <span className="text-success">{right}</span>
        </span>
      )}
    </span>
  )
}
