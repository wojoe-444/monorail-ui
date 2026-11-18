import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CornerDownLeft } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Answer, Chips, useIndicators } from '@/features/lab/ask/answers'
import { FIRST_VISIT, parse, suggest, type CountryRef } from '@/features/lab/ask/query'
import { experiment } from '@/features/lab/catalog'
import { readJson, writeJson } from '@/lib/prefs'
import { navigate, useSearchParams } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Ask: one input box. Questions go in a tiny, forgiving query language; each
 * answer comes back as a card with a sentence, a small chart and where the
 * numbers came from. The transcript (newest first) is kept in prefs and
 * re-runs live on every visit. ?q= runs a query, so answers are linkable.
 */

const EXP = experiment('ask')
const STORE = 'ask.transcript'
const MAX = 20

interface Entry {
  id: string
  q: string
  at: number
}

export function AskPage() {
  const [items, setItems] = useState<Entry[]>(() => readJson<Entry[]>(STORE, []))
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [recall, setRecall] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const urlQ = useSearchParams().get('q')

  const ind = useIndicators()
  const countries: CountryRef[] = useMemo(() => (ind.data?.countries ?? []).map((c) => ({ iso3: c.iso3, name: c.name })), [ind.data])
  const suggestions = useMemo(() => (open ? suggest(text, countries) : []), [open, text, countries])

  useEffect(() => writeJson(STORE, items), [items])

  const add = (q: string) =>
    setItems((list) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, q, at: Date.now() }, ...list.filter((e) => e.q !== q)].slice(0, MAX))

  const run = (raw: string) => {
    const q = raw.trim().replace(/\s+/g, ' ')
    if (!q) return
    add(q)
    setText('')
    setOpen(false)
    setActive(-1)
    setRecall(-1)
    navigate(`/lab/ask?q=${encodeURIComponent(q)}`)
    window.scrollTo?.({ top: 0 })
  }

  // ?q= from a link or a reload runs once, unless it's already the newest answer.
  useEffect(() => {
    if (urlQ && items[0]?.q !== urlQ) add(urlQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ])

  // "/" focuses the box from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = suggestions.length
    if (e.key === 'ArrowDown') {
      if (n) {
        e.preventDefault()
        setActive((a) => (a + 1) % n)
      } else if (recall >= 0) {
        e.preventDefault()
        const r = recall - 1
        setRecall(r)
        setText(r >= 0 ? items[r].q : '')
      }
    } else if (e.key === 'ArrowUp') {
      if (n && open && text) {
        e.preventDefault()
        setActive((a) => (a <= 0 ? n - 1 : a - 1))
      } else if (items.length && (!text || recall >= 0)) {
        // History recall, like a shell.
        e.preventDefault()
        const r = Math.min(items.length - 1, recall + 1)
        setRecall(r)
        setText(items[r].q)
        setOpen(false)
      }
    } else if (e.key === 'Tab' && n && open) {
      e.preventDefault()
      setText(suggestions[Math.max(0, active)] + ' ')
      setActive(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(active >= 0 && open && n ? suggestions[active] : text)
    } else if (e.key === 'Escape') {
      if (open && n) setOpen(false)
      else input.current?.blur()
    }
  }

  const remove = (id: string) => {
    const gone = items.find((e) => e.id === id)
    setItems((list) => list.filter((e) => e.id !== id))
    if (gone && gone.q === urlQ) navigate('/lab/ask')
  }

  const showList = open && suggestions.length > 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader eyebrow="Experiment" title={EXP.title} description={EXP.thesis} />

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Label htmlFor="ask-box" className="sr-only">
            Ask the lab a question
          </Label>
          <div
            className={cn(
              'flex h-14 items-center gap-3 rounded-xl border border-input bg-card px-4 shadow-elevation-1 transition-shadow focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring',
              showList && 'rounded-b-none',
            )}
          >
            <span aria-hidden className="font-mono text-lg text-muted-foreground select-none">
              ›
            </span>
            <input
              ref={input}
              id="ask-box"
              value={text}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
              placeholder="quakes japan 7d"
              onChange={(e) => {
                setText(e.target.value)
                setOpen(true)
                setActive(-1)
                setRecall(-1)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={onKeyDown}
              className="h-full min-w-0 flex-1 bg-transparent font-mono text-base outline-none placeholder:text-muted-foreground/60 sm:text-lg"
            />
            <kbd className="hidden shrink-0 items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline-flex">
              {text ? (
                <>
                  <CornerDownLeft className="size-3" /> ask
                </>
              ) : (
                '/'
              )}
            </kbd>
          </div>
          {showList && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Suggestions"
              className="absolute inset-x-0 top-full z-30 overflow-hidden rounded-b-xl border border-t-0 border-input bg-popover py-1 shadow-elevation-3"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    run(s)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn('flex cursor-pointer items-center justify-between px-4 py-2 font-mono text-sm', i === active ? 'bg-accent text-accent-foreground' : 'text-foreground/80')}
                >
                  <span className="truncate">{s}</span>
                  {i === active && <span className="text-[11px] text-muted-foreground">tab to complete</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Type <button type="button" className="font-mono text-foreground/80 underline decoration-dotted underline-offset-4 hover:text-foreground" onClick={() => run('help')}>help</button> for
            everything I know. ↑ recalls earlier questions.
          </span>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => (setItems([]), navigate('/lab/ask'))}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="max-w-md text-sm text-muted-foreground">Nothing asked yet. The page stays empty until you ask, so here are some starting points:</p>
          <Chips className="justify-center" items={FIRST_VISIT} onRun={run} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((e) => (
            <Answer key={e.id} q={e.q} at={e.at} intent={parse(e.q, countries)} onRemove={() => remove(e.id)} onRun={run} />
          ))}
        </div>
      )}
    </div>
  )
}
