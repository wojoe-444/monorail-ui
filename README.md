# MonoRail UI

A React 19 component library extracted from [MonoRail](https://github.com/wojoe-444/MonoRail/tree/1821c9ed8239757d0bfcff6741256773c4b7b2a8/apps/command-hub/src). It works in browser and Electron renderers.

## Try it

From this checkout:

```sh
npm ci
npm run dev
```

The demo shows the original light and dark themes, palette changes, form controls, feedback, and a dialog.

## Use it in another app

Run `npm pack` from this checkout to build a tarball. In a React 19 app, run `npm install /path/to/monorail-ui-0.1.0.tgz`. Import the stylesheet once in the browser entry point.

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from 'monorail-ui'
import 'monorail-ui/styles.css'

export default function Workspace() {
  return (
    <>
      <PageHeader title="Workspace" />
      <Card>
        <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
        <CardContent><Button type="button">Run task</Button></CardContent>
      </Card>
    </>
  )
}
```

The package ships ESM, TypeScript declarations, and compiled CSS. It uses the app's React and React DOM. The optional stylesheet includes MonoRail's fonts, Tailwind's reset, base document styles, and the utilities used by the library. Apps that use additional Tailwind classes in their own markup still compile those classes themselves.

## Components

- Forms and actions: `Button`, `Input`, `Textarea`, `Label`, `NativeSelect`, `Switch`, `Slider`, and `Segmented`.
- Surfaces and status: `Card`, `Badge`, `Avatar`, `Progress`, `Separator`, and `PageHeader`.
- Overlays: `Dialog`, `DropdownMenu`, `ContextMenu`, `HoverCard`, and `Tooltip`, with their matching triggers and content. Wrap the part of your app that uses tooltips in `TooltipProvider`.
- Data display: `StatTile`, `Sparkline`, `Legend`, `ChartTooltipContent`, and the MonoRail chart color helpers.

## Theme

Sand & Ink in light mode is the CSS default. Add `class="dark"` to the HTML element for the default dark theme, or call `applyTheme` in the browser to select a mode and palette. Apply the theme to the document root so overlays rendered in portals inherit it.

```ts
import { applyTheme, PALETTES } from 'monorail-ui'

applyTheme(document.documentElement, { mode: 'dark', palette: 'indigo-ink' })
```

Use `PALETTES` to populate an appearance picker. The host app owns persistence and decides when to apply the theme.

See [licenses](./licenses) for the notices for shadcn/ui, the bundled Tailwind and animation styles, and the Inter and JetBrains Mono fonts.
