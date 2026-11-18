import { PageHeader } from '@/components/layout/PageHeader'
import { EXPERIMENTS, GROUP_LABELS, type ExperimentGroup } from '@/features/lab/catalog'
import { ExperimentCard, GROUP_BLURB } from '@/pages/lab/AtlasPage'

/** The landing page for one dashboard group: its cards, each with a live reading. */
export function dashboardGroupPage(group: ExperimentGroup) {
  return function DashboardGroupPage() {
    const items = EXPERIMENTS.filter((e) => e.group === group)
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={GROUP_LABELS[group]} description={GROUP_BLURB[group]} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((e) => (
            <ExperimentCard key={e.id} e={e} n={EXPERIMENTS.indexOf(e) + 1} />
          ))}
        </div>
      </div>
    )
  }
}
