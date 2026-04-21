import type { Heartbeat } from "@/types/monitor"
import type { TrackerBlockProps } from "@/components/ui/tracker"

export function heartbeatsToTracker(heartbeats?: Heartbeat[], count = 90): TrackerBlockProps[] {
  if (!heartbeats || heartbeats.length === 0) {
    return Array(count)
      .fill(null)
      .map((_, i) => ({ key: i, tooltip: "No data", color: "bg-muted" }))
  }
  const reversed = [...heartbeats].reverse()
  const padded = [
    ...Array(Math.max(0, count - reversed.length))
      .fill(null)
      .map((_, i) => ({ key: `pad-${i}`, tooltip: "No data", color: "bg-muted" })),
    ...reversed.map((hb, i) => ({
      key: `hb-${i}`,
      tooltip: `${hb.status.charAt(0).toUpperCase() + hb.status.slice(1)} - ${hb.response_time ?? 0}ms`,
      color: hb.status === "up" ? "bg-success" : hb.status === "down" ? "bg-danger" : "bg-warning",
    })),
  ]
  return padded.slice(-count)
}

export function formatInterval(seconds: number): string {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m`
  return `${seconds}s`
}
