import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { navigate } from '@/lib/router'

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Page not found"
        description="There is no page at this address."
        actions={<Button onClick={() => navigate('/')}>Go home</Button>}
      />
    </div>
  )
}
