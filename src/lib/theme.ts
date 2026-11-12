import { DEFAULT_PALETTE, findPalette, tokens } from './palettes.js'

export type ThemeMode = 'light' | 'dark'

export interface ThemeOptions {
  mode?: ThemeMode
  palette?: string
}

/** Apply a MonoRail palette to the document root, including portaled components. */
export function applyTheme(
  root: HTMLElement,
  { mode = 'light', palette = DEFAULT_PALETTE }: ThemeOptions = {},
) {
  const selected = findPalette(palette)
  const dark = mode === 'dark'

  root.classList.toggle('dark', dark)
  root.dataset.palette = selected.id
  if (selected.shape) root.dataset.shape = selected.shape
  else delete root.dataset.shape
  if (selected.texture) root.dataset.texture = selected.texture
  else delete root.dataset.texture

  for (const [name, value] of Object.entries(tokens(selected, dark))) {
    root.style.setProperty('--' + name, value)
  }
}
