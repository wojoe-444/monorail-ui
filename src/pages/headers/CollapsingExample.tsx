import { CalendarDays, Clock, Share2 } from 'lucide-react'

import { CollapsingHeader } from '@/components/layout/CollapsingHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

/*
 * Example: header style G. CollapsingHeader opens with a large title; scroll
 * past it and the title and actions move into the top bar.
 */

const SECTIONS = [
  {
    title: 'Sync is faster',
    body: [
      'Changes now reach other devices in under a second on most connections. We moved the sync engine to a single long-lived connection per device instead of polling, which also cut battery use on phones.',
      'If you work offline, edits queue up and merge when you reconnect. Conflicts on the same field show both versions side by side so you can pick one.',
    ],
  },
  {
    title: 'A calmer inbox',
    body: [
      'Notifications are grouped by project and collapse repeated updates into one line. "Mark all read" now works per group, and snoozed items come back at the time you chose, not at midnight.',
      'Mentions and assignments always land at the top. Everything else is sorted by when it last changed.',
    ],
  },
  {
    title: 'Share drafts with a link',
    body: [
      'Any draft can be shared with a view-only link. People with the link see the draft as it is now and can leave comments without an account.',
      'Links can expire after a day, a week or never, and you can turn a link off at any time from the share menu.',
    ],
  },
  {
    title: 'Smaller fixes',
    body: [
      'Dates in exported reports follow your time zone. Long project names no longer push the actions off screen on phones. Keyboard focus returns to the list after closing a dialog.',
      'Search finds people by email as well as name, and the command menu remembers your last five searches.',
    ],
  },
]

export function CollapsingExample() {
  return (
    <div className="flex flex-col gap-10">
      <CollapsingHeader
        eyebrow="Release · November 2026"
        title="Release notes 4.2"
        description="Faster sync, a calmer inbox and a new way to share drafts. Read the highlights, or jump to the smaller fixes at the end."
        meta={[
          {
            label: (
              <span className="inline-flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarFallback className="text-xs">PN</AvatarFallback>
                </Avatar>
                Priya Nair
              </span>
            ),
          },
          { icon: Clock, label: '4 min read' },
          { icon: CalendarDays, label: 'Nov 12, 2026' },
        ]}
        actions={
          <Button variant="outline" size="sm">
            <Share2 />
            Share
          </Button>
        }
      />
      <article className="flex max-w-3xl flex-col gap-10 pb-16">
        {SECTIONS.map((s) => (
          <section key={s.title} className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 24)} className="text-base leading-7 text-pretty text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  )
}
