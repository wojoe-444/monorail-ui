import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { experiment } from '@/features/lab/catalog'
import { DetailPanel } from '@/features/lab/ledger/DetailPanel'
import { GroupRow, HeaderRow, Row, cellId, type DisplayItem, type Mark, type Sort } from '@/features/lab/ledger/Grid'
import { COLUMNS, buildLedger, median, regionLabel, stats, type Ledger, type LedgerRow } from '@/features/lab/ledger/model'
import { LoadGate, SourceLine } from '@/features/lab/LabKit'
import { WORLD_INDICATORS, type WorldIndicators } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

/*
 * Ledger: a spreadsheet that reads like a dashboard. 217 economies by ten
 * World Bank indicators, every cell a number plus a mark (percentile bar,
 * trend since 2000, or rank). Driven like a spreadsheet: arrows, shift to
 * select, s to sort, Enter for the row, a formula bar and a status bar.
 */

const EXP = experiment('ledger')

export function LedgerPage() {
  const feed = useLiveData<WorldIndicators>(WORLD_INDICATORS)
  const ledger = useMemo(() => (feed.data ? buildLedger(feed.data) : null), [feed.data])
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b px-6 pt-5 pb-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">Experiment</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{EXP.title}</h1>
          <p className="mt-1 hidden max-w-3xl text-sm text-muted-foreground sm:block">{EXP.thesis}</p>
        </div>
        <SourceLine source="World Bank WDI snapshot" href="https://data.worldbank.org/" feeds={[feed]} />
      </header>
      <LoadGate feeds={[feed]} label="Opening the workbook" className="flex-1">
        {() => (ledger ? <Sheet ledger={ledger} /> : null)}
      </LoadGate>
    </div>
  )
}

type Pos = { iso3: string; c: number }

