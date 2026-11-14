import { cn } from '@/lib/utils'

/**
 * The app's logo tile in the drawer header. By default it is the app's
 * initial on the drawer's primary color, so it follows every palette.
 * Replace the contents with the app's own logo (an <img> or inline SVG)
 * when it has one, and keep public/favicon.svg in step.
 */
export function BrandTile({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25',
        className,
      )}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || '·'}
    </span>
  )
}
