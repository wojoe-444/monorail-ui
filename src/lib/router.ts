import { useCallback, useSyncExternalStore } from 'react'

/**
 * Minimal hash router. Hash routing needs no server config and works when the
 * build is opened from file:// (Electron) or a static host. Paths look like
 * "/settings" (URL "#/settings"). Pages are registered in src/app/routes.tsx.
 *
 * Navigate from code with `navigate('/path')`. For a real link (open in new
 * tab, hover shows the URL) use `<a href={href('/path')}>`.
 *
 * If an app outgrows this (nested layouts, loaders, URL params), swap in a
 * real router; only src/components/layout/AppShell.tsx and this file need to change.
 */

/** The href for a route, for plain <a> links: href('/settings') === '#/settings'. */
export function href(path: string): string {
  return `#${path.startsWith('/') ? path : `/${path}`}`
}

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
