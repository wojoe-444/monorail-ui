/**
 * App identity. Change these first when you start a new app from the template.
 * The name and tagline show in the drawer header; the storage prefix keeps
 * this app's saved preferences apart from other apps on the same origin
 * (localhost:5173 is shared by every app you run in development).
 */
export const APP = {
  name: 'MonoRail UI',
  tagline: 'Components, pages and dashboards',
  storagePrefix: 'monorail-ui',
  /** Light or dark until the person picks one in Settings > Appearance. */
  defaultMode: 'light' as 'light' | 'dark',
  /** A palette id from src/lib/palettes.ts. */
  defaultPalette: 'sand-ink',
}
