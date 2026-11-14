import { Construction } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

/** Stand-in for a page that has a nav entry but is not built yet. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} description="This section is not built yet." />
      <Card className="border border-dashed ring-0">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <Construction className="size-6" />
          </div>
          <div className="font-medium">{title} is coming soon</div>
          <p className="max-w-sm text-sm text-muted-foreground">The layout and navigation are in place. This page is next.</p>
        </CardContent>
      </Card>
    </div>
  )
}
