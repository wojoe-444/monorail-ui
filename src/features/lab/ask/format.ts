/** Formatting shared by Ask, Inbox and Box Score. */

export const UK_TZ = 'Europe/London'

/** 14:30 in UK time. */
export function ukHm(t: number): string {
  return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: UK_TZ })
}
/** 14:30 UTC */
export function utcHm(t: number): string {
  return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
}
/** Tuesday (or "today"/"yesterday" when close), in the viewer's time. */
export function dayWord(t: number, now = Date.now()): string {
  const d = new Date(t)
  const n = new Date(now)
  const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  if (key(d) === key(n)) return 'today'
  const y = new Date(now - 86400_000)
  if (key(d) === key(y)) return 'yesterday'
  if (Math.abs(now - t) < 6 * 86400_000) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
/** "3h ago", "in 5h" */
export function relative(t: number, now = Date.now()): string {
  const s = Math.round((t - now) / 1000)
  const a = Math.abs(s)
  const unit = a < 60 ? `${a}s` : a < 3600 ? `${Math.round(a / 60)}m` : a < 172800 ? `${Math.round(a / 3600)}h` : `${Math.round(a / 86400)}d`
  if (a < 45) return 'just now'
  return s < 0 ? `${unit} ago` : `in ${unit}`
}
export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US')
export function compact(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return `${(n / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`
  if (a >= 1e4) return `${(n / 1e3).toFixed(0)}K`
  return fmtInt(n)
}
/** +1.2 / −0.4 with a true minus. */
export function signed(n: number, digits = 1): string {
  const v = Math.abs(n).toFixed(digits)
  return n > 0 ? `+${v}` : n < 0 ? `−${v}` : v
}
export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)
/** "one", "two" … "nine", then digits: how prose writes small counts. */
export function countWord(n: number): string {
  return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? fmtInt(n)
}
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** 9:22 pm in the viewer's own time, to pair with dayWord(). */
export function localHm(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', ' ').toLowerCase()
}
