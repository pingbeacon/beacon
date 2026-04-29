import { tv } from "tailwind-variants"

export const statusDotStyles = tv({
  base: "status-dot",
  variants: {
    status: {
      up: "status-dot-up",
      degraded: "status-dot-degraded",
      down: "status-dot-down",
      unknown: "status-dot-unknown",
    },
  },
  defaultVariants: {
    status: "up",
  },
})

export type StatusDotStatus = "up" | "degraded" | "down" | "unknown"

export interface StatusDotProps extends React.ComponentProps<"span"> {
  status: StatusDotStatus
  label?: string
}

export function StatusDot({ status, label, className, ...props }: StatusDotProps) {
  return (
    <span
      data-slot="status-dot"
      data-status={status}
      aria-hidden={label ? undefined : true}
      className={statusDotStyles({ status, className })}
      {...props}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
