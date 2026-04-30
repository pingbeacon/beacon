import { Focusable } from "react-aria-components"
import { twMerge } from "tailwind-merge"
import { HeartbeatBar, type HeartbeatStatus, heartbeatBarStyles } from "@/components/primitives"
import { Tooltip, TooltipContent } from "@/components/ui/tooltip"
import type { Heartbeat } from "@/types/monitor"

export interface HeartbeatTooltipBucket {
  status: HeartbeatStatus
  /** Underlying heartbeat for tooltip body. Null = padded / paused / no-data slot. */
  heartbeat: Heartbeat | null
  /** Fallback label for empty slots — "no data", "paused", etc. */
  emptyLabel?: string
}

interface Props {
  buckets: HeartbeatTooltipBucket[]
  height?: number
  ariaLabel?: string
  className?: string
}

const STATUS_TONE: Record<HeartbeatStatus, string> = {
  up: "text-success",
  degraded: "text-warning",
  down: "text-destructive",
  paused: "text-muted-foreground",
  pending: "text-muted-foreground",
}

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function HeartbeatTooltipBody({ bucket }: { bucket: HeartbeatTooltipBucket }) {
  if (!bucket.heartbeat) {
    return (
      <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
        {bucket.emptyLabel ?? bucket.status}
      </div>
    )
  }

  const hb = bucket.heartbeat
  const date = hb.created_at ? new Date(hb.created_at) : null
  const stamp = date
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  return (
    <div className="flex flex-col gap-1.5 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span
          className={twMerge(
            "rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
            STATUS_TONE[bucket.status],
          )}
        >
          {hb.status}
        </span>
        <span className="text-foreground tabular-nums">
          {hb.response_time != null ? `${hb.response_time}ms` : "no response"}
        </span>
        {hb.status_code != null && (
          <span className="text-muted-foreground">HTTP {hb.status_code}</span>
        )}
      </div>
      {stamp && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{stamp}</span>
          {date && <span>· {relativeTime(date)}</span>}
        </div>
      )}
      {hb.message && (
        <div className="max-w-xs truncate text-[11px] text-muted-foreground">{hb.message}</div>
      )}
    </div>
  )
}

export function HeartbeatTooltipStrip({ buckets, height = 22, ariaLabel, className }: Props) {
  if (buckets.length === 0) {
    return (
      <div
        className={twMerge(
          "flex items-center justify-center text-[11px] text-muted-foreground",
          className,
        )}
        style={{ height }}
        aria-label={ariaLabel}
      >
        no heartbeats
      </div>
    )
  }

  return (
    <div
      data-slot="heartbeat-strip"
      role="img"
      aria-label={ariaLabel}
      className={twMerge("grid items-stretch gap-[2px]", className)}
      style={{
        gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
        height,
      }}
    >
      {buckets.map((bucket, i) => (
        <Tooltip key={i} delay={120} closeDelay={40}>
          <Focusable>
            <span
              tabIndex={0}
              data-slot="heartbeat-bar"
              data-status={bucket.status}
              className={heartbeatBarStyles({
                status: bucket.status,
                className:
                  "block cursor-default outline-none focus-visible:ring-1 focus-visible:ring-ring",
              })}
            />
          </Focusable>
          <TooltipContent placement="top" offset={8} arrow={false}>
            <HeartbeatTooltipBody bucket={bucket} />
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

// Re-export underlying primitive for callers that don't want tooltips.
export { HeartbeatBar }
