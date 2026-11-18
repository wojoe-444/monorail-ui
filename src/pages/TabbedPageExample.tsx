import { Activity, FileText, LayoutDashboard, Plus, Settings2, Share2, Users } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { PageTabs } from '@/components/layout/PageTabs'
import { Button } from '@/components/ui/button'
import { PANELS } from '@/features/examples/SamplePanels'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'

/*
 * Example: a page split into sections with PageTabs, the standard in-page
 * sub-navigation. The drawer item stays highlighted; the tab lives in the URL
 * (?tab=…). Copy this shape for detail pages with several sections.
 */

const TABS: PageTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: Activity, count: 12 },
  { id: 'members', label: 'Members', icon: Users, count: 5 },
  { id: 'files', label: 'Files', icon: FileText, count: 8 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

export function TabbedPageExample() {
  const [tab] = usePageTab(TABS)
  const Panel = PANELS[tab]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Project"
        title="Atlas redesign"
        description="Marketing site rebuild for the spring launch."
        actions={
          <>
            <Button variant="outline">
              <Share2 />
              Share
            </Button>
            <Button>
              <Plus />
              New task
            </Button>
          </>
        }
      />
      <PageTabs tabs={TABS} aria-label="Project sections" />
      <Panel />
    </div>
  )
}
