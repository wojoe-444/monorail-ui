# Working in this app

This app was started from the MonoRail UI template. Its layout, theme and components are already decided. Build features with them; don't redesign them.

## Commands

```sh
npm install
npm run dev        # Vite dev server
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build into dist/
npm run ui:add -- tabs table   # add shadcn/ui components (see "Components first")
```

Run `npm run typecheck` and `npm run build` before you call a change done. Code style is in `.prettierrc.json`: single quotes, no semicolons.

## Stack

React 19, TypeScript (strict), Vite, Tailwind CSS v4, Radix primitives (`radix-ui`), lucide-react icons. Components follow shadcn/ui conventions. Import from `@/…` (the alias for `src/`), never with long relative paths.

## Where things live

| Path | What it is |
| --- | --- |
| `src/app/config.ts` | App name, tagline, storage prefix, default theme. Edit first in a new app. |
| `src/app/routes.tsx` | Every page and the drawer's sections. **The one place to add a page.** |
| `src/pages/` | One file per page. |
| `src/components/layout/` | `AppShell`, `SideNav`, `TopBar`, `PageHeader`, `PageTabs`, `PageSteps`, `BrandMark`, nav types. |
| `src/components/ui/` | The UI kit (Button, Card, Dialog, …). |
| `src/components/charts/` | `StatTile`, `Sparkline`, `Legend`, `ChartTooltipContent`, series colors. |
| `src/components/theme/ThemePicker.tsx` | Appearance card used on the Settings page. |
| `src/lib/theme.ts` | Mode + palette store: `useThemeMode`, `usePalette`, `setThemeMode`, `setPalette`. |
| `src/lib/palettes.ts` | The color schemes. Each expands into every color token. |
| `src/lib/prefs.ts` | `prefs` / `readJson` / `writeJson`: localStorage that survives storage being unavailable. |
| `src/hooks/usePageTab.ts` | The active tab / step of a page, kept in the URL (`?tab=`). |
| `src/lib/router.ts` | Hash router: `useRoute`, `navigate`, `href`, `useSearchParams`. |
| `src/styles/theme.css` | Token defaults, the Tailwind `@theme` mapping, base styles. |

Feature code that isn't a page goes in `src/features/<feature>/` (components, hooks, API calls for that feature). Shared hooks go in `src/hooks/`.

## Adding a page

1. Create `src/pages/ThingsPage.tsx` exporting `function ThingsPage()`.
2. Add it to `NAV` in `src/app/routes.tsx`: `{ path: '/things', label: 'Things', icon: Boxes, page: ThingsPage }`. Pick an icon from lucide-react.
   - Put it in an existing section or add a `{ heading: 'Section', items: [...] }`.
   - Subpages: add `children: [...]` to an item (one level deep). The breadcrumb shows Section > Parent > Page.
   - Canvas, editor or map pages: add `layout: 'full'` (no padding or max width, and the page handles its own scrolling).
   - Detail pages that shouldn't be in the drawer: add them as a `hidden: true` child of the list page, so the breadcrumb reads Section > Things > Thing and the drawer keeps Things highlighted. Pass the id as a query: `navigate('/things/detail?id=42')`, then `useSearchParams().get('id')` in the page.
   - Sections inside one page: see "Pages with tabs or steps" below. Don't make each tab its own drawer item.
   - Links: use `navigate('/path')` in click handlers, and `<a href={href('/path')}>` for real links (rows, cards, text links) so open-in-new-tab works. Both come from `@/lib/router`.
3. Start the page the standard way:

```tsx
export function ThingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Things" description="One line on what this page is for." actions={<Button>New thing</Button>} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{/* cards */}</div>
    </div>
  )
}
```

`src/pages/HomePage.tsx` and `src/pages/ComponentsPage.tsx` show every component in use. Copy patterns from them.

### Pages with tabs or steps

When one page has several sections (a detail page with Overview / Activity / Settings), keep one drawer item and put left-to-right sub-navigation in the page body, right under `PageHeader`:

- **`PageTabs` is the default.** Chips with an optional icon and count. The bar sticks under the top bar while the page scrolls. Pass `sticky={false}` on `layout: 'full'` pages or inside a card.
- **`PageSteps`** is for sub-pages in a set order (setup flows, multi-page forms). Pair it with `PageStepsFooter` for Back / Next. Later steps aren't clickable unless you pass `allowSkip`.
- Both keep the active section in the URL (`?tab=<id>`), so sections are linkable and back/forward works. Read it with `usePageTab(tabs)`, which returns `[active, setActive, hrefFor]`. The first tab is the default and has no query.
- Use `Segmented` instead for a compact toggle that changes a view in place (chart range, list or grid). Use `PageTabs` when the sections are different content.

```tsx
const TABS: PageTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: Activity, count: 12 },
]

export function ThingPage() {
  const [tab] = usePageTab(TABS)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Thing" />
      <PageTabs tabs={TABS} aria-label="Thing sections" />
      {tab === 'overview' ? <Overview /> : <ActivityList />}
    </div>
  )
}
```

Full examples: `src/pages/TabbedPageExample.tsx` and `src/pages/StepsPageExample.tsx`.

## Design rules

**Colors: tokens only.** Every color comes from the theme tokens through Tailwind classes. Never use hex, `rgb()`, or Tailwind's own palette (`bg-blue-500`, `text-gray-600`). Those don't follow the palette or dark mode.

