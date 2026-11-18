import { useEffect, useState } from 'react'

import { HN_TOP, hnItem } from '@/features/lab/sources'
import { useLiveData, type LiveData } from '@/features/lab/useLiveData'

export interface HnStory {
  id: number
  rank: number
  title: string
  url: string
  domain: string
  score: number
  comments: number
  time: number
  by: string
}

function domainOf(url: string | undefined): string {
  if (!url) return 'news.ycombinator.com'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Top Hacker News stories: the id list from the shared cache, then the first
 * `n` items fetched in parallel. Items refetch whenever the id list does, so
 * scores and comment counts stay current. Returns the LiveData shape so it
 * plugs into SourceLine and LoadGate like any other feed.
 */
export function useHackerNews(n = 30, refreshMs = 120_000): LiveData<HnStory[]> {
  const ids = useLiveData<number[]>(HN_TOP, { refreshMs })
  const [items, setItems] = useState<HnStory[]>()
  const [updatedAt, setUpdatedAt] = useState<number>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const top = ids.data?.slice(0, n).join(',')
  useEffect(() => {
    if (!top) return
    let cancelled = false
    setBusy(true)
    Promise.all(
      top.split(',').map((id) =>
        fetch(hnItem(Number(id)))
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    )
      .then((rows) => {
        if (cancelled) return
        const stories = rows
          .filter((r): r is NonNullable<typeof r> => !!r && !r.deleted && !r.dead)
          .map((r, i) => ({
            id: r.id,
            rank: i + 1,
            title: r.title ?? '(untitled)',
            url: r.url ?? `https://news.ycombinator.com/item?id=${r.id}`,
            domain: domainOf(r.url),
            score: r.score ?? 0,
            comments: r.descendants ?? 0,
            time: (r.time ?? 0) * 1000,
            by: r.by ?? '',
          }))
        if (stories.length === 0) setError('no stories returned')
        else {
          setItems(stories)
          setError(undefined)
          setUpdatedAt(Date.now())
        }
      })
      .finally(() => !cancelled && setBusy(false))
    return () => {
      cancelled = true
    }
    // ids.updatedAt: refetch items on every list refresh, even if the order is unchanged.
  }, [top, ids.updatedAt])

  return {
    data: items,
    error: error ?? (items ? undefined : ids.error),
    loading: !items && !error && !ids.error,
    refreshing: !!items && (busy || ids.refreshing),
    updatedAt,
    reload: ids.reload,
  }
}
