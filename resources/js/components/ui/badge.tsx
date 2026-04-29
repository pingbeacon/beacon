import { tv } from "tailwind-variants"

export const badgeStyles = tv({
  base: [
    "inline-flex items-center gap-x-1.5 py-px font-medium text-xs/5 forced-colors:outline",
    "border border-(--badge-border,transparent) bg-(--badge-bg) text-(--badge-foreground)",
    "group-hover:bg-(--badge-overlay) group-focus:bg-(--badge-overlay)",
    "*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0",
    "duration-200",
  ],
  variants: {
    intent: {
      primary:
        "[--badge-bg:color-mix(in_oklab,var(--primary)_12%,transparent)] [--badge-foreground:var(--color-primary)] [--badge-overlay:var(--color-primary)]/20",
      secondary:
        "[--badge-bg:var(--color-secondary)] [--badge-foreground:var(--color-secondary-foreground)] [--badge-overlay:var(--color-muted-foreground)]/25",
      success:
        "[--badge-bg:color-mix(in_oklab,var(--success)_12%,transparent)] [--badge-foreground:var(--color-success)] [--badge-overlay:var(--color-success)]/20",
      info: "[--badge-bg:color-mix(in_oklab,var(--primary)_10%,transparent)] [--badge-foreground:var(--color-primary)] [--badge-overlay:var(--color-sky-500)]/20",
      warning:
        "[--badge-bg:color-mix(in_oklab,var(--warning)_12%,transparent)] [--badge-foreground:var(--color-warning)] [--badge-overlay:var(--color-warning)]/20",
      danger:
        "[--badge-bg:color-mix(in_oklab,var(--destructive)_12%,transparent)] [--badge-foreground:var(--color-destructive)] [--badge-overlay:var(--color-destructive)]/20",
      outline: "[--badge-border:var(--color-border)] [--badge-overlay:var(--color-secondary)]/20",
    },
    isCircle: {
      true: "rounded-full px-[calc(--spacing(2)-1px)]",
      false: "rounded-sm px-[calc(--spacing(1.5)-1px)]",
    },
  },
  defaultVariants: {
    intent: "primary",
    isCircle: true,
  },
})

export interface BadgeProps extends React.ComponentProps<"span"> {
  intent?: "primary" | "secondary" | "success" | "info" | "warning" | "danger" | "outline"
  isCircle?: boolean
}

export function Badge({ intent, isCircle, className, ...props }: BadgeProps) {
  return <span {...props} className={badgeStyles({ intent, isCircle, className })} />
}
