import { useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  applyTheme, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  DEFAULT_PALETTE, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, Input, Label, NativeSelect, PageHeader, PALETTES, Progress, Segmented,
  Slider, Sparkline, StatTile, Switch, Textarea, Tooltip, TooltipContent, TooltipProvider,
  TooltipTrigger, type ThemeMode,
} from '../src/index.js'
import '../src/styles.css'
import './demo.css'

function Demo() {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [palette, setPalette] = useState(DEFAULT_PALETTE)
  const [volume, setVolume] = useState(64)

  useLayoutEffect(() => {
    applyTheme(document.documentElement, { mode, palette })
  }, [mode, palette])

  return (
    <TooltipProvider>
      <main className="demo">
        <PageHeader
          title="MonoRail UI"
          description="React components and themes from MonoRail."
          actions={
            <Dialog>
              <DialogTrigger asChild><Button>Preview dialog</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog preview</DialogTitle>
                  <DialogDescription>Press Escape or use the close button to return.</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          }
        />
        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
          <CardContent className="demo-row">
            <Segmented
              aria-label="Color mode"
              value={mode}
              onChange={setMode}
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
            />
            <div className="demo-field">
              <Label htmlFor="palette">Palette</Label>
              <NativeSelect id="palette" value={palette} onChange={(event) => setPalette(event.target.value)}>
                {PALETTES.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </NativeSelect>
            </div>
          </CardContent>
        </Card>
        <div className="demo-grid">
          <Card>
            <CardHeader>
              <CardTitle>Form controls</CardTitle>
              <CardDescription>Inputs, selection, and a live progress indicator.</CardDescription>
            </CardHeader>
            <CardContent className="demo-stack">
              <div className="demo-field"><Label htmlFor="name">Name</Label><Input id="name" placeholder="Workspace name" /></div>
              <div className="demo-field"><Label htmlFor="notes">Notes</Label><Textarea id="notes" placeholder="Add a note" /></div>
              <div className="demo-row"><Switch id="notifications" defaultChecked /><Label htmlFor="notifications">Notifications</Label></div>
              <Slider thumbLabels={['Progress']} value={[volume]} onValueChange={([value]) => setVolume(value)} />
              <Progress aria-label="Completion" value={volume * 2} max={200} />
            </CardContent>
          </Card>
          <div className="demo-stack">
            <StatTile label="Completed runs" value="128" delta={0.12} trend={<Sparkline data={[2, 4, 3, 7, 6, 9]} />} />
            <Card>
              <CardHeader><CardTitle>Feedback</CardTitle></CardHeader>
              <CardContent className="demo-row">
                <Badge variant="success">Connected</Badge>
                <Tooltip>
                  <TooltipTrigger asChild><Button variant="outline">Connection details</Button></TooltipTrigger>
                  <TooltipContent>Last checked just now</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </TooltipProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Demo />)
