import { tv } from "tailwind-variants"

export const statusPillStyles = tv({
  base: "pill",
  variants: {
    status: {
      up: "pill-up",
      degraded: "pill-degraded",
      down: "pill-down",
      resolved: "pill-resolved",
      paused: "pill-paused",
    },
  },
  defaultVariants: {
    status: "up",
  },
})

export type StatusPillStatus = "up" | "degraded" | "down" | "resolved" | "paused"

export interface StatusPillProps extends React.ComponentProps<"span"> {
  status: StatusPillStatus
}

export function StatusPill({ status, className, ...props }: StatusPillProps) {
  return (
    <span
      data-slot="status-pill"
      data-status={status}
      className={statusPillStyles({ status, className })}
      {...props}
    />
  )
}
