/** +12% / −3.4% (true minus sign) */
export function formatSignedPercent(n: number): string {
  const v = Math.abs(n * 100).toFixed(Math.abs(n) < 0.1 ? 1 : 0)
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${v}%`
}
