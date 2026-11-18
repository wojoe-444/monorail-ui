import { Legend } from '@/components/charts/Legend'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { FuelShare } from '@/features/lab/sources'

import { useWidth } from './useWidth'
import { groupMix, INK } from './util'

/**
 * Generation mix right now as a tall segmented bar: one whole, split into
 * parts, share printed inside where it fits. A bracket over the zero-carbon
 * blocks carries the number people actually ask about.
 */
export function MixBar({ mix }: { mix: FuelShare[] }) {
  const [barRef, barWidth] = useWidth()
  const groups = groupMix(mix).filter((g) => g.perc > 0)
  const total = groups.reduce((s, g) => s + g.perc, 0) || 1
  const zero = groups.filter((g) => g.zero)
  const zeroShare = zero.reduce((s, g) => s + g.perc, 0) / total
  const zeroWidth = zeroShare * 100
  const fossil = (mix.find((m) => m.fuel === 'gas')?.perc ?? 0) + (mix.find((m) => m.fuel === 'coal')?.perc ?? 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-4xl font-semibold tracking-tight">{Math.round(zeroShare * 100)}%</div>
        <div className="text-right text-xs text-muted-foreground">
          fossil fuels <span className="font-semibold text-foreground tabular-nums">{Math.round(fossil)}%</span>
        </div>
      </div>
      <div className="-mt-2 text-xs text-muted-foreground">of Britain’s power is wind, solar or nuclear right now</div>

      <div className="relative mt-1 pt-7">
        {zeroWidth > 0 && (
          <div className="absolute top-0 left-0 flex flex-col gap-1" style={{ width: `${zeroWidth}%` }} aria-hidden>
            <span className="truncate text-center text-[11px] font-medium text-muted-foreground">zero-carbon</span>
            <span className="h-1.5 border-x border-t border-foreground/35" />
          </div>
        )}
        <div ref={barRef} className="flex h-7 gap-0.5" role="img" aria-label={groups.map((g) => `${g.label} ${g.perc.toFixed(1)}%`).join(', ')}>
          {groups.map((g) => {
            const share = g.perc / total
            const label = `${Math.round(share * 100)}%`
            // A share prints inside its block only when it fits: ~7px a character plus the block padding.
            const fits = share * barWidth - 2 >= (label.length + 1) * 7 + 12
            return (
              <Tooltip key={g.key}>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    className="flex min-w-0 items-center rounded-[4px] px-1.5 text-xs font-semibold tabular-nums outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ width: `${share * 100}%`, background: g.color, color: INK[g.ink] }}
                  >
                    {fits ? label : null}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {g.label}: {g.perc.toFixed(1)}%
                  {g.parts.length > 1 && (
                    <span className="opacity-70"> ({g.parts.map((p) => `${p.fuel} ${p.perc.toFixed(1)}%`).join(', ')})</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
      <Legend items={groups.map((g) => ({ key: g.key, label: g.label, color: g.color }))} />
    </div>
  )
}
