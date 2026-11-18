import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'

import { experiment } from '@/features/lab/catalog'
import { SourceLine } from '@/features/lab/LabKit'
import { fastext, pageDef, PAGE_NUMBERS, type PageDef, type PageState } from '@/features/lab/pages/catalog'
import { GridRows, RowView } from '@/features/lab/pages/ScreenView'
import { bar, blank, COLS, padR, ROWS, row, s, type Row } from '@/features/lab/pages/screen'
import { useElementSize, useNow } from '@/features/lab/useLiveData'
import { navigate, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Pages: a paged information service. Forty columns by twenty-five rows,
 * three-digit page numbers typed on the keyboard, four colored keys for
 * the sections, subpages that turn by themselves. Every page is live data
 * from the lab's feeds, set in a character grid that scales to the window.
 */

const EXP = experiment('pages')
const CYCLE_MS = 8_000
// Grid size in em: 40 columns of 0.6em, 25 rows of 1.25em, plus 1em padding a side.
const GRID_W = COLS * 0.6 + 2
const GRID_H = (ROWS + 2) * 1.25 + 2
const KEY_SERIES = ['var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-1)']
const KEY_NAMES = ['r', 'g', 'y', 'b']

export function PagesPage() {
  const asked = Number(useSearchParams().get('p'))
  const n = asked >= 100 && asked <= 999 ? asked : 100
  const go = useCallback((p: number) => navigate(p === 100 ? '/lab/pages' : `/lab/pages?p=${p}`), [])
  const def = pageDef(n)
  return <Runner key={n} n={n} def={def} go={go} />
}

/** Keyed by page number, so each page's feed hooks run in a stable order. */
function Runner({ n, def, go }: { n: number; def: PageDef | undefined; go: (p: number) => void }) {
  const state = (def ?? missing(n)).use()
  return <Frame n={n} state={state} go={go} />
}

function missing(n: number): PageDef {
  return {
    n,
    title: 'NOT IN SERVICE',
    use: (): PageState => ({
      feeds: [],
      source: 'Lab Pages',
      screens: [
        [
          bar(`P${n} NOT IN SERVICE`, 'muted'),
          blank(),
          row(s(`  THERE IS NO PAGE ${n}.`, 'fg', { bold: true })),
          blank(),
          row(s('  THE INDEX IS ON PAGE ', 'fg'), s('100', 'highlight', { go: 100, bold: true })),
          row(s('  HEADLINES ARE ON PAGE ', 'fg'), s('101', 'highlight', { go: 101, bold: true })),
        ],
      ],
    }),
  }
}

function Frame({ n, state, go }: { n: number; state: PageState; go: (p: number) => void }) {
  const screens = state.screens ?? []
  const count = Math.max(1, screens.length)
  const [sub, setSub] = useState(0)
  const [hold, setHold] = useState(false)
  const [entry, setEntry] = useState('')
  const [area, size] = useElementSize()
  const keys = fastext(n)

  // Subpages turn by themselves until someone turns one by hand.
  useEffect(() => {
    if (count < 2 || hold) return
    const id = window.setInterval(() => setSub((x) => (x + 1) % count), CYCLE_MS)
    return () => window.clearInterval(id)
  }, [count, hold])
  const shown = Math.min(sub, count - 1)

  const step = useCallback(
    (d: number) => {
      const i = PAGE_NUMBERS.indexOf(n)
      const at = i < 0 ? PAGE_NUMBERS.findIndex((p) => p > n) - (d > 0 ? 1 : 0) : i
      go(PAGE_NUMBERS[(at + d + PAGE_NUMBERS.length) % PAGE_NUMBERS.length])
    },
    [n, go],
  )
  const turn = useCallback(
    (d: number) => {
      setHold(true)
      setSub((x) => (x + d + count) % count)
    },
    [count],
  )
  const digit = useCallback(
    (dg: string) => {
      setEntry((e) => {
        const next = e + dg
        if (next.length === 1 && dg === '0') return '' // page numbers start at 100
        if (next.length === 3) {
          window.setTimeout(() => {
            go(Number(next))
            setEntry('')
          }, 150)
          return next
        }
        return next
      })
    },
    [go],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select')) return
      let handled = true
      if (/^[0-9]$/.test(e.key)) digit(e.key)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowUp') turn(-1)
      else if (e.key === 'ArrowDown') turn(1)
      else if (KEY_NAMES.includes(e.key)) go(keys[KEY_NAMES.indexOf(e.key)][1])
      else if (e.key === 'Escape' || e.key === 'Backspace') setEntry('')
      else handled = false
      if (handled) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [digit, step, turn, go, keys])

  const font = Math.max(7, Math.min(30, Math.floor(Math.min(size.width / GRID_W, size.height / GRID_H) * 10) / 10))
  const rows: Row[] = screens[shown] ?? []

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2">
        <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">{EXP.title}</span>
        <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:inline">{EXP.thesis}</span>
        <SourceLine source={state.source} feeds={state.feeds} className="min-w-0" />
      </div>

      <div ref={area} className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        {size.width > 0 && (
          <div
            role="region"
            aria-label={`Page ${n}${count > 1 ? `, subpage ${shown + 1} of ${count}` : ''}`}
            aria-live="polite"
            className="rounded-xl bg-card font-mono ring-1 ring-foreground/10 shadow-elevation-2 select-text"
            style={{ fontSize: font, padding: '1em', width: `${COLS * 0.6 + 2}em` }}
          >
            <Header n={n} entry={entry} sub={shown} count={count} />
            <GridRows rows={rows} height={ROWS} onGo={go} />
            <RowView row={fastextRow(keys)} onGo={go} />
          </div>
        )}
      </div>

      <Remote digit={digit} step={step} turn={turn} subpages={count > 1} entry={entry} keys={keys} go={go} />
    </div>
  )
}

