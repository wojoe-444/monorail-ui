# MonoRail UI template

A ready-made React app frame for starting new apps without redoing the design each time. It comes from [MonoRail](https://github.com/wojoe-444/MonoRail/tree/1821c9ed8239757d0bfcff6741256773c4b7b2a8/apps/command-hub/src) and includes:

- **App layout:** a collapsible side drawer with sections and subpage groups, a top bar with breadcrumbs, and a light/dark toggle.
- **Theme:** 31 color schemes in light and dark, picked in Settings and remembered, all built on one set of color tokens.
- **Components:** buttons, cards, form controls, dialogs, menus, tooltips, a file tree, KPI tiles and sparklines, as editable source in `src/components/`.
- **Agent instructions:** [`AGENTS.md`](./AGENTS.md) (and `CLAUDE.md`) tell coding agents how to add pages and which tokens and components to use.

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, Radix, lucide-react. Components follow shadcn/ui conventions, so `npm run ui:add -- <component>` adds more that match.

## Start a new app

```sh
gh repo create my-app --template wojoe-444/monorail-ui --private --clone
cd my-app
npm install
npm run dev
```

Or copy it without git history: `npx degit wojoe-444/monorail-ui my-app`.

Then follow "Starting a new app from this template" at the end of [`AGENTS.md`](./AGENTS.md): set the app name in `src/app/config.ts`, and replace the sample pages in `src/app/routes.tsx`.

The new app owns its copy. Later changes to this template don't flow into apps already made from it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Typecheck and build to `dist/` (relative asset paths, so it also loads from `file://`) |
| `npm run preview` | Serve the built app |
| `npm run ui:add -- <name>` | Add shadcn/ui components, wired to this app's `cn` helper |

## Licenses

See [licenses](./licenses) for the notices for shadcn/ui, Tailwind CSS, tw-animate-css, and the Inter and JetBrains Mono fonts.
