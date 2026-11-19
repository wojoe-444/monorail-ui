import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronRight, Circle, CornerDownLeft, Search, X } from 'lucide-react'

import { visibleItems, type IconComponent, type NavSection } from '@/components/layout/nav'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { APP } from '@/app/config'
import { readJson, writeJson } from '@/lib/prefs'
import { navigate } from '@/lib/router'
import { cn } from '@/lib/utils'

import { closeSearch, openSearch, useSearchState, type SearchState } from './store'

/** How many results each section shows when searching everything; one section of its own shows up to `SCOPED_MAX`. */
const GROUP_MAX = 5
const SCOPED_MAX = 60
const RECENT_KEY = 'search.recent'
const RECENT_MAX = 6

/** One page in the index. */
interface Entry {
  path: string
  label: string
  description?: string
  icon?: IconComponent
  /** The drawer section's heading; undefined for items outside a named section (home, pinned). */
  section?: string
  /** The parent item of a subpage. */
  parent?: string
  /** Lower-cased text the search runs over. */
  text: string
}

interface Item {
  key: string
  label: string
  detail?: string
  icon?: IconComponent
  /** Where choosing it goes. */
  path?: string
  /** A section heading: choosing it narrows the search to that section instead of leaving. */
  section?: string
}

interface Group {
  id: string
  heading: string
  /** Shown at the right of the heading: a count, or "See all" to narrow to that section. */
  aside?: ReactNode
  /** Lay the items out as tiles (the sections to browse). */
  tiles?: boolean
  items: Item[]
}

function buildIndex(sections: NavSection[]): Entry[] {
  const out: Entry[] = []
  for (const s of sections) {
    for (const item of visibleItems(s.items)) {
      const add = (e: Omit<Entry, 'text'>) =>
        out.push({ ...e, text: [e.label, e.parent, e.section, e.description].filter(Boolean).join(' ').toLowerCase() })
      add({ path: item.path, label: item.label, description: item.description, icon: item.icon, section: s.heading })
      for (const c of item.children ?? [])
        add({ path: c.path, label: c.label, description: c.description, icon: c.icon ?? item.icon, section: s.heading, parent: item.label })
    }
  }
  return out
}

/** Entries matching every word of `q`, best first: label starts with it, label contains it, every word in the label, the rest. */
function search(entries: Entry[], q: string): Entry[] {
  const query = q.trim().toLowerCase()
  const words = query.split(/\s+/).filter(Boolean)
  const scored: { e: Entry; score: number; i: number }[] = []
  entries.forEach((e, i) => {
    if (!words.every((w) => e.text.includes(w))) return
    const label = e.label.toLowerCase()
    const score = label.startsWith(query) ? 0 : label.includes(query) ? 1 : words.every((w) => label.includes(w)) ? 2 : 3
    scored.push({ e, score, i })
  })
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).map((s) => s.e)
}

const entryItem = (e: Entry): Item => ({
  key: `page:${e.path}`,
  label: e.label,
  detail: [e.parent, e.description].filter(Boolean).join(' · ') || e.section,
  icon: e.icon,
  path: e.path,
})

/**
 * The command palette: one search over every page in the drawer (and its
 * subpages), by name, parent, section and description. Ctrl+K opens it
 * anywhere; so does the top bar's search field, or `openSearch()` from code.
 * Before anything is typed it shows recent pages and the drawer's sections to
 * browse. Mount it once, in `AppShell`.
 */
export function CommandPalette({ sections }: { sections: NavSection[] }) {
  const state = useSearchState()

  // Ctrl+K anywhere; a second press closes it.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k') return
      e.preventDefault()
      if (state.open) closeSearch()
      else openSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.open])

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && closeSearch()}>
      <DialogContent
        showClose={false}
        aria-describedby="command-palette-help"
        className="top-[10vh] flex max-h-[min(640px,80vh)] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden p-0"
        // The body focuses its own input when it mounts.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Search {APP.name}</DialogTitle>
        <DialogDescription id="command-palette-help" className="sr-only">
          Search every page. Up and down move, Enter opens, Tab changes which section is searched, Escape closes.
        </DialogDescription>
        {/* Keyed by the open, so every open starts fresh from how it was opened. */}
        <PaletteBody key={state.openId} start={state} sections={sections} />
      </DialogContent>
    </Dialog>
  )
}

