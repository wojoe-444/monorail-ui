import { useMemo } from 'react'

import { parseWikiTop, wikiTopUrl, type WikiArticle } from '@/features/lab/sources'
import { useLiveData, type LiveData } from '@/features/lab/useLiveData'

const DAY = 86_400_000

export interface RankedArticle extends WikiArticle {
  prevRank: number | null
  prevViews: number | null
  /** Not in the previous day's top 1,000. */
  isNew: boolean
  /** views / prevViews − 1 */
  change: number | null
}

export interface Attention {
  current: LiveData<WikiArticle[]>
  previous: LiveData<WikiArticle[]>
  day: Date
  prevDay: Date
  articles: RankedArticle[] | undefined
  prevList: WikiArticle[] | undefined
}

/**
 * Yesterday's (UTC) top articles, or the day before when yesterday's list
 * isn't published yet, plus the day before that for rises and falls.
 */
export function useAttention(): Attention {
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const d1 = new Date(today - DAY)
  const d2 = new Date(today - 2 * DAY)

  const first = useLiveData<WikiArticle[]>(wikiTopUrl(d1), { parse: parseWikiTop })
  const needFallback = first.data === undefined && !!first.error
  const fallback = useLiveData<WikiArticle[]>(needFallback ? wikiTopUrl(d2) : null, { parse: parseWikiTop })

  const usingFallback = first.data === undefined && needFallback
  const current = usingFallback ? fallback : first
  const day = usingFallback ? d2 : d1
  const prevDay = new Date(day.getTime() - DAY)
  const previous = useLiveData<WikiArticle[]>(current.data ? wikiTopUrl(prevDay) : null, { parse: parseWikiTop })

  const articles = useMemo(() => {
    if (!current.data || !previous.data) return undefined
    const prev = new Map(previous.data.map((a) => [a.article, a]))
    return current.data.map((a): RankedArticle => {
      const p = prev.get(a.article)
      return {
        ...a,
        prevRank: p?.rank ?? null,
        prevViews: p?.views ?? null,
        isNew: !p,
        change: p ? a.views / p.views - 1 : null,
      }
    })
  }, [current.data, previous.data])

  return { current, previous, day, prevDay, articles, prevList: previous.data }
}

export const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
export const full = new Intl.NumberFormat('en')

export function utcDay(d: Date, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return d.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
}

export function signedPct(n: number): string {
  const v = Math.abs(n * 100)
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(v < 10 ? 1 : 0)}%`
}

export const wikiLink = (article: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(article)}`
