import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

import { TaskBar } from '@/components/layout/TaskBar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { usePageTab, type PageTab } from '@/hooks/usePageTab'
import { navigate } from '@/lib/router'

/*
 * Example: header style H. TaskBar turns the top bar into the task's bar:
 * Close, the steps, the save state and the commit button. The body is a
 * narrow column.
 */

const STEPS: PageTab[] = [
  { id: 'details', label: 'Details' },
  { id: 'members', label: 'Members' },
  { id: 'review', label: 'Review' },
]

const PEOPLE = [
  { initials: 'MC', name: 'Maya Chen' },
  { initials: 'JR', name: 'Jon Reyes' },
  { initials: 'PN', name: 'Priya Nair' },
]

export function TaskBarExample() {
  const [step, setTab] = usePageTab(STEPS)
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [roles, setRoles] = useState<Record<string, string>>({ MC: 'Owner', JR: 'Editor', PN: 'Editor' })

  const index = STEPS.findIndex((s) => s.id === step)
  const last = index === STEPS.length - 1
  const dirty = name !== '' || summary !== ''
  const close = () => navigate('/headers')

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pt-2">
      <TaskBar
        title="New project"
        onClose={close}
        steps={STEPS}
        status={
          dirty ? (
            <>
              <span className="size-2 rounded-full bg-warning" />
              Unsaved changes
            </>
          ) : undefined
        }
        actions={
          <>
            <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setTab(STEPS[index - 1].id)}>
              <ArrowLeft />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Button size="sm" disabled={index === 0 && !name.trim()} onClick={() => (last ? close() : setTab(STEPS[index + 1].id))}>
              {last ? 'Create project' : 'Continue'}
            </Button>
          </>
        }
      />

      {step === 'details' && (
        <>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Name the project</h2>
            <p className="mt-1 text-sm text-muted-foreground">You can change these later in the project's settings.</p>
          </div>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Atlas redesign" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-summary">Summary</Label>
                <Textarea
                  id="p-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="One or two lines on what it's for."
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {step === 'members' && (
        <>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Who's working on it?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Owners can change everything. Editors can change tasks.</p>
          </div>
          <Card>
            <CardContent>
              <ul className="divide-y">
                {PEOPLE.map((p) => (
                  <li key={p.initials} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar>
                      <AvatarFallback className="text-xs">{p.initials}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                    <NativeSelect
                      aria-label={`Role for ${p.name}`}
                      value={roles[p.initials]}
                      onChange={(e) => setRoles({ ...roles, [p.initials]: e.target.value })}
                      className="w-32"
                    >
                      <option>Owner</option>
                      <option>Editor</option>
                      <option>Viewer</option>
                    </NativeSelect>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {step === 'review' && (
        <>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Check and create</h2>
            <p className="mt-1 text-sm text-muted-foreground">Nothing is saved until you press Create project.</p>
          </div>
          <Card>
            <CardContent>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{name || '—'}</dd>
                <dt className="text-muted-foreground">Summary</dt>
                <dd>{summary || '—'}</dd>
                <dt className="text-muted-foreground">Members</dt>
                <dd>{PEOPLE.map((p) => `${p.name} (${roles[p.initials]})`).join(', ')}</dd>
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
