import type { ComponentProps } from "react"
import { twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"

export type HeartbeatStatus = "up" | "degraded" | "down" | "paused" | "pending"

export const heartbeatBarStyles = tv({
  base: "heartbeat-bar",
  variants: {
    status: {
      up: "heartbeat-bar-up",
      degraded: "heartbeat-bar-degraded",
      down: "heartbeat-bar-down",
      paused: "heartbeat-bar-paused",
      pending: "heartbeat-bar-pending",
    },
  },
  defaultVariants: {
    status: "pending",
  },
})

export interface HeartbeatBarProps extends ComponentProps<"span"> {
  status: HeartbeatStatus
}

export function HeartbeatBar({ status, className, ...props }: HeartbeatBarProps) {
  return (
    <span
      data-slot="heartbeat-bar"
      data-status={status}
      className={heartbeatBarStyles({ status, className })}
      {...props}
    />
  )
}

export interface HeartbeatBucket {
  status: HeartbeatStatus
  /** Optional tooltip / aria-label content for the bucket. */
  title?: string
}

export interface HeartbeatStripProps extends Omit<ComponentProps<"div">, "children"> {
  buckets: HeartbeatBucket[]
  height?: number
  emptyLabel?: string
}

export function HeartbeatStrip({
  buckets,
  height = 28,
  emptyLabel = "no heartbeats",
  className,
  style,
  ...props
}: HeartbeatStripProps) {
  if (buckets.length === 0) {
    return (
      <div
        data-slot="heartbeat-strip"
        data-empty=""
        className={twMerge(
          "flex items-center justify-center text-[11px] text-muted-foreground",
          className,
        )}
        style={{ height, ...style }}
        {...props}
      >
        {emptyLabel}
      </div>
    )
  }

  return (
    <div
      data-slot="heartbeat-strip"
      className={twMerge("grid items-stretch gap-[2px]", className)}
      style={{
        gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
        height,
        ...style,
      }}
      {...props}
    >
      {buckets.map((bucket, i) => (
        <HeartbeatBar
          key={i}
          status={bucket.status}
          title={bucket.title}
          role={bucket.title ? "img" : undefined}
          aria-label={bucket.title}
        />
      ))}
    </div>
  )
}