function Sheet({ ledger }: { ledger: Ledger }) {
  const [region, setRegion] = useState('all')
  const [income, setIncome] = useState('all')
  const [q, setQ] = useState('')
  const [mark, setMark] = useState<Mark>('bar')
  const [group, setGroup] = useState(false)
  const [sort, setSort] = useState<Sort>({ col: 1, dir: 'desc' })
  const [active, setActive] = useState<Pos>({ iso3: '', c: 1 })
  const [anchor, setAnchor] = useState<Pos | null>(null)
  const [detail, setDetail] = useState(false)
  const grid = useRef<HTMLTableElement>(null)
  const search = useRef<HTMLInputElement>(null)

  // Filter → sort → (group). `dataRows` is what the cursor walks.
  const { items, dataRows } = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const rows = ledger.rows.filter(
      (r) => (region === 'all' || r.region === region) && (income === 'all' || r.income === income) && (!needle || r.name.toLowerCase().includes(needle)),
    )
    const dir = sort.dir === 'asc' ? 1 : -1
    const cmp = (a: LedgerRow, b: LedgerRow) => {
      if (sort.col === 'name') return a.name.localeCompare(b.name) * dir
      const va = a.cells[sort.col].value
      const vb = b.cells[sort.col].value
      if (va === null && vb === null) return a.name.localeCompare(b.name)
      if (va === null) return 1
      if (vb === null) return -1
      return (va - vb) * dir
    }
    rows.sort(cmp)
    const items: DisplayItem[] = []
    const dataRows: LedgerRow[] = []
    if (group) {
      const regions = [...new Set(rows.map((r) => r.region))].sort()
      for (const reg of regions) {
        const rs = rows.filter((r) => r.region === reg)
        items.push({
          kind: 'group',
          region: reg,
          count: rs.length,
          medians: COLUMNS.map((_, ci) => median(rs.map((r) => r.cells[ci].value).filter((v): v is number => v !== null))),
        })
        for (const r of rs) {
          items.push({ kind: 'row', row: r, index: dataRows.length })
          dataRows.push(r)
        }
      }
    } else {
      for (const r of rows) {
        items.push({ kind: 'row', row: r, index: dataRows.length })
        dataRows.push(r)
      }
    }
    return { items, dataRows }
  }, [ledger, region, income, q, sort, group])

  const indexOf = useCallback((iso3: string) => dataRows.findIndex((r) => r.iso3 === iso3), [dataRows])
  let ai = indexOf(active.iso3)
  if (ai < 0) ai = 0
  const activeRow = dataRows[ai] ?? null
  const bi = anchor ? Math.max(0, indexOf(anchor.iso3)) : ai
  const r0 = Math.min(ai, bi)
  const r1 = Math.max(ai, bi)
  const c0 = Math.min(active.c, anchor?.c ?? active.c)
  const c1 = Math.max(active.c, anchor?.c ?? active.c)

  const moveTo = useCallback(
    (i: number, c: number, extend: boolean) => {
      const row = dataRows[Math.max(0, Math.min(dataRows.length - 1, i))]
      if (!row) return
      const next = { iso3: row.iso3, c: Math.max(0, Math.min(COLUMNS.length - 1, c)) }
      setAnchor((a) => (extend ? (a ?? { iso3: activeRow?.iso3 ?? row.iso3, c: active.c }) : null))
      setActive(next)
      requestAnimationFrame(() => document.getElementById(cellId(next.iso3, next.c))?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
    },
    [dataRows, activeRow, active.c],
  )

  const sortBy = useCallback((col: number | 'name') => {
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: col === 'name' ? 'asc' : 'desc' }))
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    const page = 20
    const k = e.key
    const ext = e.shiftKey
    const handled = () => e.preventDefault()
    if (k === 'ArrowDown') (handled(), moveTo(ai + 1, active.c, ext))
    else if (k === 'ArrowUp') (handled(), moveTo(ai - 1, active.c, ext))
    else if (k === 'ArrowRight') (handled(), moveTo(ai, active.c + 1, ext))
    else if (k === 'ArrowLeft') (handled(), moveTo(ai, active.c - 1, ext))
    else if (k === 'PageDown') (handled(), moveTo(ai + page, active.c, ext))
    else if (k === 'PageUp') (handled(), moveTo(ai - page, active.c, ext))
    else if (k === 'Home') (handled(), e.ctrlKey ? moveTo(0, 0, ext) : moveTo(ai, 0, ext))
    else if (k === 'End') (handled(), e.ctrlKey ? moveTo(dataRows.length - 1, COLUMNS.length - 1, ext) : moveTo(ai, COLUMNS.length - 1, ext))
    else if (k === 'Enter') (handled(), setDetail(true))
    else if (k === 's' && !e.ctrlKey && !e.metaKey) (handled(), sortBy(active.c))
    else if (k === '/') (handled(), search.current?.focus())
    else if (k === 'Escape') (handled(), detail ? setDetail(false) : setAnchor(null))
  }

  // After a sort or filter the cursor keeps its country; bring it back into view.
  useEffect(() => {
    if (!activeRow) return
    requestAnimationFrame(() => document.getElementById(cellId(activeRow.iso3, active.c))?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, group, region, income])

  // "/" from anywhere on the page focuses search.
  useEffect(() => {
    const onDoc = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !t.closest('input, textarea, select, table')) {
        e.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', onDoc)
    return () => window.removeEventListener('keydown', onDoc)
  }, [])

  const onCell = useCallback(
    (iso3: string, c: number, extend: boolean) => {
      grid.current?.focus({ preventScroll: true })
      if (extend) setAnchor((a) => a ?? { iso3: activeRow?.iso3 ?? iso3, c: active.c })
      else setAnchor(null)
      setActive({ iso3, c })
    },
    [activeRow, active.c],
  )
  const onOpen = useCallback((iso3: string) => {
    setActive((a) => ({ ...a, iso3 }))
    setAnchor(null)
    setDetail(true)
  }, [])

  // Formula bar and status bar describe the cursor and the selection.
  const col = COLUMNS[active.c]
  const cell = activeRow?.cells[active.c]
  const ref = (i: number, c: number) => `${COLUMNS[c].letter}${i + 1}`
  const isRange = r0 !== r1 || c0 !== c1
  const nameBox = isRange ? `${ref(r0, c0)}:${ref(r1, c1)}` : activeRow ? ref(ai, active.c) : '—'
  const selValues = useMemo(() => {
    const rows = isRange ? dataRows.slice(r0, r1 + 1) : dataRows
    return rows.map((r) => r.cells[active.c].value).filter((v): v is number => v !== null)
  }, [dataRows, r0, r1, isRange, active.c])
  const st = stats(selValues)
  const cellCount = (r1 - r0 + 1) * (c1 - c0 + 1)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-end gap-x-4 gap-y-3 overflow-x-auto border-b px-6 py-3 sm:flex-wrap">
        <div className="flex shrink-0 flex-col gap-1">
          <Label htmlFor="ledger-region" className="text-xs text-muted-foreground">
            Region
          </Label>
          <NativeSelect id="ledger-region" value={region} onChange={(e) => setRegion(e.target.value)} className="w-44 sm:w-56">
            <option value="all">All regions</option>
            {ledger.regions.map((r) => (
              <option key={r} value={r}>
                {regionLabel(r)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <Label htmlFor="ledger-income" className="text-xs text-muted-foreground">
            Income
          </Label>
          <NativeSelect id="ledger-income" value={income} onChange={(e) => setIncome(e.target.value)} className="w-40 sm:w-44">
            <option value="all">All incomes</option>
            {ledger.incomes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <Label htmlFor="ledger-q" className="text-xs text-muted-foreground">
            Find <kbd className="font-mono">/</kbd>
          </Label>
          <Input
            ref={search}
            id="ledger-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'ArrowDown') {
                e.preventDefault()
                if (e.key === 'Escape') setQ('')
                grid.current?.focus()
              }
            }}
            placeholder="Country"
            className="w-36 sm:w-44"
          />
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Mark</span>
          <Segmented<Mark>
            aria-label="Mark in each cell"
            value={mark}
            onChange={setMark}
            options={[
              { value: 'bar', label: 'Bar', title: 'Percentile within the column' },
              { value: 'trend', label: 'Trend', title: '2000 to latest' },
              { value: 'rank', label: 'Rank', title: 'Rank in the column' },
            ]}
          />
        </div>
        <div className="flex h-9 shrink-0 items-center gap-2">
          <Switch id="ledger-group" checked={group} onCheckedChange={setGroup} />
          <Label htmlFor="ledger-group">Group by region</Label>
        </div>
      </div>

      {/* Formula bar */}
      <div className="flex min-w-0 items-center gap-3 border-b bg-card px-6 py-2 font-mono text-xs">
        <span className="w-20 shrink-0 rounded-sm border bg-background px-2 py-1 text-center tabular-nums" aria-label="Selected cell">
          {nameBox}
        </span>
        <span className="text-muted-foreground" aria-hidden>
          ƒx
        </span>
        <span className="min-w-0 truncate" aria-live="polite">
          {!activeRow ? (
            <span className="text-muted-foreground">No rows match the filters.</span>
          ) : isRange ? (
            <>
              =SELECTION({nameBox}) <span className="text-muted-foreground">· {cellCount} cells · stats for column {col.letter} below</span>
            </>
          ) : (
            <>
              <span className="text-primary">={col.fn}</span>(<span>"{activeRow.name}"</span>
              {cell?.year ? `, ${cell.year}` : ''})
              <span className="ml-3 font-sans font-semibold">{cell?.value != null ? col.full(cell.value) : 'no data'}</span>
              <span className="ml-3 text-muted-foreground">
                {cell?.rank ? `rank ${cell.rank} of ${ledger.counts[active.c]} · ` : ''}World Bank {col.code}
              </span>
            </>
          )}
        </span>
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table
          ref={grid}
          role="grid"
          tabIndex={0}
          aria-label="Indicators by country"
          aria-rowcount={dataRows.length + 1}
          aria-colcount={COLUMNS.length + 1}
          aria-activedescendant={activeRow ? cellId(activeRow.iso3, active.c) : undefined}
          aria-multiselectable
          onKeyDown={onKey}
          className="border-separate border-spacing-0 outline-none focus-visible:[&_td[aria-selected=true]]:bg-primary/15"
        >
          <thead>
            <HeaderRow ledger={ledger} sort={sort} onSort={sortBy} activeCol={active.c} activeRow={activeRow} />
          </thead>
          <tbody>
            {items.map((it) =>
              it.kind === 'group' ? (
                <GroupRow key={`g-${it.region}`} region={it.region} medians={it.medians} count={it.count} />
              ) : (
                <Row
                  key={it.row.iso3}
                  row={it.row}
                  num={it.index + 1}
                  mark={mark}
                  maxYear={ledger.maxYear}
                  activeCol={it.index === ai ? active.c : -1}
                  selFrom={it.index >= r0 && it.index <= r1 ? c0 : -1}
                  selTo={it.index >= r0 && it.index <= r1 ? c1 : -1}
                  onCell={onCell}
                  onOpen={onOpen}
                />
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t bg-muted px-6 py-1.5 font-mono text-[11px] text-muted-foreground">
        <span className="text-foreground">
          {col.letter} · {col.short}
          {isRange ? ` · ${r1 - r0 + 1} rows` : ` · all ${dataRows.length} rows`}
        </span>
        <Stat label="Count" v={st.count} raw />
        <Stat label="Average" v={st.avg} fmt={col.fmt} />
        <Stat label="Median" v={st.median} fmt={col.fmt} />
        <Stat label="Min" v={st.min} fmt={col.fmt} />
        <Stat label="Max" v={st.max} fmt={col.fmt} />
        {col.sum && <Stat label="Sum" v={st.sum} fmt={col.fmt} />}
        <span className="ml-auto hidden lg:inline">↑↓←→ move · ⇧ select · ↵ details · s sort · / find · esc clear</span>
      </div>

      {detail && activeRow && (
        <DetailPanel
          row={activeRow}
          ledger={ledger}
          onClose={() => {
            setDetail(false)
            grid.current?.focus()
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, v, fmt, raw }: { label: string; v: number | null; fmt?: (n: number) => string; raw?: boolean }) {
  return (
    <span className={cn('tabular-nums')}>
      {label} <span className="text-foreground">{v === null ? '–' : raw ? v.toLocaleString('en-US') : fmt!(v)}</span>
    </span>
  )
}
