import type { ReactNode } from 'react'
import { ArrowUpRight, ExternalLink, LoaderCircle } from 'lucide-react'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { wikiArticleDailyUrl } from '@/features/lab/sources'
import { useLiveData } from '@/features/lab/useLiveData'
import { cn } from '@/lib/utils'

import { compact, full, signedPct, wikiLink, type RankedArticle } from './useAttention'

/** A big riser: at least doubled its readers since the day before. */
export const isRiser = (a: RankedArticle) => a.change != null && a.change >= 1

/**
 * The typographic wall: every title set at a size proportional to √views,
 * flowing as justified text. Size, weight and ink step down together so
 * rank reads as one channel.
 */
export function Wall({ articles, prevLabel }: { articles: RankedArticle[]; prevLabel: string }) {
  const max = Math.sqrt(articles[0]?.views ?? 1)
  const min = Math.sqrt(articles.at(-1)?.views ?? 0)
  const size = (v: number) => 13 + (58 - 13) * ((Math.sqrt(v) - min) / (max - min || 1))
  return (
    <p className="text-left leading-none [text-wrap:pretty]" lang="en">
      {articles.map((a, i) => {
        const s = size(a.views)
        return (
          <span key={a.article}>
            <span
              className={cn(
                'inline',
                // Short titles stay whole; long ones may wrap so lines stay full.
                a.title.split(' ').length <= 3 && a.title.length * s * 0.55 < 320 && 'whitespace-nowrap',
                a.rank <= 12 ? 'text-foreground' : a.rank <= 35 ? 'text-foreground/80' : 'text-muted-foreground',
              )}
              style={{
                fontSize: s,
                lineHeight: s > 30 ? 1.08 : 1.3,
                fontWeight: s > 40 ? 700 : s > 26 ? 600 : s > 18 ? 500 : 400,
                letterSpacing: s > 30 ? '-0.02em' : undefined,
              }}
            >
              {a.isNew && (
                <span
                  aria-label="New today"
                  role="img"
                  className="mr-[0.2em] inline-block size-[0.28em] min-h-1.5 min-w-1.5 -translate-y-[0.12em] rounded-full bg-highlight align-middle"
                />
              )}
              <ArticleHover article={a} prevLabel={prevLabel}>
                <a
                  href={wikiLink(a.article)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm underline-offset-[0.15em] outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {a.title}
                </a>
              </ArticleHover>
              {isRiser(a) && (
                <sup className="ml-[0.1em] text-[0.45em] font-semibold text-foreground" aria-label="more than doubled">
                  ↑
                </sup>
              )}
            </span>
            {/* word joiner: a separator never starts a line */}
            {i < articles.length - 1 && '⁠'}
            {i < articles.length - 1 && (
              <span aria-hidden className="mx-[0.35em] align-middle text-sm text-muted-foreground/50">
                ·
              </span>
            )}{' '}
          </span>
        )
      })}
    </p>
  )
}

export function ArticleHover({ article, prevLabel, children }: { article: RankedArticle; prevLabel: string; children: ReactNode }) {
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-72 text-sm" style={{ fontWeight: 400, letterSpacing: 'normal' }}>
        <ArticleDetail a={article} prevLabel={prevLabel} />
      </HoverCardContent>
    </HoverCard>
  )
}

function ArticleDetail({ a, prevLabel }: { a: RankedArticle; prevLabel: string }) {
  const daily = useLiveData<number[]>(wikiArticleDailyUrl(a.article, 30), {
    parse: (raw: { items: { views: number }[] }) => raw.items.map((i) => i.views),
  })
  return (
    <div className="flex flex-col gap-3">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground tabular-nums">#{a.rank} on English Wikipedia</div>
        <div className="mt-0.5 leading-snug font-semibold">{a.title}</div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{full.format(a.views)}</div>
          <div className="text-xs text-muted-foreground">
            {a.isNew ? (
              <span>New: not in {prevLabel}’s top 1,000</span>
            ) : (
              <span className="tabular-nums">
                {signedPct(a.change!)} vs {prevLabel} (#{a.prevRank})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-md bg-muted/60 px-3 py-2">
        <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Daily readers, 30 days</span>
          {daily.data && <span className="tabular-nums">peak {compact.format(Math.max(...daily.data))}</span>}
        </div>
        {daily.data ? (
          <MiniLine data={daily.data} />
        ) : daily.error ? (
          <div className="h-10 text-xs text-muted-foreground">History unavailable</div>
        ) : (
          <div className="flex h-10 items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin" /> Loading history…
          </div>
        )}
      </div>
      <a
        href={wikiLink(a.article)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        Read on Wikipedia <ExternalLink className="size-3" />
      </a>
    </div>
  )
}

export function AttentionTable({ articles, prevLabel }: { articles: RankedArticle[]; prevLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="w-12 py-2 pr-3 text-right font-medium">Rank</th>
            <th className="py-2 pr-3 font-medium">Article</th>
            <th className="py-2 pr-3 text-right font-medium">Views</th>
            <th className="py-2 pr-3 text-right font-medium">{prevLabel}</th>
            <th className="py-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {articles.map((a) => (
            <tr key={a.article} className="hover:bg-accent/50">
              <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">{a.rank}</td>
              <td className="max-w-0 py-2 pr-3">
                <a href={wikiLink(a.article)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 hover:underline">
                  {a.isNew && <span role="img" aria-label="New today" className="size-1.5 shrink-0 rounded-full bg-highlight" />}
                  <span className="truncate">{a.title}</span>
                  {isRiser(a) && <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-label="more than doubled" />}
                </a>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{full.format(a.views)}</td>
              <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">{a.prevRank ? `#${a.prevRank}` : '—'}</td>
              <td className="py-2 text-right tabular-nums">{a.change != null ? signedPct(a.change) : <span className="text-muted-foreground">new</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 30-day line sized to the hover card (the kit Sparkline is fixed at 96px). */
function MiniLine({ data }: { data: number[] }) {
  const w = 232
  const h = 40
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * (w - 6) + 3, h - 4 - (v / max) * (h - 8)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
  const last = pts.at(-1)!
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-10 w-full" aria-hidden>
      <path d={`${d} L${last[0]},${h} L3,${h} Z`} fill="var(--series-1)" opacity={0.1} />
      <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill="var(--series-1)" className="stroke-popover" strokeWidth={2} />
    </svg>
  )
}
