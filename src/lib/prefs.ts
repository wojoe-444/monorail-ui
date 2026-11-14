import { APP } from '@/app/config'

/**
 * Per-person preferences in localStorage (appearance, which nav groups are
 * open, ...). Keys are prefixed with `APP.storagePrefix`, and every call
 * survives storage being unavailable (private windows, blocked site data):
 * reads return null and writes are dropped, so the app still works.
 *
 * Use `prefs` instead of `localStorage` for anything that belongs to the person.
 */
const key = (k: string) => `${APP.storagePrefix}.${k}`

export const prefs = {
  getItem(k: string): string | null {
    try {
      return localStorage.getItem(key(k))
    } catch {
      return null
    }
  },
  setItem(k: string, value: string): void {
    try {
      localStorage.setItem(key(k), value)
    } catch {
      /* storage unavailable: keep it for this session */
    }
  },
  removeItem(k: string): void {
    try {
      localStorage.removeItem(key(k))
    } catch {
      /* ignore */
    }
  },
}

/** A JSON preference, falling back when it is missing or unreadable. */
export function readJson<T>(k: string, fallback: T): T {
  try {
    const raw = prefs.getItem(k)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(k: string, value: unknown): void {
  prefs.setItem(k, JSON.stringify(value))
}