| Use | Classes |
| --- | --- |
| Page / text | `bg-background`, `text-foreground`, `text-muted-foreground` |
| Surfaces | `bg-card` (+ `text-card-foreground`), `bg-popover`, `bg-muted`, `bg-secondary` |
| Brand | `bg-primary text-primary-foreground` (solid), `bg-primary-soft text-primary-soft-foreground` (tinted) |
| Second brand color | `bg-highlight`, `bg-highlight-soft text-highlight-soft-foreground` |
| Status | `success`, `warning`, `info`, `destructive`, each solid (`bg-success`) or soft (`bg-success-soft text-success-soft-foreground`) |
| Lines | `border` (uses `--border`), `border-input`, `ring-ring` |
| Hover on neutral items | `hover:bg-accent hover:text-accent-foreground` |
| Drawer only | `sidebar-*` tokens |
| Charts | `var(--series-1)` … `var(--series-6)`, `var(--series-other)`, via `SERIES_COLORS` / `colorForSeries` |

Opacity modifiers are fine (`bg-primary/10`). Status hues mean the same thing in every palette: green = good, amber = needs attention, red = error or destructive, blue = information. Don't use them for decoration.

**Components first.** Use the kit before writing markup: `Button` (variants `default`, `soft`, `outline`, `secondary`, `ghost`, `link`, `destructive`; sizes `sm`, `default`, `lg`, `icon`), `Card` + `CardHeader`/`CardTitle`/`CardDescription`/`CardAction`/`CardContent`/`CardFooter`, `Badge` for status, `Dialog` for modal tasks, `DropdownMenu` for row actions, `Tooltip` for icon-only buttons, `Segmented` for a compact 2–4 option toggle (view mode, filter, time range), `NativeSelect` for picking from a list, `Switch` for on/off settings, `StatTile` for KPIs.

Need a component the kit doesn't have (tabs that switch panels inside a card, table, popover, sheet, command, calendar)? Add it with **`npm run ui:add -- <name>`**, not `npx shadcn add` directly. The wrapper runs the shadcn CLI, so the file lands in `src/components/ui/` styled with the theme tokens. Then it points the new file's `cn` import at `@/lib/utils`, because shadcn 4 otherwise adds a separate `cn` npm package. Afterwards, check the new component's colors are token classes. Restyle surfaces to match the kit if needed (e.g. active states use `bg-card shadow-elevation-1` like `Segmented`).

**Layout and spacing.**
- Blocks on a page: `flex flex-col gap-8`. Cards in a grid: `gap-4`. Inside a card: `gap-4` or `gap-6`.
- Responsive grids always set a base column: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`. Without `grid-cols-1`, the column grows to fit its content and the page scrolls sideways on phones.
- Give flex children that hold long text `min-w-0` and the text `truncate`.
- One primary (`default`) button per view. Everything else is `outline`, `ghost`, `soft` or `secondary`.
- Page titles come from `PageHeader`. Don't add another `h1`.
- Radius comes from the theme (`rounded-md`, `rounded-lg`, `rounded-xl`). Don't use arbitrary values.

**Type.** Inter is the UI font, JetBrains Mono (`font-mono`) is for code and ids. Use `tabular-nums` for numbers that line up. Sizes: `text-2xl` page titles (in PageHeader), `text-sm` body, `text-xs` meta and labels.

**Accessibility.** Every input has a `Label`. Icon-only buttons get an `aria-label` (and usually a `Tooltip`). Use `button` for actions and links for navigation. Don't remove focus rings.

## Theme

- The person picks mode and palette in Settings > Appearance, or toggles light/dark in the top bar. The choice is saved under `APP.storagePrefix`.
- To change the app's default look, set `defaultMode` / `defaultPalette` in `src/app/config.ts` (palette ids are in `src/lib/palettes.ts`). That's all it takes: the theme is applied before React's first render. The `:root` values in `theme.css` only show for the instant before the script loads.
- To add a brand palette, add an entry to `PALETTES` in `src/lib/palettes.ts` (primary hue/chroma, neutral hue/chroma, drawer style). Don't edit token values in `theme.css` to restyle. `theme.ts` overwrites them at runtime.
- Read the current mode with `useThemeMode()` when code needs it (e.g. a chart library's theme option).

## Don't

- Don't add another CSS framework, component library or icon set.
- Don't put new global CSS in `theme.css` for one feature. Use Tailwind classes in the component.
- Don't call `localStorage` directly. Use `prefs`, which handles blocked storage and prefixes keys per app.
- Don't change the drawer, top bar or theme system to build a feature. If the app truly needs a different shell, change `AppShell` once, deliberately.

## Starting a new app from this template

1. Set `name`, `tagline` and `storagePrefix` in `src/app/config.ts`, `"name"` in `package.json` (then `npm install` to sync the lockfile), and `<title>` in `index.html`.
2. Replace the sample content: `HomePage`, and the Projects group and Reference section in `src/app/routes.tsx`. Taking `ComponentsPage` out of the routes is fine. Keep the file as a usage reference until the app no longer needs it, then delete it. Delete `PlaceholderPage` once no route uses it.
3. Replace `public/favicon.svg` (it shows an "M"). Optionally swap the `BrandTile` initial for a logo.
4. Rewrite `README.md` for the app.
