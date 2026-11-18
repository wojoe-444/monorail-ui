import { useCallback, useEffect, useRef, useState } from 'react'

import type { LiveData } from '@/features/lab/useLiveData'

/**
 * Wikimedia's live recent-changes stream (Server-Sent Events, every wiki,
 * ~20–60 events a second). Events are buffered in a ref and flushed to React
 * at 5 Hz, so the log moves smoothly without a render per event.
 *
 * `categorize` events (a page added to a category) are dropped: they are a
 * side effect of edits already in the stream and would double the noise.
 */

export const STREAM_URL = 'https://stream.wikimedia.org/v2/stream/recentchange'

export type Project = 'en' | 'wikidata' | 'commons' | 'other'
export type EventType = 'edit' | 'new' | 'log'

export interface WikiEvent {
  id: string
  /** When the change happened (ms). */
  t: number
  /** When it arrived here (ms); rates use this so a lagging stream doesn't distort them. */
  at: number
  type: EventType
  wiki: string
  /** Short label: en, de, wikidata, commons, fr.wikt … */
  code: string
  project: Project
  server: string
  title: string
  ns: number
  user: string
  bot: boolean
  minor: boolean
  /** Bytes added (+) or removed (−); null for log entries. */
  delta: number | null
  /** Where a click goes: the diff for edits, the page for new pages, the log target otherwise. */
  link: string
  comment: string
  logType?: string
}

const PROJECT_SHORT: [RegExp, string][] = [
  [/\.wikipedia\.org$/, ''],
  [/\.wiktionary\.org$/, '.wikt'],
  [/\.wikisource\.org$/, '.src'],
  [/\.wikiquote\.org$/, '.quote'],
  [/\.wikibooks\.org$/, '.books'],
  [/\.wikinews\.org$/, '.news'],
  [/\.wikivoyage\.org$/, '.voy'],
  [/\.wikiversity\.org$/, '.vers'],
]