function Header({ n, entry, sub, count }: { n: number; entry: string; sub: number; count: number }) {
  const now = useNow(1000)
  const d = new Date(now)
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).replace(',', '')
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const num = entry ? `P${padR(entry, 3).replace(/ /g, '_')}` : `P${n}`
  const subText = count > 1 ? ` ${sub + 1}/${count}` : ''
  const left = `${num}  LAB PAGES${subText}`
  const right = `${date} ${time}`
  return (
    <RowView
      row={row(
        s(num, entry ? 'warning' : 'highlight', { bold: true }),
        s('  LAB PAGES', 'fg'),
        s(subText, 'muted'),
        s(' '.repeat(Math.max(1, COLS - left.length - right.length))),
        s(date + ' ', 'fg'),
        s(time, 'highlight', { bold: true }),
      )}
      onGo={() => {}}
    />
  )
}

function fastextRow(keys: [string, number][]): Row {
  return row(
    ...keys.flatMap(([label, page], i) => [s('■ ', (['s2', 's3', 's4', 's1'] as const)[i]), s(padR(label, 7), 'fg', { go: page }), s(' ')]),
  )
}

// ── The remote: a keypad for touch and mouse ───────────────────────────────

function Remote({
  digit,
  step,
  turn,
  subpages,
  entry,
  keys,
  go,
}: {
  digit: (d: string) => void
  step: (d: number) => void
  turn: (d: number) => void
  subpages: boolean
  entry: string
  keys: [string, number][]
  go: (p: number) => void
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 border-t px-3 py-3">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {'1234567890'.split('').map((dg) => (
          <Key key={dg} label={`Digit ${dg}`} onClick={() => digit(dg)}>
            {dg}
          </Key>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <Key label="Previous page" onClick={() => step(-1)}>
          <ChevronLeft className="size-4" />
        </Key>
        <Key label="Next page" onClick={() => step(1)}>
          <ChevronRight className="size-4" />
        </Key>
        <Key label="Previous subpage" onClick={() => turn(-1)} disabled={!subpages}>
          <ChevronUp className="size-4" />
        </Key>
        <Key label="Next subpage" onClick={() => turn(1)} disabled={!subpages}>
          <ChevronDown className="size-4" />
        </Key>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {keys.map(([label, page], i) => (
          <button
            key={label}
            type="button"
            onClick={() => go(page)}
            className="inline-flex items-center gap-1.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: KEY_SERIES[i] }} />
            {label}
            <kbd className="hidden rounded-sm border bg-muted px-1 font-mono text-[10px] sm:inline">{KEY_NAMES[i]}</kbd>
          </button>
        ))}
        <span className={cn('hidden font-mono md:inline', entry && 'text-foreground')}>{entry ? `going to P${entry}…` : 'type 3 digits · ← → page · ↑ ↓ subpage'}</span>
      </div>
    </div>
  )
}

function Key({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 items-center justify-center rounded-md border bg-card font-mono text-sm shadow-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
    >
      {children}
    </button>
  )
}
