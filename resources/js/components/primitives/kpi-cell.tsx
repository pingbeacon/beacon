import type { ReactNode } from "react"
import { twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"

const kpiValueStyles = tv({
  base: "kpi-value",
  variants: {
    intent: {
      neutral: "text-foreground",
      primary: "text-primary",
      success: "text-success",
      danger: "text-destructive",
      warning: "text-warning",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: {
    intent: "neutral",
  },
})

export type KpiIntent = "neutral" | "primary" | "success" | "danger" | "warning" | "muted"

export interface KpiCellProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  intent?: KpiIntent
}

export function KpiCell({ label, value, sub, intent, className, ...props }: KpiCellProps) {
  return (
    <div data-slot="kpi-cell" className={twMerge("flex flex-col", className)} {...props}>
      <span className="kpi-label">{label}</span>
      <span className={kpiValueStyles({ intent })}>{value}</span>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </div>
  )
}