export function shortCode(server: string): string {
  if (server === 'www.wikidata.org') return 'wikidata'
  if (server === 'commons.wikimedia.org') return 'commons'
  if (server === 'www.mediawiki.org') return 'mw'
  if (server.endsWith('.wikimedia.org')) return server.replace('.wikimedia.org', '')
  for (const [re, suffix] of PROJECT_SHORT) if (re.test(server)) return server.replace(re, '') + suffix
  return server.split('.')[0]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEvent(raw: any, at: number): WikiEvent | null {
  if (raw.type !== 'edit' && raw.type !== 'new' && raw.type !== 'log') return null
  const server: string = raw.server_name ?? raw.meta?.domain ?? ''
  const project: Project = raw.wiki === 'enwiki' ? 'en' : raw.wiki === 'wikidatawiki' ? 'wikidata' : raw.wiki === 'commonswiki' ? 'commons' : 'other'
  const delta = raw.length && typeof raw.length.new === 'number' ? raw.length.new - (raw.length.old ?? 0) : null
  const page = raw.title_url ?? raw.meta?.uri ?? `https://${server}`
  const link =
    raw.type === 'edit' && raw.revision?.new && raw.revision?.old
      ? `https://${server}/w/index.php?diff=${raw.revision.new}&oldid=${raw.revision.old}`
      : page
  return {
    id: String(raw.meta?.id ?? raw.id),
    t: raw.meta?.dt ? Date.parse(raw.meta.dt) : raw.timestamp * 1000,
    at,
    type: raw.type,
    wiki: raw.wiki,
    code: shortCode(server),
    project,
    server,
    title: raw.title ?? '',
    ns: raw.namespace ?? 0,
    user: raw.user ?? '',
    bot: !!raw.bot,
    minor: !!raw.minor,
    delta,
    link,
    comment: raw.comment ?? '',
    logType: raw.log_type,
  }
}

const KEEP = 600
const WINDOW_MS = 5 * 60_000
export const BUCKET_MS = 5_000
export const BUCKETS = WINDOW_MS / BUCKET_MS

export interface WikiStream {
  /** Newest first, at most 600. */
  events: WikiEvent[]
  /** Arrivals per 5 s bucket for the last 5 minutes, oldest first; the last bucket is filling. */
  buckets: number[]
  /** Everything that arrived in the last 5 minutes, newest first. Read it on `tick`. */
  windowRef: React.RefObject<WikiEvent[]>
  /** Bumps on every flush (5 Hz). */
  tick: number
  total: number
  openedAt: number
  status: 'connecting' | 'open' | 'retrying'
  lastAt?: number
  reconnect: () => void
  /** The stream as a LiveData, so it plugs into SourceLine and LoadGate. */
  feed: LiveData<unknown>
}

export function useWikiStream(): WikiStream {
  const pending = useRef<WikiEvent[]>([])
  const windowRef = useRef<WikiEvent[]>([])
  const bucketRef = useRef<{ start: number; counts: number[] }>({ start: Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS, counts: new Array(BUCKETS).fill(0) })
  const [state, setState] = useState<{ events: WikiEvent[]; buckets: number[]; tick: number; total: number; lastAt?: number }>({
    events: [],
    buckets: new Array(BUCKETS).fill(0),
    tick: 0,
    total: 0,
  })
  const [status, setStatus] = useState<'connecting' | 'open' | 'retrying'>('connecting')
  const [openedAt] = useState(() => Date.now())
  const [generation, setGeneration] = useState(0)
  const totalRef = useRef(0)

  // Connection, with backoff when the browser gives up on its own retries.
  useEffect(() => {
    let es: EventSource | null = null
    let retry = 0
    let timer = 0
    let disposed = false
    const connect = () => {
      if (disposed) return
      es = new EventSource(STREAM_URL)
      es.onopen = () => {
        retry = 0
        setStatus('open')
      }
      es.onmessage = (m) => {
        try {
          const ev = toEvent(JSON.parse(m.data), Date.now())
          if (ev) pending.current.push(ev)
        } catch {
          /* a malformed line: skip it */
        }
      }
      es.onerror = () => {
        if (!es) return
        if (es.readyState === EventSource.CLOSED) {
          es.close()
          setStatus('retrying')
          retry++
          timer = window.setTimeout(connect, Math.min(30_000, 2000 * retry))
        } else setStatus('retrying')
      }
    }
    connect()
    return () => {
      disposed = true
      window.clearTimeout(timer)
      es?.close()
    }
  }, [generation])

  // Flush at 5 Hz: newest first, roll the rate buckets, trim the 5-minute window.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now()
      const b = bucketRef.current
      const current = Math.floor(now / BUCKET_MS) * BUCKET_MS
      const steps = Math.round((current - b.start) / BUCKET_MS)
      if (steps > 0) {
        b.counts = steps >= BUCKETS ? new Array(BUCKETS).fill(0) : [...b.counts.slice(steps), ...new Array(steps).fill(0)]
        b.start = current
      }
      const batch = pending.current
      pending.current = []
      if (batch.length) {
        b.counts[BUCKETS - 1] += batch.length
        totalRef.current += batch.length
        batch.reverse()
        windowRef.current = batch.concat(windowRef.current)
      }
      const cutoff = now - WINDOW_MS
      let end = windowRef.current.length
      while (end > 0 && windowRef.current[end - 1].at < cutoff) end--
      if (end < windowRef.current.length) windowRef.current = windowRef.current.slice(0, end)
      setState((s) => ({
        events: batch.length ? batch.concat(s.events).slice(0, KEEP) : s.events,
        buckets: [...b.counts],
        tick: s.tick + 1,
        total: totalRef.current,
        lastAt: batch.length ? now : s.lastAt,
      }))
    }, 200)
    return () => window.clearInterval(id)
  }, [])

  const reconnect = useCallback(() => {
    setStatus('connecting')
    setGeneration((g) => g + 1)
  }, [])

  const feed: LiveData<unknown> = {
    data: state.total > 0 ? true : undefined,
    error: status === 'retrying' ? 'reconnecting to the stream' : undefined,
    loading: state.total === 0 && status !== 'retrying',
    refreshing: false,
    updatedAt: state.lastAt,
    reload: reconnect,
  }

  return { ...state, windowRef, openedAt, status, reconnect, feed }
}
