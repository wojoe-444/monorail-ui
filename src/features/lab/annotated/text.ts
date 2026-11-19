import { useEffect, useState } from 'react'

/**
 * Text measurement for annotation layout. Labels are placed before they're
 * drawn, so their boxes have to be known up front: measure with a canvas in
 * the same font the SVG uses, and wrap sentences into lines of a set width.
 */

const SANS = '"Inter Variable", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
const MONO = '"Cascadia Mono", Consolas, ui-monospace, monospace'

let ctx: CanvasRenderingContext2D | null = null
const cache = new Map<string, number>()

export function font(size: number, weight = 400, mono = false) {
  return `${weight} ${size}px ${mono ? MONO : SANS}`
}

export function measure(text: string, f: string): number {
  const key = f + '|' + text
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  if (!ctx) ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * 6.5
  ctx.font = f
  const w = ctx.measureText(text).width
  cache.set(key, w)
  return w
}

/** Greedy word wrap into lines no wider than `width`. */
export function wrap(text: string, width: number, f: string, maxLines = 6): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (measure(next, f) <= width || !line) line = next
    else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, '') + '…'
    return kept
  }
  return lines
}

/**
 * Bumps once the web fonts finish loading, so layouts measured against a
 * fallback font re-run against Inter. Clears the measurement cache first.
 */
export function useFontsReady(): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    document.fonts?.ready.then(() => {
      if (!live) return
      cache.clear()
      setN((v) => v + 1)
    })
    return () => {
      live = false
    }
  }, [])
  return n
}
