import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

import { prefs } from '@/lib/prefs'

/**
 * Fetch public JSON (or text) with a shared in-memory cache, so two pages
 * reading the same feed (Tremor and Terminal both read USGS) fetch it once.
 *
 * - `refreshMs` polls in the background. A refetch keeps the previous data
 *   (`refreshing` is true) so charts hold their frame instead of flashing.
 * - `parse` turns the raw payload into what the page wants. It runs once per
 *   fetch, not per render. Pages sharing a URL must share a parser (or pass
 *   a distinct `key`).
 * - `persistMs` saves the raw payload in prefs, so a reload (or the next
 *   visit) paints the last copy at once and only refetches when it's older
 *   than `persistMs`. Use it for rate-limited feeds and small payloads.
 */

interface Entry<T> {
  data?: T
  error?: string
  updatedAt?: number
  inflight?: Promise<void>
}

const cache = new Map<string, Entry<unknown>>()
const listeners = new Map<string, Set<() => void>>()

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l())
}

const storeKey = (key: string) => `feed:${key}`

/** Seed the cache from a persisted copy, once per key per session. */
function seed(key: string, parse: (raw: unknown) => unknown) {
  if (cache.has(key)) return
  const saved = prefs.getItem(storeKey(key))
  if (!saved) return
  try {
    const { t, raw } = JSON.parse(saved) as { t: number; raw: unknown }
    cache.set(key, { data: parse(raw), updatedAt: t })
  } catch {
    prefs.removeItem(storeKey(key))
  }
}

function load(key: string, url: string, as: 'json' | 'text', parse: (raw: unknown) => unknown, force = false, persist = false): Promise<void> {
  const current = cache.get(key)
  if (current?.inflight) return current.inflight
  if (!force && current?.data !== undefined) return Promise.resolve()
  const inflight = (async () => {
    let next: Entry<unknown>
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const raw = as === 'json' ? await res.json() : await res.text()
      next = { data: parse(raw), updatedAt: Date.now() }
      if (persist) prefs.setItem(storeKey(key), JSON.stringify({ t: next.updatedAt, raw }))
    } catch (e) {
      const prev = cache.get(key)
      next = { data: prev?.data, updatedAt: prev?.updatedAt, error: e instanceof Error ? e.message : String(e) }
    }
    cache.set(key, next)
    emit(key)
  })()
  cache.set(key, { ...current, inflight })
  emit(key)
  return inflight
}

export interface LiveData<T> {
  data: T | undefined
  error: string | undefined
  /** No data yet and a fetch is running. */
  loading: boolean
  /** Has data and a background refetch is running. */
  refreshing: boolean
  updatedAt: number | undefined
  reload: () => void
}

export function useLiveData<T>(
  url: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: { parse?: (raw: any) => T; refreshMs?: number; as?: 'json' | 'text'; key?: string; persistMs?: number } = {},
): LiveData<T> {
  const key = opts.key ?? url ?? ''
  const parseRef = useRef(opts.parse)
  parseRef.current = opts.parse
  const as = opts.as ?? 'json'
  const persistMs = opts.persistMs
  if (persistMs && url) seed(key, (r) => (parseRef.current ? parseRef.current(r) : r))

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!listeners.has(key)) listeners.set(key, new Set())
      listeners.get(key)!.add(cb)
      return () => {
        listeners.get(key)!.delete(cb)
      }
    },
    [key],
  )
  const entry = useSyncExternalStore(subscribe, () => cache.get(key) as Entry<T> | undefined)

  const run = useCallback(
    (force: boolean) => {
      if (!url) return
      void load(key, url, as, (r) => (parseRef.current ? parseRef.current(r) : r), force, !!persistMs)
    },
    [key, url, as, persistMs],
  )

  useEffect(() => {
    // A persisted copy older than persistMs is shown, then replaced.
    const t = cache.get(key)?.updatedAt
    run(!!persistMs && (!t || Date.now() - t > persistMs))
    if (!opts.refreshMs) return
    const id = window.setInterval(() => run(true), opts.refreshMs)
    return () => window.clearInterval(id)
  }, [run, key, persistMs, opts.refreshMs])

  const reload = useCallback(() => run(true), [run])

  return {
    data: entry?.data,
    error: entry?.error,
    loading: !!url && entry?.data === undefined && !entry?.error,
    refreshing: entry?.data !== undefined && !!entry?.inflight,
    updatedAt: entry?.updatedAt,
    reload,
  }
}

/** Re-render every `ms` (for "updated 2m ago" labels and clock hands). */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/** Width and height of an element, for SVG charts that fill their container. */
export function useElementSize<E extends HTMLElement = HTMLDivElement>() {
  // A callback ref, so it measures even when the element mounts after the first
  // render; measured in a layout effect so the first paint already has a size.
  const [el, ref] = useState<E | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => {
      const width = el.clientWidth
      const height = el.clientHeight
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [ref, size] as const
}

export function timeAgo(t: number | undefined, now = Date.now()): string {
  if (!t) return '—'
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