function PaletteBody({ start, sections }: { start: SearchState; sections: NavSection[] }) {
  const index = useMemo(() => buildIndex(sections), [sections])
  const headings = useMemo(
    () => sections.filter((s) => s.heading && !s.pinned && visibleItems(s.items).length > 0).map((s) => s.heading!),
    [sections],
  )
  const scopes: (string | undefined)[] = useMemo(() => [undefined, ...headings], [headings])
  const [query, setQuery] = useState(start.query)
  const [section, setSection] = useState<string | undefined>(start.section)
  const [active, setActive] = useState(0)
  const [recents] = useState<string[]>(() => readJson<string[]>(RECENT_KEY, []))
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  const narrow = (s: string | undefined) => {
    setSection(s)
    setActive(0)
    input.current?.focus()
  }

  const groups = useMemo<Group[]>(() => {
    const q = query.trim()
    const out: Group[] = []

    if (!q && !section) {
      const byPath = new Map(index.map((e) => [e.path, e]))
      const recent = recents.flatMap((p) => (byPath.has(p) ? [{ ...entryItem(byPath.get(p)!), key: `recent:${p}` }] : []))
      if (recent.length) out.push({ id: 'recent', heading: 'Recent', items: recent })
      out.push({
        id: 'browse',
        heading: 'Browse',
        tiles: true,
        items: headings.map((h) => {
          const pages = index.filter((e) => e.section === h)
          const examples = pages.filter((e) => !e.parent).slice(0, 3).map((e) => e.label)
          return { key: `section:${h}`, label: h, detail: `${pages.length} pages · ${examples.join(', ')}`, section: h }
        }),
      })
      return out
    }

    if (!q && section) {
      // One section, browsed: its single pages first, then each item with subpages as its own group.
      const s = sections.find((x) => x.heading === section)
      const items = s ? visibleItems(s.items) : []
      const single = items.filter((i) => !i.children?.length)
      const find = (path: string) => index.find((e) => e.path === path)
      if (single.length) out.push({ id: 'pages', heading: section, items: single.flatMap((i) => (find(i.path) ? [entryItem(find(i.path)!)] : [])) })
      for (const i of items.filter((i) => i.children?.length)) {
        const pages = [i, ...(i.children ?? [])].flatMap((c) => (find(c.path) ? [entryItem(find(c.path)!)] : []))
        out.push({ id: `item:${i.path}`, heading: i.label, aside: <span>{pages.length}</span>, items: pages })
      }
      return out
    }

    const hits = search(section ? index.filter((e) => e.section === section) : index, q)
    if (section) {
      out.push({ id: 'hits', heading: section, aside: hits.length ? <span>{hits.length}</span> : undefined, items: hits.slice(0, SCOPED_MAX).map(entryItem) })
      return out
    }
    // Everything: one group per section, in drawer order, with pages outside a named section first.
    for (const h of [undefined, ...headings]) {
      const inGroup = hits.filter((e) => e.section === h)
      if (!inGroup.length) continue
      out.push({
        id: `hits:${h ?? ''}`,
        heading: h ?? 'Pages',
        aside:
          h && inGroup.length > GROUP_MAX ? (
            <button type="button" className="hover:text-foreground" onClick={() => narrow(h)}>
              See all {inGroup.length}
            </button>
          ) : (
            <span>{inGroup.length}</span>
          ),
        items: inGroup.slice(0, GROUP_MAX).map(entryItem),
      })
    }
    return out
  }, [query, section, recents, index, headings, sections])

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const current = flat[Math.min(active, flat.length - 1)]

  // Keep the highlighted result in view.
  useEffect(() => {
    if (!current) return
    list.current?.querySelector(`[data-key="${CSS.escape(current.key)}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [current])

  function choose(item: Item) {
    if (item.section) {
      setQuery('')
      narrow(item.section)
      return
    }
    if (!item.path) return
    writeJson(RECENT_KEY, [item.path, ...recents.filter((p) => p !== item.path)].slice(0, RECENT_MAX))
    closeSearch()
    navigate(item.path)
  }

  function cycleScope(dir: 1 | -1) {
    const i = scopes.indexOf(section)
    narrow(scopes[(i + dir + scopes.length) % scopes.length])
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, flat.length - 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0))
    else if (e.key === 'Enter' && current) choose(current)
    else if (e.key === 'Tab') cycleScope(e.shiftKey ? -1 : 1)
    else if (e.key === 'Backspace' && !query && section) narrow(undefined)
    else return
    e.preventDefault()
  }

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        {section && (
          <button
            type="button"
            onClick={() => narrow(undefined)}
            className="flex shrink-0 items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-soft-foreground"
            aria-label={`Search everything, not just ${section}`}
          >
            {section}
            <X className="size-3" />
          </button>
        )}
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder={section ? `Search ${section}…` : 'Search pages…'}
          aria-label={`Search ${APP.name}`}
          role="combobox"
          aria-expanded
          aria-controls="command-palette-results"
          aria-activedescendant={current ? `cp-${current.key}` : undefined}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:block">Esc</kbd>
      </div>

      {headings.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b px-3 py-2" role="tablist" aria-label="What to search">
          {scopes.map((s) => (
            <button
              key={s ?? 'all'}
              type="button"
              role="tab"
              aria-selected={section === s}
              onClick={() => narrow(s)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                section === s ? 'bg-primary-soft font-semibold text-primary-soft-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {s ?? 'All'}
            </button>
          ))}
        </div>
      )}

      <div ref={list} id="command-palette-results" role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {groups.map((g) => (
          <div key={g.id} role="group" aria-label={g.heading} className="pb-1">
            <div className="flex items-center justify-between px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <span>{g.heading}</span>
              {g.aside && <span className="font-normal tracking-normal normal-case">{g.aside}</span>}
            </div>
            {g.tiles ? (
              <div className="grid grid-cols-1 gap-1.5 px-1 pb-1 sm:grid-cols-3">
                {g.items.map((item) => (
                  <SectionTile key={item.key} item={item} on={item === current} onHover={() => setActive(flat.indexOf(item))} onChoose={() => choose(item)} />
                ))}
              </div>
            ) : (
              g.items.map((item) => (
                <Row key={item.key} item={item} on={item === current} onHover={() => setActive(flat.indexOf(item))} onChoose={() => choose(item)} />
              ))
            )}
          </div>
        ))}
        {flat.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {query.trim() ? `Nothing matches “${query.trim()}”.` : 'Nothing here yet.'}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground">
        <Hint keys={['↑', '↓']}>move</Hint>
        <Hint keys={[<CornerDownLeft key="enter" className="size-3" />]}>open</Hint>
        {headings.length > 0 && <Hint keys={['Tab']}>change section</Hint>}
        {section && <Hint keys={['⌫']}>back</Hint>}
      </div>
    </>
  )
}

function Row({ item, on, onHover, onChoose }: { item: Item; on: boolean; onHover: () => void; onChoose: () => void }) {
  const Icon = item.icon ?? Circle
  return (
    <button
      type="button"
      id={`cp-${item.key}`}
      data-key={item.key}
      role="option"
      aria-selected={on}
      tabIndex={-1}
      onMouseMove={onHover}
      onClick={onChoose}
      className={cn('flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left', on && 'bg-muted')}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.label}</span>
        {item.detail && <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>}
      </span>
      {on && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
    </button>
  )
}

function SectionTile({ item, on, onHover, onChoose }: { item: Item; on: boolean; onHover: () => void; onChoose: () => void }) {
  const [count, examples] = (item.detail ?? '').split(' · ')
  return (
    <button
      type="button"
      id={`cp-${item.key}`}
      data-key={item.key}
      role="option"
      aria-selected={on}
      tabIndex={-1}
      onMouseMove={onHover}
      onClick={onChoose}
      className={cn('flex min-w-0 flex-col rounded-lg p-2.5 text-left ring-1 ring-foreground/10', on && 'bg-muted ring-foreground/20')}
    >
      <span className="flex items-center justify-between gap-2 text-sm font-medium">
        <span className="truncate">{item.label}</span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </span>
      <span className="text-xs text-muted-foreground">{count}</span>
      {examples && <span className="mt-0.5 truncate text-[11px] text-muted-foreground">{examples}</span>}
    </button>
  )
}

function Hint({ keys, children }: { keys: ReactNode[]; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd key={i} className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
          {k}
        </kbd>
      ))}
      {children}
    </span>
  )
}
