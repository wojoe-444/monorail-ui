import { useSyncExternalStore } from 'react'

/**
 * Whether the command palette is open, and how it opened. One shared store,
 * so Ctrl+K, the top bar's search field and any page can open it with
 * `openSearch()`. Nothing here is stored on disk.
 */
export interface SearchState {
  open: boolean
  /** A drawer section's heading the search is narrowed to; undefined searches everything. */
  section?: string
  /** Text to start with. */
  query: string
  /** Bumped on every open, so the palette resets its own state. */
  openId: number
}

let state: SearchState = { open: false, query: '', openId: 0 }
const listeners = new Set<() => void>()

function set(next: SearchState) {
  state = next
  for (const l of listeners) l()
}

/** Open the command palette, optionally narrowed to one drawer section or with text already typed. */
export function openSearch(opts: { section?: string; query?: string } = {}) {
  set({ open: true, section: opts.section, query: opts.query ?? '', openId: state.openId + 1 })
}

export function closeSearch() {
  if (state.open) set({ ...state, open: false })
}

export function useSearchState(): SearchState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}
