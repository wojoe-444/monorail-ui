import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { GLOSSARY, type GlossaryTerm } from '@/features/wiki/data'
import { cn } from '@/lib/utils'

/*
 * Layout G · Glossary. A dictionary: compact term index on the left, short
 * definitions on the right, cross-references that jump to the other term.
 * Best for shared vocabulary that other pages link into.
 */

const TAGS: (GlossaryTerm['tag'] | 'All')[] = ['All', 'Operations', 'Data', 'Infrastructure', 'Fares']

const slug = (t: string) => `term-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

export function WikiGlossaryPage() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<(typeof TAGS)[number]>('All')
  const [flash, setFlash] = useState<string | null>(null)

  const terms = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GLOSSARY.filter(
      (g) => (tag === 'All' || g.tag === tag) && (!q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q)),
    ).sort((a, b) => a.term.localeCompare(b.term))
  }, [query, tag])

  const jump = (term: string) => {
    if (!terms.some((t) => t.term === term)) {
      setQuery('')
      setTag('All')
    }
    requestAnimationFrame(() => {
      document.getElementById(slug(term))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlash(term)
      window.setTimeout(() => setFlash(null), 1200)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Layout G · Glossary"
        title="Glossary"
        description="The words we use for trains, track, fares and data, and what we mean by them."
        actions={<Button variant="outline">Suggest a term</Button>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search terms"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms and definitions"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by topic">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tag === t}
              onClick={() => setTag(t)}
              className={cn(
                'h-8 rounded-md px-3 text-sm font-medium transition-colors',
                tag === t
                  ? 'bg-primary-soft text-primary-soft-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Terms" className="hidden md:block">
          <ul className="sticky top-18 flex flex-col">
            {terms.map((t) => (
              <li key={t.term}>
                <button
                  type="button"
                  onClick={() => jump(t.term)}
                  className="w-full truncate rounded-md px-2 py-1 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {t.term}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <Card className="gap-0 py-0">
          <CardContent className="px-0">
            {terms.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted-foreground">No terms match.</p>}
            <dl className="divide-y">
              {terms.map((t) => (
                <div
                  key={t.term}
                  id={slug(t.term)}
                  className={cn('flex scroll-mt-24 flex-col gap-2 px-6 py-5 transition-colors', flash === t.term && 'bg-primary-soft/60')}
                >
                  <dt className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold">{t.term}</span>
                    <Badge variant="secondary">{t.tag}</Badge>
                  </dt>
                  <dd className="max-w-2xl text-sm leading-relaxed">{t.definition}</dd>
                  {t.seeAlso && (
                    <dd className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      See also:
                      {t.seeAlso.map((s) => (
                        <button key={s} type="button" onClick={() => jump(s)} className="font-medium text-primary hover:underline">
                          {s}
                        </button>
                      ))}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
