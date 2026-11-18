import { useMemo, useState } from 'react'
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react'

import type { IconComponent } from '@/components/layout/nav'
import { cn } from '@/lib/utils'

export interface FileTreeNode {
  /** Unique across the whole tree. */
  id: string
  label: string
  /** Overrides the default icon (folder for parents, page for leaves). */
  icon?: IconComponent
  /** Makes the node a folder. Nest as deep as needed. */
  children?: FileTreeNode[]
  /** Leaves with an href render as links (open-in-new-tab works). Use `href('/path')` from `@/lib/router`. */
  href?: string
  /** Short text on the right of the row, e.g. a count. */
  badge?: string
}

interface FileTreeProps {
  nodes: FileTreeNode[]
  /** The id of the current leaf. It's highlighted and its folders start open. */
  selected?: string
  /** Called when a leaf is clicked. */
  onSelect?: (node: FileTreeNode) => void
  /** Folders open on first render. Defaults to the folders above `selected`. */
  defaultExpanded?: string[]
  /** Controlled open folders. Pair with `onExpandedChange`. */
  expanded?: string[]
  onExpandedChange?: (ids: string[]) => void
  /**
   * Show only matching rows. A leaf matches on its label; a folder matches
   * if its label or any descendant does. Matching folders show open.
   */
  filter?: string
  'aria-label': string
  className?: string
}

/** Ids of the folders that contain `id`, outermost first. */
function ancestorsOf(nodes: FileTreeNode[], id: string, trail: string[] = []): string[] | undefined {
  for (const n of nodes) {
    if (n.id === id) return trail
    if (n.children) {
      const found = ancestorsOf(n.children, id, [...trail, n.id])
      if (found) return found
    }
  }
  return undefined
}

function filterNodes(nodes: FileTreeNode[], q: string): FileTreeNode[] {
  const out: FileTreeNode[] = []
  for (const n of nodes) {
    const self = n.label.toLowerCase().includes(q)
    if (n.children) {
      if (self) out.push(n)
      else {
        const kids = filterNodes(n.children, q)
        if (kids.length) out.push({ ...n, children: kids })
      }
    } else if (self) out.push(n)
  }
  return out
}

/**
 * A collapsible tree of folders and pages, as in a docs sidebar or file
 * browser. Folders toggle open; leaves are buttons (`onSelect`) or links
 * (`href`). Put a filter `Input` above it and pass its value as `filter`.
 */
export function FileTree({
  nodes,
  selected,
  onSelect,
  defaultExpanded,
  expanded: expandedProp,
  onExpandedChange,
  filter,
  className,
  ...rest
}: FileTreeProps) {
  const [expandedState, setExpandedState] = useState<string[]>(
    () => defaultExpanded ?? (selected ? (ancestorsOf(nodes, selected) ?? []) : []),
  )
  const expanded = expandedProp ?? expandedState
  const q = filter?.trim().toLowerCase() ?? ''
  const visible = useMemo(() => (q ? filterNodes(nodes, q) : nodes), [nodes, q])

  const toggle = (id: string) => {
    const next = expanded.includes(id) ? expanded.filter((e) => e !== id) : [...expanded, id]
    if (expandedProp === undefined) setExpandedState(next)
    onExpandedChange?.(next)
  }

  const renderNodes = (list: FileTreeNode[], depth: number) => (
    <ul className={cn(depth > 0 && 'mb-1 ml-5 border-l pl-2')}>
      {list.map((node) => {
        if (node.children) {
          const open = !!q || expanded.includes(node.id)
          const Icon = node.icon ?? (open ? FolderOpen : Folder)
          return (
            <li key={node.id}>
              <button type="button" onClick={() => toggle(node.id)} aria-expanded={open} className={rowClass(false, true)}>
                <ChevronRight className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{node.label}</span>
                {node.badge && <RowBadge>{node.badge}</RowBadge>}
              </button>
              {open && node.children.length > 0 && renderNodes(node.children, depth + 1)}
            </li>
          )
        }
        const current = node.id === selected
        const Icon = node.icon ?? FileText
        const content = (
          <>
            <Icon className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{node.label}</span>
            {node.badge && <RowBadge>{node.badge}</RowBadge>}
          </>
        )
        return (
          <li key={node.id}>
            {node.href ? (
              <a
                href={node.href}
                aria-current={current ? 'page' : undefined}
                onClick={() => onSelect?.(node)}
                className={rowClass(current)}
              >
                {content}
              </a>
            ) : (
              <button
                type="button"
                aria-current={current ? 'page' : undefined}
                onClick={() => onSelect?.(node)}
                className={rowClass(current)}
              >
                {content}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )

  return (
    <nav aria-label={rest['aria-label']} className={cn('text-sm', className)}>
      {visible.length ? renderNodes(visible, 0) : <p className="px-2 py-1.5 text-muted-foreground">No matches.</p>}
    </nav>
  )
}

function rowClass(current: boolean, folder = false) {
  return cn(
    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
    folder
      ? 'gap-1.5 font-medium hover:bg-accent hover:text-accent-foreground'
      : current
        ? 'bg-primary-soft font-medium text-primary-soft-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  )
}

function RowBadge({ children }: { children: string }) {
  return <span className="shrink-0 rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">{children}</span>
}
