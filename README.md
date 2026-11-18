# Dashboard Lab

Twenty-five dashboards built on the MonoRail UI template. Each takes one idea about dashboard design as far as it will go, runs on live public data, and says what it gives up. The Atlas (`/`) places them on a map: how much is on screen, and whether the data speaks in pictures or in words.

| Group | Experiment | Idea | Data |
| --- | --- | --- | --- |
| Favorite | Forecast, Written | Numbers belong inside sentences | Open-Meteo |
| Favorite | Attention | The label is the mark | Wikimedia pageviews |
| Favorite | Terminal | Density for experts, keyboard first | USGS, SWPC, NESO, Hacker News |
| Narrative | One Day on the Grid | Scrolling story over a fixed chart | NESO generation mix |
| Narrative | Country, Written | An encyclopedia entry written by the numbers | World Bank (snapshot) |
| Narrative | Your Day | Your city's day, hour by hour, in the second person | Open-Meteo |
| Narrative | Sentence Builder | The interface is a sentence with editable words | Every feed |
| Narrative | Briefing, Spoken | A briefing read aloud, words highlighted as spoken | Every feed |
| Narrative | Two Cities | Two cities written side by side, differences in the middle | Open-Meteo |
| Annotated | Every Country, Labeled | Every point gets a label; zoom reveals more | World Bank (snapshot) |
| Annotated | Margin Notes | The chart finds its notable moments and writes them up | NOAA CO₂, NESO, Wikimedia |
| Annotated | Story Arcs | A rank chart annotated at each story's turning points | Wikimedia pageviews |
| New | Ask | One input box; answers in sentences | Every feed |
| New | Specimen | A variable font is the chart | World Bank (snapshot) |
| New | Wire | Every Wikipedia edit, live | Wikimedia EventStreams |
| New | The Chart | Wikipedia as a weekly hit chart | Wikimedia pageviews |
| New | Inbox | Alerts as messages to triage | Every feed |
| New | Diff | Only what changed since you last looked | Every feed |
| New | Almanac | A printed reference page for today | Open-Meteo, NOAA tides |
| New | Departures | Rocket launches on a departures board | Launch Library 2 |
| New | Pages | A paged information service | Every feed |
| New | Box Score | The grid's day as a sports box score | NESO generation mix |
| New | Ledger | A spreadsheet that reads like a dashboard | World Bank (snapshot) |
| Kept | Grid Clock | Lead with the decision | NESO GB carbon intensity |
| Kept | Lifelines | Small multiples on one scale | World Bank (snapshot) |

```sh
npm install
npm run dev                          # then open the printed localhost URL
node scripts/fetch-snapshots.mjs     # refresh the World Bank snapshots (World Bank blocks browser fetches)
bash scripts/shot.sh /lab/wire out.png dark 1440 900     # headless screenshot, any viewport
```

The browser fetches every other feed directly; they all allow cross-origin requests. Feed URLs and parsers are in `src/features/lab/sources.ts`, shared feed hooks (one cache per feed) in `src/features/lab/feeds.ts`, the fetch-and-cache hook in `src/features/lab/useLiveData.ts`, and each experiment is a page in `src/pages/lab/` with its components in `src/features/lab/<name>/`.

---

# MonoRail UI template

A ready-made React app frame for starting new apps without redoing the design each time. It comes from [MonoRail](https://github.com/wojoe-444/MonoRail/tree/1821c9ed8239757d0bfcff6741256773c4b7b2a8/apps/command-hub/src) and includes:

- **App layout:** a collapsible side drawer with sections and subpage groups, a top bar with breadcrumbs, and a light/dark toggle.
- **Theme:** 31 color schemes in light and dark, picked in Settings and remembered, all built on one set of color tokens.
- **Components:** buttons, cards, form controls, dialogs, menus, tooltips, KPI tiles and sparklines, as editable source in `src/components/`.
- **Page headers:** nine header styles for different kinds of page (dashboard, list, detail, settings, reading, create flow and more), with live examples under Reference > Page headers.
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
