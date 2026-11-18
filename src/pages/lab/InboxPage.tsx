import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Clock,
  ExternalLink,
  Inbox as InboxIcon,
  Keyboard,
  MailOpen,
  Search,
  SlidersHorizontal,
  Star,
  Tag,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { relative } from '@/features/lab/ask/format'
import { experiment } from '@/features/lab/catalog'
import {
  useCarbonWindow,
  useKpForecast,
  useKpNow,
  useLaunchesPrevious,
  useLaunchesUpcoming,
  useQuakesMonth,
  useWeather,
  useWikiDay,
  useWikiLatest,
  useXray,
} from '@/features/lab/feeds'
import { buildMessages, DEFAULT_RULES, LABELS, type Label as MsgLabel, type Message, type Rules } from '@/features/lab/inbox/messages'
import { SourceLine } from '@/features/lab/LabKit'
import { CITIES } from '@/features/lab/sources'
import { useNow } from '@/features/lab/useLiveData'
import { readJson, writeJson } from '@/lib/prefs'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

/*
 * Inbox: alerts as messages to triage. Rules over the live feeds generate
 * messages with stable ids; read / starred / snoozed / archived state lives
 * in prefs by id. Three panes on a wide screen (folders, list, message), list
 * then message on a phone. Gmail-style keys: j/k, o, u, e, s, h, Shift+I/U,
 * /, g then i/s/a/t, and ? for the full list.
 */

const EXP = experiment('inbox')
const NYC = CITIES[0]

type Folder = 'inbox' | 'important' | 'starred' | 'snoozed' | 'archive' | `label:${MsgLabel}`
interface MsgState {
  read?: boolean
  star?: boolean
  snooze?: number
  archived?: boolean
}

const FOLDERS: { id: Folder; name: string; icon: typeof InboxIcon }[] = [
  { id: 'inbox', name: 'Inbox', icon: InboxIcon },
  { id: 'important', name: 'Important', icon: AlertTriangle },
  { id: 'starred', name: 'Starred', icon: Star },
  { id: 'snoozed', name: 'Snoozed', icon: Clock },
  { id: 'archive', name: 'Archive', icon: Archive },
]

function folderName(f: Folder) {
  return f.startsWith('label:') ? LABELS.find((l) => `label:${l.id}` === f)!.name : FOLDERS.find((x) => x.id === f)!.name
}

function receivedLabel(t: number, now: number) {
  if (now - t < 20 * 3600_000) return relative(t, now)
  if (now - t < 6 * 86400_000) return new Date(t).toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function snoozeTimes(now: number) {
  const d = new Date(now)
  const tonight = new Date(d)
  tonight.setHours(18, 0, 0, 0)
  if (tonight.getTime() <= now) tonight.setDate(tonight.getDate() + 1)
  const tomorrow = new Date(d)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)
  return [
    { key: '1', label: 'In an hour', at: now + 3600_000 },
    { key: '2', label: tonight.getDate() === d.getDate() ? 'This evening, 6 pm' : 'Tomorrow, 6 pm', at: tonight.getTime() },
    { key: '3', label: 'Tomorrow, 8 am', at: tomorrow.getTime() },
  ]
}

