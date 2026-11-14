import { PageHeader } from '@/components/layout/PageHeader'
import { AppearanceCard } from '@/components/theme/ThemePicker'

/** Settings: a stack of cards, one per topic. Add the app's own settings cards above Appearance. */
export function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Preferences for this app, saved in this browser." />
      <AppearanceCard />
    </div>
  )
}
