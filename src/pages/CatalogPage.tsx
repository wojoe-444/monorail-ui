import { useMemo, useState } from 'react'
import { ArrowUpRight, ChevronRight, LayoutDashboard } from 'lucide-react'

import { NAV } from '@/app/routes'
import { PageBanner } from '@/components/layout/PageBanner'
import type { NavItem, NavSection } from '@/components/layout/nav'
import { Card } from '@/components/ui/card'
import { SearchField } from '@/components/ui/search-field'
import { PALETTES } from '@/lib/palettes'
import { href } from '@/lib/router'

/*
 * The app's front door: the whole catalog (building blocks, page types,
 * dashboards), generated from NAV in src/app/routes.tsx so it never drifts
 * from the drawer. A search filters every page by name and description.
 */

const UI_COMPONENTS = Object.keys(import.meta.glob('/src/components/ui/*.tsx')).length
const HEADER_STYLES = Object.keys(import.meta.glob('/src/components/layout/{PageHeader,PageCommandBar,SummaryHeader,PageBanner,EntityHeader,ListHeader,SplitPage,CollapsingHeader,TaskBar}.tsx')).length

interface Entry {
  item: NavItem
  section: string
  parent?: NavItem
}

function sections(): NavSection[] {
  return NAV.filter((s) => s.heading && !s.pinned)
}

function allEntries(): Entry[] {
  const out: Entry[] = []
  for (const s of NAV) {
    if (!s.heading && !s.pinned) continue
    for (const item of s.items) {
      out.push({ item, section: s.heading ?? 'App' })
      for (const c of item.children ?? []) if (!c.hidden) out.push({ item: c, section: s.heading ?? 'App', parent: item })
    }
  }
  return out
}

export function CatalogPage() {
  const [q, setQ] = useState('')
  const entries = useMemo(allEntries, [])
  const needle = q.trim().toLowerCase()
  const results = needle
    ? entries.filter((e) => `${e.item.label} ${e.item.description ?? ''} ${e.parent?.label ?? ''} ${e.section}`.toLowerCase().includes(needle))
    : []
  const dashboards = NAV.find((s) => s.heading === 'Dashboards')?.items.reduce((n, i) => n + (i.children?.length ?? 0), 0) ?? 0

  const stats = [
    { label: 'pages', value: entries.length },
    { label: 'UI components', value: UI_COMPONENTS },
    { label: 'header styles', value: HEADER_STYLES },
    { label: 'dashboards', value: dashboards },
    { label: 'color schemes', value: PALETTES.length },
  ]

  return (
    <div className="flex flex-col gap-10">
      <PageBanner
        kicker={
          <>
            <LayoutDashboard />
            Template and catalog
          </>
        }
        title="Everything the kit can do"
        description="A working app and the template new apps start from. Every component, page type and dashboard below is live: open one, then copy its pattern."
        aside={
          <Card className="gap-0 py-2">
            <ul className="divide-y">
              {stats.map((s) => (
                <li key={s.label} className="flex items-baseline justify-between gap-3 px-4 py-2">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="text-lg font-semibold tabular-nums">{s.value}</span>
                </li>
              ))}
            </ul>
          </Card>
        }
      >
        <SearchField size="lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a page, component or dashboard" aria-label="Search the catalog" />
        <div className="flex flex-wrap gap-2 text-sm">
          {sections().map((s) => (
            <a
              key={s.heading}
              href={`#catalog-${slug(s.heading!)}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(`catalog-${slug(s.heading!)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="rounded-md border bg-card/70 px-3 py-1.5 font-medium outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.heading}
            </a>
          ))}
        </div>
      </PageBanner>

      {needle ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? 'page matches' : 'pages match'} “{q.trim()}”
          </h2>
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {results.map((e) => (
                <li key={e.item.path}>
                  <a href={href(e.item.path)} className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:bg-accent">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {e.section}
                        {e.parent && (
                          <>
                            <ChevronRight className="size-3" />
                            {e.parent.label}
                          </>
                        )}
                      </div>
                      <div className="truncate text-sm font-medium">{e.item.label}</div>
                      {e.item.description && <div className="truncate text-xs text-muted-foreground">{e.item.description}</div>}
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : (
        sections().map((s) => (
          <section key={s.heading} id={`catalog-${slug(s.heading!)}`} className="flex scroll-mt-20 flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {s.items.map((item) => (
                <CatalogCard key={item.path} item={item} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function CatalogCard({ item }: { item: NavItem }) {
  const Icon = item.icon
  const children = item.children?.filter((c) => !c.hidden) ?? []
  return (
    <Card className="h-full gap-3 px-5 py-5">
      <a href={href(item.path)} className="group flex items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <Icon className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold">
            <span className="truncate">{item.label}</span>
            {children.length > 0 && <span className="text-xs font-normal text-muted-foreground tabular-nums">{children.length}</span>}
          </div>
          {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
      {children.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 border-t pt-3">
          {children.map((c) => (
            <li key={c.path}>
              <a
                href={href(c.path)}
                title={c.description}
                className="block rounded-md bg-muted px-2 py-1 text-xs outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
