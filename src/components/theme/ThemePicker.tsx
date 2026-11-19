import { useId, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { PALETTE_GROUPS, PALETTES, tokens, type Palette } from '@/lib/palettes'
import { setThemeMode, usePalette, useThemeMode, type ThemeMode } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** Strip of the colors that define a palette: drawer, page, card, primary, accent, highlight, success. */
export function Swatches({ p, dark, className }: { p: Palette; dark: boolean; className?: string }) {
  const t = tokens(p, dark)
  if (p.backdrop) {
    // Picture themes: the picture itself, with the primary, highlight and success chips on the right.
    const src = (dark && p.backdrop.dark ? p.backdrop.dark : p.backdrop).thumb
    return (
      <span
        className={cn(
          'flex h-5 justify-end overflow-hidden rounded-md bg-cover bg-center ring-1 ring-black/10 dark:ring-white/15',
          className,
        )}
        style={{ backgroundImage: `url("${src}")` }}
      >
        {[t.primary, t.highlight, t.success].map((c, i) => (
          <span key={i} className="h-full w-[12%]" style={{ background: c }} />
        ))}
      </span>
    )
  }
  const cols = [t.sidebar, t.background, t.card, t.primary, t.accent, t.highlight, t.success]
  return (
    <span className={cn('flex h-5 overflow-hidden rounded-md ring-1 ring-black/10 dark:ring-white/15', className)}>
      {cols.map((c, i) => (
        <span key={i} className="h-full flex-1" style={{ background: c }} />
      ))}
    </span>
  )
}

/** Settings card: light / dark mode and the color schemes, in collapsible sets (one open at a time). */
export function AppearanceCard({ className }: { className?: string }) {
  const [palette, setPalette] = usePalette()
  const [mode] = useThemeMode()
  const dark = mode === 'dark'
  // Always starts fully collapsed, and at most one set is open: opening another closes the first.
  const [openSet, setOpenSet] = useState<string | null>(null)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Pick light or dark mode and a color scheme. They apply instantly and are remembered.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Mode</span>
          <Segmented<ThemeMode>
            aria-label="Color mode"
            value={mode}
            onChange={setThemeMode}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
        <div className="flex flex-col divide-y overflow-hidden rounded-xl border">
          {PALETTE_GROUPS.map((g) => (
            <PaletteSet
              key={g.label}
              label={g.label}
              palettes={PALETTES.slice(g.from, g.to)}
              dark={dark}
              active={palette}
              onPick={setPalette}
              open={openSet === g.label}
              onToggle={() => setOpenSet((s) => (s === g.label ? null : g.label))}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** One collapsible set: a header row (name, count, current scheme, swatch preview) over a grid of schemes. */
function PaletteSet({
  label,
  palettes,
  dark,
  active,
  onPick,
  open,
  onToggle,
}: {
  label: string
  palettes: Palette[]
  dark: boolean
  active: string
  onPick: (id: string) => void
  open: boolean
  onToggle: () => void
}) {
  const panelId = useId()
  const current = palettes.find((p) => p.id === active)
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
      >
        <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{palettes.length}</span>
          {current && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground">
              <Check className="size-3" />
              {current.name}
            </span>
          )}
        </span>
        {!open && (
          <span className="hidden shrink-0 gap-1 sm:flex" aria-hidden>
            {palettes.slice(0, 6).map((p) => (
              <Swatches key={p.id} p={p} dark={dark} className="h-4 w-10" />
            ))}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className="grid grid-cols-1 gap-4 px-4 pt-1 pb-4 sm:grid-cols-2 xl:grid-cols-3">
          {palettes.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              aria-pressed={p.id === active}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-4 text-left transition-all outline-none hover:-translate-y-0.5 hover:shadow-elevation-2 focus-visible:ring-[3px] focus-visible:ring-ring',
                p.id === active && 'border-primary ring-2 ring-primary/30',
              )}
            >
              <Swatches p={p} dark={dark} className="h-9" />
              <span className="flex items-center justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.blurb}</span>
                </span>
                {p.id === active && <Check className="size-4 shrink-0 text-primary" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
