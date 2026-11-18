import { useLayoutEffect, useRef, useState } from 'react'

/** Element width, measured before first paint and kept current with a ResizeObserver. */
export function useWidth<E extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<E>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(Math.round(el.getBoundingClientRect().width))
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}
