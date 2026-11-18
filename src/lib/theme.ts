import { useCallback, useSyncExternalStore } from 'react'

import { APP } from '@/app/config'
import { findPalette, tokens } from '@/lib/palettes'
import { prefs } from '@/lib/prefs'

/**
 * Appearance for the whole app: a color scheme (palette, see `palettes.ts`)
 * plus light / dark mode, both remembered in `prefs`. Mode is the `dark`
 * class on <html>, which the Tailwind tokens key off; the palette is applied
 * by writing its tokens as CSS variables on <html>, so overlays rendered in
 * portals (dialogs, menus, tooltips) inherit it too.
 */
export type ThemeMode = 'light' | 'dark'

export interface ThemeOptions {
  mode?: ThemeMode
  palette?: string
}

const MODE_KEY = 'theme.mode'
const PALETTE_KEY = 'theme.palette'
const listeners = new Set<() => void>()

/** Apply a palette and mode to an element (normally document.documentElement). */
export function applyTheme(root: HTMLElement, { mode = 'light', palette = APP.defaultPalette }: ThemeOptions = {}) {
  const selected = findPalette(palette)
  const dark = mode === 'dark'

  root.classList.toggle('dark', dark)
  root.dataset.palette = selected.id
  if (selected.shape) root.dataset.shape = selected.shape
  else delete root.dataset.shape
  if (selected.texture) root.dataset.texture = selected.texture
  else delete root.dataset.texture

  const backdrop = selected.backdrop
  if (backdrop) {
    const night = dark ? backdrop.dark : undefined
    const files = night ?? backdrop
    root.dataset.backdrop = backdrop.layout
    root.style.setProperty('--backdrop-image', `url("${files.src}")`)
    root.style.setProperty('--backdrop-blur', `url("${files.blur}")`)
    root.style.setProperty('--backdrop-dim', String(dark && !night ? backdrop.dim : 0))
    root.style.setProperty('--backdrop-color', backdrop.color)
  } else {
    delete root.dataset.backdrop
    for (const name of ['--backdrop-image', '--backdrop-blur', '--backdrop-dim', '--backdrop-color']) root.style.removeProperty(name)
  }

  for (const [name, value] of Object.entries(tokens(selected, dark))) {
    root.style.setProperty('--' + name, value)
  }
}

const storedMode = prefs.getItem(MODE_KEY)
let mode: ThemeMode = storedMode === 'dark' || storedMode === 'light' ? storedMode : APP.defaultMode
let palette: string = findPalette(prefs.getItem(PALETTE_KEY) ?? APP.defaultPalette).id

function apply() {
  applyTheme(document.documentElement, { mode, palette })
}
// Applied on import (main.tsx imports this before the first render), so there is no flash of the wrong theme.
apply()

function emit() {
  apply()
  listeners.forEach((l) => l())
}

export function setThemeMode(next: ThemeMode) {
  mode = next
  prefs.setItem(MODE_KEY, next)
  emit()
}

export function setPalette(id: string) {
  palette = findPalette(id).id
  prefs.setItem(PALETTE_KEY, palette)
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Current mode and a toggle. */
export function useThemeMode(): [ThemeMode, () => void] {
  const m = useSyncExternalStore(
    subscribe,
    () => mode,
    () => APP.defaultMode,
  )
  const toggle = useCallback(() => setThemeMode(mode === 'dark' ? 'light' : 'dark'), [])
  return [m, toggle]
}

/** Current palette id and a setter. */
export function usePalette(): [string, (id: string) => void] {
  const p = useSyncExternalStore(
    subscribe,
    () => palette,
    () => APP.defaultPalette,
  )
  return [p, setPalette]
}
