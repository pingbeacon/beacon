import type { Heartbeat } from "@/types/monitor"
import type { TrackerBlockProps } from "@/components/ui/tracker"

export function heartbeatsToTracker(heartbeats?: Heartbeat[], count = 90): TrackerBlockProps[] {
  if (!heartbeats || heartbeats.length === 0) {
    return Array(count)
      .fill(null)
      .map((_, i) => ({ key: i, tooltip: "No data", color: "bg-muted" }))
  }

  const upTimes = heartbeats
    .filter((hb) => hb.status === "up" && hb.response_time != null)
    .map((hb) => hb.response_time as number)
  const avg = upTimes.length > 0 ? upTimes.reduce((a, b) => a + b, 0) / upTimes.length : 0
  const slowThreshold = Math.max(avg * 2, 1500)

  const reversed = [...heartbeats].reverse()
  const padded = [
    ...Array(Math.max(0, count - reversed.length))
      .fill(null)
      .map((_, i) => ({ key: `pad-${i}`, tooltip: "No data", color: "bg-muted" })),
    ...reversed.map((hb, i) => {
      const isSlow = hb.status === "up" && avg > 0 && (hb.response_time ?? 0) > slowThreshold
      const color = hb.status === "down" ? "bg-danger" : isSlow ? "bg-warning" : hb.status === "up" ? "bg-success" : "bg-warning"
      return {
        key: `hb-${i}`,
        tooltip: `${hb.status.charAt(0).toUpperCase() + hb.status.slice(1)}${hb.response_time != null ? ` — ${hb.response_time}ms` : ""}${isSlow ? " (slow)" : ""}`,
        color,
      }
    }),
  ]
  return padded.slice(-count)
}

export function formatInterval(seconds: number): string {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m`
  return `${seconds}s`
}
