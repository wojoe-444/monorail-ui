import { useCallback, useSyncExternalStore } from 'react'

/**
 * Minimal hash router. Hash routing needs no server config and works when the
 * build is opened from file:// (Electron) or a static host. Paths look like
 * "/settings" (URL "#/settings"). Pages are registered in src/app/routes.tsx.
 *
 * If an app outgrows this (nested layouts, loaders, URL params), swap in a
 * real router; only src/app/AppShell.tsx and this file need to change.
 */

/** Current route path, e.g. "/settings" or "/reports?range=30d". */
export function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw || raw === '/') return '/'
  return raw.startsWith('/') ? raw.replace(/\/+$/, '') : `/${raw}`
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function navigate(path: string) {
  const next = path.startsWith('/') ? path : `/${path}`
  if (currentPath() !== next) window.location.hash = next
}

/** Current route path and a navigate function. */
export function useRoute(): [string, (path: string) => void] {
  const path = useSyncExternalStore(subscribe, currentPath, () => '/')
  const go = useCallback((p: string) => navigate(p), [])
  return [path, go]
}

/**
 * Query parameters of the current route. Routes match exact paths, so detail
 * pages take their id as a query: navigate(`/projects/detail?id=${id}`), then
 * `useSearchParams().get('id')` in the page.
 */
export function useSearchParams(): URLSearchParams {
  const [path] = useRoute()
  const i = path.indexOf('?')
  return new URLSearchParams(i === -1 ? '' : path.slice(i + 1))
}
