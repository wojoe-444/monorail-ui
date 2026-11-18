import { Plus, RefreshCw } from 'lucide-react'

import { PageCommandBar } from '@/components/layout/PageCommandBar'
import { PageTabs } from '@/components/layout/PageTabs'
import { Button } from '@/components/ui/button'
import { SearchField } from '@/components/ui/search-field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PANELS } from '@/features/examples/SamplePanels'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'

/*
 * Example: header style A. PageCommandBar moves the title, tabs and actions
 * into the top bar, so the page body starts right under it.
 */

const TABS: PageTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity', count: 12 },
  { id: 'members', label: 'Members', count: 5 },
  { id: 'files', label: 'Files', count: 8 },
]

export function CommandBarExample() {
  const [tab] = usePageTab(TABS)
  const Panel = PANELS[tab]

  return (
    <div className="flex flex-col gap-6">
      <PageCommandBar
        title="Atlas board"
        description="Everything on the Atlas redesign. Title, tabs and actions live in the top bar."
        actions={
          <>
            <SearchField size="sm" shortcut="Ctrl K" placeholder="Find…" aria-label="Find on this board" className="hidden w-56 xl:flex" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Refresh">
                  <RefreshCw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button size="sm">
              <Plus />
              New
            </Button>
          </>
        }
      >
        <PageTabs tabs={TABS} size="sm" sticky={false} aria-label="Board sections" />
      </PageCommandBar>
      <Panel />
    </div>
  )
}
