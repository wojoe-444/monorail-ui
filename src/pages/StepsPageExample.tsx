import { PageHeader } from '@/components/layout/PageHeader'
import { PageSteps, PageStepsFooter } from '@/components/layout/PageSteps'
import { PANELS } from '@/features/examples/SamplePanels'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { navigate } from '@/lib/router'

/*
 * Example: sub-pages in a set order with PageSteps. Use it for setup flows
 * and multi-page forms; use PageTabs when the sections can be read in any order.
 */

const STEPS: PageTab[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'team', label: 'Team' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'review', label: 'Review' },
]

const STEP_PANELS: Record<string, keyof typeof PANELS> = {
  basics: 'settings',
  team: 'members',
  attachments: 'files',
  review: 'overview',
}

export function StepsPageExample() {
  const [step] = usePageTab(STEPS)
  const Panel = PANELS[STEP_PANELS[step]]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="New project" description="Set up a project in four steps." />
      <PageSteps steps={STEPS} aria-label="Setup steps" />
      <Panel />
      <PageStepsFooter steps={STEPS} finishLabel="Create project" onFinish={() => navigate('/examples/tabs')} />
    </div>
  )
}
