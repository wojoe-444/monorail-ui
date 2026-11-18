import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/**
 * Wikipedia page summaries (the one-line description and a thumbnail),
 * fetched lazily: a row asks only once it scrolls into view, through a small
 * queue so 40 rows never fire 40 requests at once. Results live in a module
 * cache for the session.
 */

export interface Summary {
  description: string | null
  extract: string | null
  thumb: string | null
}

const cache = new Map<string, Summary | null>()
const pending = new Set<string>()
const queue: string[] = []
const listeners = new Set<() => void>()
let active = 0
let version = 0
const MAX = 4

function emit() {
  version++
  listeners.forEach((l) => l())
}

function pump() {
  while (active < MAX && queue.length) {
    const article = queue.shift()!
    active++
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        cache.set(
          article,
          j ? { description: j.description ?? null, extract: j.extract ?? null, thumb: j.thumbnail?.source ?? null } : null,
        )
      })
      .catch(() => cache.set(article, null))
      .finally(() => {
        active--
        pending.delete(article)
        emit()
        pump()
      })
  }
}

function request(article: string, urgent = false) {
  if (cache.has(article) || pending.has(article)) return
  pending.add(article)
  if (urgent) queue.unshift(article)
  else queue.push(article)
  pump()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** `undefined` while unknown or loading, `null` when the page has no summary. */
export function useSummary(article: string, enabled: boolean, urgent = false): Summary | null | undefined {
  useSyncExternalStore(subscribe, () => version)
  useEffect(() => {
    if (enabled) request(article, urgent)
  }, [article, enabled, urgent])
  return cache.get(article)
}

/** True once the element has been on screen (never flips back). */
export function useSeen<E extends Element>() {
  const ref = useRef<E>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen] as const
}
