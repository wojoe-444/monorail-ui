import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TopBarSlotValue {
  target: HTMLElement | null
  /** Hide the breadcrumb until the returned function is called. */
  claim: () => () => void
}

const TopBarSlotContext = createContext<TopBarSlotValue | null>(null)

/** AppShell's side of the slot: the element to fill, and whether a page hid the breadcrumb. */
export function useTopBarSlotHost() {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [claims, setClaims] = useState(0)
  const claim = useCallback(() => {
    setClaims((c) => c + 1)
    return () => setClaims((c) => c - 1)
  }, [])
  const value = useMemo(() => ({ target, claim }), [target, claim])
  return { value, setTarget, hideBreadcrumb: claims > 0 }
}

export const TopBarSlotProvider = TopBarSlotContext.Provider

interface TopBarPortalProps {
  children: ReactNode
  /** Take the breadcrumb's place (default). Pass `false` to sit beside it. */
  replaceBreadcrumb?: boolean
}

/**
 * Renders its children inside the top bar, between the drawer toggle and the
 * light / dark toggle, for as long as the page is mounted. This is how
 * `PageCommandBar`, `CollapsingHeader` and `TaskBar` put a page's title and
 * controls into the app bar. Lay children out as a row; the slot is a flex row
 * with `gap-3`.
 */
export function TopBarPortal({ children, replaceBreadcrumb = true }: TopBarPortalProps) {
  const slot = useContext(TopBarSlotContext)
  const claim = slot?.claim
  useEffect(() => (claim && replaceBreadcrumb ? claim() : undefined), [claim, replaceBreadcrumb])
  if (!slot?.target) return null
  return createPortal(children, slot.target)
}