export function InboxPage() {
  const now = useNow(30_000)
  const quakes = useQuakesMonth()
  const kpNow = useKpNow()
  const kpf = useKpForecast()
  const xray = useXray()
  const carbon = useCarbonWindow()
  const weather = useWeather(NYC)
  const upcoming = useLaunchesUpcoming()
  const previous = useLaunchesPrevious()
  const wiki = useWikiLatest()
  const wiki2 = useWikiDay(2)
  const wiki3 = useWikiDay(3)
  const wikiPrev = wiki.daysAgo === 1 ? wiki2.data : wiki3.data
  const feeds = [quakes, kpNow, kpf, xray, carbon, weather, upcoming, previous, wiki]

  const [rules, setRulesState] = useState<Rules>(() => ({ ...DEFAULT_RULES, ...readJson<Partial<Rules>>('inbox.rules', {}) }))
  const setRules = (r: Rules) => {
    setRulesState(r)
    writeJson('inbox.rules', r)
  }
  const [state, setStateRaw] = useState<Record<string, MsgState>>(() => readJson('inbox.state', {}))
  const patch = (ids: string[], p: Partial<MsgState>) =>
    setStateRaw((s) => {
      const next = { ...s }
      for (const id of ids) next[id] = { ...next[id], ...p }
      writeJson('inbox.state', next)
      return next
    })

  // Bucket the clock to the minute so messages don't rebuild every render.
  const messages = useMemo(
    () =>
      buildMessages(
        {
          quakes: quakes.data,
          kpNow: kpNow.data,
          kpf: kpf.data,
          xray: xray.data,
          carbon: carbon.data,
          weather: weather.data,
          upcoming: upcoming.data,
          previous: previous.data,
          wiki: wiki.data,
          wikiPrev,
        },
        rules,
        now,
      ),
    [quakes.data, kpNow.data, kpf.data, xray.data, carbon.data, weather.data, upcoming.data, previous.data, wiki.data, wikiPrev, rules, now],
  )

  const [folder, setFolder] = useState<Folder>('inbox')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [reading, setReading] = useState(false) // phone: message view open
  const [helpOpen, setHelpOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const search = useRef<HTMLInputElement>(null)
  // Only mark messages read once the person has moved or opened one: an auto-selected first message stays unread.
  const acted = useRef(false)
  const listRef = useRef<HTMLUListElement>(null)

  const st = (id: string) => state[id] ?? {}
  const snoozed = (m: Message) => (st(m.id).snooze ?? 0) > now
  const inInbox = (m: Message) => !st(m.id).archived && !snoozed(m)
  const inFolder = (m: Message, f: Folder): boolean => {
    if (f === 'inbox') return inInbox(m)
    if (f === 'important') return inInbox(m) && m.important
    if (f === 'starred') return !!st(m.id).star
    if (f === 'snoozed') return snoozed(m)
    if (f === 'archive') return !!st(m.id).archived
    return inInbox(m) && `label:${m.label}` === f
  }
  const unread = (f: Folder) => messages.filter((m) => inFolder(m, f) && !st(m.id).read).length
  const total = (f: Folder) => messages.filter((m) => inFolder(m, f)).length

  const q = query.trim().toLowerCase()
  const list = messages.filter((m) => inFolder(m, folder) && (!q || `${m.subject} ${m.preview} ${m.sender}`.toLowerCase().includes(q)))
  const current = list.find((m) => m.id === selected) ?? null

  // Keep a valid selection; opening a message marks it read.
  useEffect(() => {
    if (selected && !list.some((m) => m.id === selected)) setSelected(list[0]?.id ?? null)
    else if (!selected && list.length && window.matchMedia('(min-width: 1024px)').matches) setSelected(list[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map((m) => m.id).join(), selected])
  useEffect(() => {
    if (!current || st(current.id).read || !acted.current) return
    const t = window.setTimeout(() => patch([current.id], { read: true }), 700)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const move = (d: 1 | -1) => {
    acted.current = true
    if (!list.length) return
    const i = list.findIndex((m) => m.id === selected)
    const n = list[Math.max(0, Math.min(list.length - 1, i < 0 ? 0 : i + d))]
    setSelected(n.id)
  }
  // Acting on a message moves the selection to its neighbour, like a mail client.
  const actAndAdvance = (id: string, p: Partial<MsgState>) => {
    const i = list.findIndex((m) => m.id === id)
    const nextId = list[i + 1]?.id ?? list[i - 1]?.id ?? null
    patch([id], p)
    setSelected(nextId)
  }
  const archive = (m: Message) => actAndAdvance(m.id, folder === 'archive' ? { archived: false } : { archived: true, snooze: undefined })
  const toggleStar = (m: Message) => patch([m.id], { star: !st(m.id).star })
  const snooze = (m: Message, at: number) => {
    actAndAdvance(m.id, { snooze: at, archived: false })
    setSnoozeOpen(false)
  }
  const openFolder = (f: Folder) => {
    setFolder(f)
    setSelected(null)
    setReading(false)
  }

  // Keyboard. Refs keep the handler current without re-binding each render.
  const live = useRef({ list, current, move, archive, toggleStar, patch, openFolder, setReading, folder })
  live.current = { list, current, move, archive, toggleStar, patch, openFolder, setReading, folder }
  useEffect(() => {
    let g = 0
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t.isContentEditable
      if (typing) {
        if (e.key === 'Escape') (t as HTMLInputElement).blur()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      const L = live.current
      const c = L.current
      if (Date.now() - g < 1200) {
        g = 0
        const to: Record<string, Folder> = { i: 'inbox', s: 'starred', a: 'archive', t: 'important', z: 'snoozed' }
        if (to[e.key]) {
          e.preventDefault()
          L.openFolder(to[e.key])
        }
        return
      }
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          L.move(1)
          break
        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          L.move(-1)
          break
        case 'o':
        case 'Enter':
          if (c) {
            L.setReading(true)
            L.patch([c.id], { read: true })
          }
          break
        case 'u':
        case 'Escape':
          L.setReading(false)
          break
        case 'e':
          if (c) L.archive(c)
          break
        case 's':
          if (c) L.toggleStar(c)
          break
        case 'h':
          if (c) {
            e.preventDefault()
            setSnoozeOpen(true)
          }
          break
        case 'I':
          if (c) L.patch([c.id], { read: true })
          break
        case 'U':
          if (c) L.patch([c.id], { read: false })
          break
        case '/':
          e.preventDefault()
          search.current?.focus()
          break
        case 'g':
          g = Date.now()
          break
        case '?':
          setHelpOpen(true)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const loadingAny = feeds.some((f) => f.loading)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">Experiment</div>
            <h1 className="text-2xl font-semibold tracking-tight">{EXP.title}</h1>
            <p className="mt-1 hidden max-w-2xl text-sm text-muted-foreground sm:block">{EXP.thesis}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>
              <SlidersHorizontal />
              Rules
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Keyboard shortcuts (?)" onClick={() => setHelpOpen(true)}>
                  <Keyboard />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <SourceLine source="USGS · NOAA SWPC · NESO · Open-Meteo · Launch Library · Wikimedia" feeds={feeds} />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="lg:hidden">
              <Label htmlFor="inbox-folder" className="sr-only">
                Folder
              </Label>
              <NativeSelect id="inbox-folder" value={folder} onChange={(e) => openFolder(e.target.value as Folder)} className="w-40">
                {FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {unread(f.id) ? `(${unread(f.id)})` : ''}
                  </option>
                ))}
                {LABELS.map((l) => (
                  <option key={l.id} value={`label:${l.id}`}>
                    {l.name} {unread(`label:${l.id}`) ? `(${unread(`label:${l.id}`)})` : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Label htmlFor="inbox-search" className="sr-only">
                Search messages
              </Label>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input ref={search} id="inbox-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search  /" className="h-8 pl-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Panes */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[13rem_minmax(20rem,26rem)_minmax(0,1fr)]">
        {/* Folders */}
        <nav aria-label="Folders" className="hidden min-h-0 flex-col gap-4 overflow-y-auto border-r p-3 lg:flex">
          <ul className="flex flex-col gap-0.5">
            {FOLDERS.map((f) => (
              <FolderItem key={f.id} active={folder === f.id} icon={<f.icon className="size-4" />} name={f.name} count={f.id === 'archive' || f.id === 'snoozed' ? total(f.id) : unread(f.id)} onClick={() => openFolder(f.id)} />
            ))}
          </ul>
          <div>
            <div className="px-2 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Labels</div>
            <ul className="flex flex-col gap-0.5">
              {LABELS.map((l) => (
                <FolderItem
                  key={l.id}
                  active={folder === `label:${l.id}`}
                  icon={<Tag className="size-4" />}
                  name={l.name}
                  count={unread(`label:${l.id}`)}
                  onClick={() => openFolder(`label:${l.id}`)}
                />
              ))}
            </ul>
          </div>
          <p className="mt-auto px-2 text-[11px] leading-relaxed text-muted-foreground">
            Messages come from rules over live feeds. Change what gets in with <span className="font-medium text-foreground/80">Rules</span>.
          </p>
        </nav>

        {/* List */}
        <section aria-label={folderName(folder)} className={cn('flex min-h-0 flex-col border-r', reading && 'hidden lg:flex')}>
          <div className="flex h-10 shrink-0 items-center justify-between border-b px-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{folderName(folder)}</span>
            <span className="tabular-nums">
              {list.length} {list.length === 1 ? 'message' : 'messages'}
              {unread(folder) ? ` · ${unread(folder)} unread` : ''}
            </span>
          </div>
          {list.length === 0 ? (
            <EmptyList folder={folder} rules={rules} loading={loadingAny} searching={!!q} />
          ) : (
            <ul ref={listRef} role="listbox" aria-label="Messages" className="min-h-0 flex-1 divide-y overflow-y-auto">
              {list.map((m) => {
                const s = st(m.id)
                const sel = m.id === selected
                return (
                  <li
                    key={m.id}
                    role="option"
                    aria-selected={sel}
                    onClick={() => {
                      acted.current = true
                      setSelected(m.id)
                      setReading(true)
                      if (m.id === selected && !st(m.id).read) patch([m.id], { read: true })
                    }}
                    className={cn(
                      'relative flex cursor-pointer gap-3 px-4 py-3 transition-colors',
                      sel ? 'bg-accent' : 'hover:bg-accent/50',
                      sel && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary',
                    )}
                  >
                    <div className="flex w-3 shrink-0 flex-col items-center gap-2 pt-1.5">
                      {!s.read && <span aria-label="unread" className="size-2 rounded-full bg-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn('truncate text-sm', s.read ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{m.sender}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{receivedLabel(m.time, now)}</span>
                      </div>
                      <div className={cn('mt-0.5 flex items-center gap-1.5 text-sm', s.read ? 'text-foreground/80' : 'font-medium text-foreground')}>
                        {m.severity && <SeverityIcon tone={m.severity.tone} />}
                        <span className="truncate">{m.subject}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-xs text-muted-foreground">{m.preview}</span>
                        {s.star && <Star aria-label="starred" className="size-3.5 shrink-0 fill-current text-warning" />}
                        {snoozed(m) && folder !== 'snoozed' && <Clock aria-label="snoozed" className="size-3.5 shrink-0 text-muted-foreground" />}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Reading pane */}
        <section aria-label="Message" className={cn('min-h-0 overflow-y-auto', !reading && 'hidden lg:block')}>
          {current ? (
            <Reader
              m={current}
              s={st(current.id)}
              now={now}
              folder={folder}
              snoozeOpen={snoozeOpen}
              setSnoozeOpen={setSnoozeOpen}
              onBack={() => setReading(false)}
              onArchive={() => archive(current)}
              onStar={() => toggleStar(current)}
              onSnooze={(at) => snooze(current, at)}
              onUnread={() => {
                patch([current.id], { read: false })
                setReading(false)
              }}
              onUnsnooze={() => patch([current.id], { snooze: undefined })}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <MailOpen className="size-6" />
              <p>Select a message.</p>
              <p className="text-xs">
                <Kbd>j</Kbd> <Kbd>k</Kbd> to move, <Kbd>?</Kbd> for every shortcut.
              </p>
            </div>
          )}
        </section>
      </div>

      <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} rules={rules} setRules={setRules} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}

function FolderItem({ active, icon, name, count, onClick }: { active: boolean; icon: ReactNode; name: string; count: number; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active ? 'bg-primary-soft font-medium text-primary-soft-foreground' : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
        )}
      >
        {icon}
        <span className="flex-1 truncate text-left">{name}</span>
        {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
      </button>
    </li>
  )
}

function SeverityIcon({ tone }: { tone: 'destructive' | 'warning' }) {
  return tone === 'destructive' ? (
    <AlertOctagon aria-hidden className="size-3.5 shrink-0 text-destructive" />
  ) : (
    <AlertTriangle aria-hidden className="size-3.5 shrink-0 text-warning-soft-foreground" />
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">{children}</kbd>
}

function Reader({
  m,
  s,
  now,
  folder,
  snoozeOpen,
  setSnoozeOpen,
  onBack,
  onArchive,
  onStar,
  onSnooze,
  onUnread,
  onUnsnooze,
}: {
  m: Message
  s: MsgState
  now: number
  folder: Folder
  snoozeOpen: boolean
  setSnoozeOpen: (o: boolean) => void
  onBack: () => void
  onArchive: () => void
  onStar: () => void
  onSnooze: (at: number) => void
  onUnread: () => void
  onUnsnooze: () => void
}) {
  const label = LABELS.find((l) => l.id === m.label)!.name
  const snoozedUntil = (s.snooze ?? 0) > now ? s.snooze! : null
  const times = snoozeTimes(now)
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="-ml-2 lg:hidden" onClick={onBack}>
          <ArrowLeft />
          Back
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Action label={folder === 'archive' ? 'Move to inbox (E)' : 'Archive (E)'} onClick={onArchive}>
            {folder === 'archive' ? <InboxIcon /> : <Archive />}
          </Action>
          <Action label={s.star ? 'Unstar (S)' : 'Star (S)'} onClick={onStar}>
            <Star className={cn(s.star && 'fill-current text-warning')} />
          </Action>
          <DropdownMenu open={snoozeOpen} onOpenChange={setSnoozeOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label="Snooze (H)">
                    <Clock />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Snooze (H)</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" onKeyDown={(e) => {
              const t = times.find((x) => x.key === e.key)
              if (t) onSnooze(t.at)
            }}>
              <DropdownMenuLabel>Snooze until…</DropdownMenuLabel>
              {times.map((t) => (
                <DropdownMenuItem key={t.key} onSelect={() => onSnooze(t.at)}>
                  <span className="flex-1">{t.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <Kbd>{t.key}</Kbd>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Action label="Mark unread (Shift+U)" onClick={onUnread}>
            <MailOpen />
          </Action>
        </div>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <Tag />
            {label}
          </Badge>
          {m.severity && (
            <Badge variant={m.severity.tone === 'destructive' ? 'destructive' : 'warning'}>
              {m.severity.tone === 'destructive' ? <AlertOctagon /> : <AlertTriangle />}
              {m.severity.text}
            </Badge>
          )}
          {m.important && !m.severity && (
            <Badge variant="warning">
              <AlertTriangle />
              Important
            </Badge>
          )}
          {snoozedUntil && (
            <Badge variant="outline">
              <Clock />
              Snoozed until {new Date(snoozedUntil).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              <button type="button" className="ml-1 underline underline-offset-2" onClick={onUnsnooze}>
                undo
              </button>
            </Badge>
          )}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{m.subject}</h2>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{m.sender.charAt(0)}</div>
          <div className="min-w-0 text-sm">
            <div className="font-medium">{m.sender}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(m.time).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {relative(m.time, now)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 border-t pt-5">{m.body()}</div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
        <a href={m.source.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <ExternalLink className="size-3.5" />
          {m.source.label}
        </a>
        {m.open && (
          <a href={href(m.open.path)} className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-foreground">
            Open in {m.open.label}
            <ArrowRight className="size-4" />
          </a>
        )}
      </footer>
    </article>
  )
}

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function EmptyList({ folder, rules, loading, searching }: { folder: Folder; rules: Rules; loading: boolean; searching: boolean }) {
  if (loading) return <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">Checking the feeds…</div>
  if (searching) return <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">No messages match that search.</div>
  if (folder !== 'inbox' && folder !== 'important') {
    const words: Partial<Record<Folder, string>> = { starred: 'Nothing starred. Press S on a message to keep it here.', snoozed: 'Nothing snoozed. Press H to bring a message back later.', archive: 'Archive is empty. Press E to file a message away.' }
    return <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">{words[folder] ?? `Nothing in ${folderName(folder)} right now.`}</div>
  }
  const active = [
    rules.quakes.on && `earthquakes of M${rules.quakes.minMag}+ in the last 3 days`,
    rules.kp.on && `Kp ${rules.kp.threshold} or more, or a storm in the forecast`,
    rules.flares.on && 'solar flares of M class or above',
    rules.grid.on && `GB grid above ${rules.grid.dirty} g CO₂/kWh${rules.grid.digest ? ', plus the daily clean-window digest' : ''}`,
    rules.weather.on && `New York rain chance of ${rules.weather.rain}%+ or a ${rules.weather.swing}°C swing tomorrow`,
    rules.launches.on && 'launches in the next 24 hours and recent failures',
    rules.wiki.on && 'a new #1 article on Wikipedia',
  ].filter(Boolean) as string[]
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <InboxIcon className="size-6 text-muted-foreground" />
      <p className="font-medium">Inbox zero. Nothing crossed a threshold.</p>
      <div className="max-w-xs text-xs text-muted-foreground">
        <p className="mb-1">Watching for:</p>
        <ul className="flex flex-col gap-0.5">
          {active.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function RulesDialog({ open, onOpenChange, rules, setRules }: { open: boolean; onOpenChange: (o: boolean) => void; rules: Rules; setRules: (r: Rules) => void }) {
  const row = (id: string, title: string, desc: string, on: boolean, toggle: (v: boolean) => void, control?: ReactNode) => (
    <div className="flex items-start gap-4 py-3">
      <Switch id={id} checked={on} onCheckedChange={toggle} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <Label htmlFor={id}>{title}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      {control}
    </div>
  )
  const select = (id: string, label: string, value: number, options: number[], fmt: (n: number) => string, set: (n: number) => void, disabled: boolean) => (
    <div className="w-28 shrink-0">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <NativeSelect id={id} value={value} disabled={disabled} onChange={(e) => set(+e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {fmt(o)}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Rules</DialogTitle>
          <DialogDescription>What earns a message. Changes apply at once; read and archived state is kept.</DialogDescription>
        </DialogHeader>
        <div className="divide-y">
          {row(
            'r-q',
            'Earthquakes',
            'Any quake at or above this magnitude in the last 3 days. M6.5+, tsunami flags and PAGER yellow+ are marked important.',
            rules.quakes.on,
            (on) => setRules({ ...rules, quakes: { ...rules.quakes, on } }),
            select('r-q-m', 'Minimum magnitude', rules.quakes.minMag, [4.5, 5, 5.5, 6, 6.5], (n) => `M${n}+`, (minMag) => setRules({ ...rules, quakes: { ...rules.quakes, minMag } }), !rules.quakes.on),
          )}
          {row(
            'r-k',
            'Geomagnetic activity',
            'Kp now at or above the threshold, or a G1+ storm in the 3-day forecast.',
            rules.kp.on,
            (on) => setRules({ ...rules, kp: { ...rules.kp, on } }),
            select('r-k-t', 'Kp threshold', rules.kp.threshold, [3, 4, 5, 6], (n) => `Kp ${n}+`, (threshold) => setRules({ ...rules, kp: { ...rules.kp, threshold } }), !rules.kp.on),
          )}
          {row('r-f', 'Solar flares', 'Every flare of M class or above in the past day.', rules.flares.on, (on) => setRules({ ...rules, flares: { on } }))}
          {row(
            'r-g',
            'GB grid',
            'A daily digest of the cleanest 3 hours, and a warning when intensity passes the threshold.',
            rules.grid.on,
            (on) => setRules({ ...rules, grid: { ...rules.grid, on } }),
            select('r-g-t', 'Dirty threshold', rules.grid.dirty, [150, 175, 200, 250], (n) => `${n} g`, (dirty) => setRules({ ...rules, grid: { ...rules.grid, dirty } }), !rules.grid.on),
          )}
          {row(
            'r-w',
            'New York weather',
            'Rain likely tomorrow, or a big change in the daily high.',
            rules.weather.on,
            (on) => setRules({ ...rules, weather: { ...rules.weather, on } }),
            select('r-w-s', 'Temperature swing', rules.weather.swing, [5, 8, 10], (n) => `${n}°C swing`, (swing) => setRules({ ...rules, weather: { ...rules.weather, swing } }), !rules.weather.on),
          )}
          {row('r-l', 'Launches', 'Launches in the next 24 hours, and failures in the past two weeks.', rules.launches.on, (on) => setRules({ ...rules, launches: { on } }))}
          {row('r-wk', 'Wikipedia', 'When a new article takes the #1 spot.', rules.wiki.on, (on) => setRules({ ...rules, wiki: { on } }))}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setRules(DEFAULT_RULES)}>
            Reset to defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const keys: [string[], string][] = [
    [['j', 'k'], 'Next / previous message'],
    [['o'], 'Open (phone) · Enter works too'],
    [['u'], 'Back to the list'],
    [['e'], 'Archive (or move back to the inbox from Archive)'],
    [['s'], 'Star / unstar'],
    [['h'], 'Snooze, then 1 / 2 / 3'],
    [['Shift', 'I'], 'Mark read'],
    [['Shift', 'U'], 'Mark unread'],
    [['/'], 'Search'],
    [['g', 'i'], 'Go to Inbox'],
    [['g', 't'], 'Go to Important'],
    [['g', 's'], 'Go to Starred'],
    [['g', 'z'], 'Go to Snoozed'],
    [['g', 'a'], 'Go to Archive'],
    [['?'], 'This list'],
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Mail-client keys. They work anywhere on the page except in a text field.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {keys.map(([k, d]) => (
            <div key={d} className="contents">
              <dt className="flex items-center gap-1">
                {k.map((x, i) => (
                  <span key={x} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-muted-foreground">{k[0] === 'Shift' ? '+' : k[0] === 'g' ? 'then' : '/'}</span>}
                    <Kbd>{x}</Kbd>
                  </span>
                ))}
              </dt>
              <dd className="text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
