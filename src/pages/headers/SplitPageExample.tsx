import { Bell, BookOpen, CreditCard, Settings2, Shield } from 'lucide-react'

import { SplitPage } from '@/components/layout/SplitPage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'

/*
 * Example: header style F. SplitPage turns the header into a sticky left
 * column with a section list; the content column holds the forms.
 */

const SECTIONS: PageTab[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

const DESCRIPTIONS: Record<string, string> = {
  general: 'Your name, time zone and how dates look. These apply everywhere you sign in.',
  notifications: 'Choose what reaches you and where. Mentions and assignments always come through. Everything else is up to you.',
  security: 'Two-step sign-in and the devices that are signed in to your account right now.',
  billing: 'Your plan, the card on file and past invoices.',
}

function SwitchRow({ id, label, hint, defaultChecked }: { id: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  )
}

function General() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" defaultValue="Sam Okafor" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tz">Time zone</Label>
          <NativeSelect id="tz" defaultValue="et">
            <option value="pt">Pacific time</option>
            <option value="et">Eastern time</option>
            <option value="utc">UTC</option>
          </NativeSelect>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button>Save</Button>
      </CardFooter>
    </Card>
  )
}

function Notifications() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>Sent to sam@example.com</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SwitchRow id="n-mentions" label="Mentions and replies" defaultChecked />
          <SwitchRow id="n-assigned" label="Assigned to me" defaultChecked />
          <SwitchRow id="n-weekly" label="Weekly summary" hint="Mondays at 9:00 AM" defaultChecked />
          <SwitchRow id="n-news" label="Product news" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Push</CardTitle>
          <CardDescription>On this device</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SwitchRow id="p-dm" label="Direct messages" defaultChecked />
          <SwitchRow id="p-fail" label="Failed jobs" defaultChecked />
        </CardContent>
      </Card>
    </>
  )
}

function Security() {
  return (
    <>
      <Card>
        <CardContent className="divide-y">
          <SwitchRow id="s-2fa" label="Two-step sign-in" hint="Ask for a code from your authenticator app." defaultChecked />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Signed-in devices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {[
              ['Windows · Edge', 'This device', true],
              ['iPhone · Safari', 'Active 2h ago', false],
            ].map(([name, note, current]) => (
              <li key={String(name)} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{note}</div>
                </div>
                {current ? (
                  <Badge variant="success">Current</Badge>
                ) : (
                  <Button variant="outline" size="sm">
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}

function Billing() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team plan</CardTitle>
        <CardDescription>12 seats · renews on Jan 1</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Visa ending in 4242</CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="outline">Invoices</Button>
        <Button>Change plan</Button>
      </CardFooter>
    </Card>
  )
}

const CONTENT: Record<string, () => React.JSX.Element> = {
  general: General,
  notifications: Notifications,
  security: Security,
  billing: Billing,
}

export function SplitPageExample() {
  const [section] = usePageTab(SECTIONS)
  const Content = CONTENT[section]
  const label = SECTIONS.find((s) => s.id === section)?.label ?? ''

  return (
    <SplitPage
      title={label}
      description={DESCRIPTIONS[section]}
      nav={SECTIONS}
      navLabel="Settings sections"
      aside={
        <a href="#" className="inline-flex items-center gap-1.5 text-primary hover:underline">
          <BookOpen className="size-4" />
          Read the settings guide
        </a>
      }
    >
      <Content />
    </SplitPage>
  )
}
