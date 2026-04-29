import type { Heartbeat } from "@/types/monitor"
import type { TrackerBlockProps } from "@/components/ui/tracker"

/**
 * Decide whether an "up" heartbeat is slow relative to the rolling average.
 *
 * Threshold is `max(avg * 2, 1500ms)`. Returns false for non-up heartbeats,
 * for null response_time, and when avg is 0 (no baseline).
 */
export function isSlow(hb: Heartbeat, avg: number): boolean {
  if (hb.status !== "up" || avg <= 0 || hb.response_time == null) {
    return false
  }
  const threshold = Math.max(avg * 2, 1500)
  return hb.response_time > threshold
}

/**
 * Convert a heartbeat array into Tracker block props.
 *
 * @param heartbeats - Heartbeats sorted oldest-first (ascending by `created_at`).
 *                     The newest heartbeat must be the last element so it renders
 *                     in the rightmost bar.
 * @param count - Total number of bars to render. Older slots are left-padded with
 *                "No data" placeholders when fewer heartbeats are supplied.
 */
export function heartbeatsToTracker(heartbeats?: Heartbeat[], count = 90): TrackerBlockProps[] {
  if (count <= 0) {
    return []
  }
  if (!heartbeats || heartbeats.length === 0) {
    return Array(count)
      .fill(null)
      .map((_, i) => ({ key: i, tooltip: "No data", color: "bg-muted" }))
  }

  const upTimes = heartbeats
    .filter((hb) => hb.status === "up" && hb.response_time != null)
    .map((hb) => hb.response_time as number)
  const avg = upTimes.length > 0 ? upTimes.reduce((a, b) => a + b, 0) / upTimes.length : 0

  const padded = [
    ...Array(Math.max(0, count - heartbeats.length))
      .fill(null)
      .map((_, i) => ({ key: `pad-${i}`, tooltip: "No data", color: "bg-muted" })),
    ...heartbeats.map((hb, i) => {
      const slow = isSlow(hb, avg)
      const color =
        hb.status === "down"
          ? "bg-danger"
          : slow
            ? "bg-warning"
            : hb.status === "up"
              ? "bg-success"
              : "bg-warning"
      return {
        key: `hb-${i}`,
        tooltip: `${hb.status.charAt(0).toUpperCase() + hb.status.slice(1)}${hb.response_time != null ? ` — ${hb.response_time}ms` : ""}${slow ? " (slow)" : ""}`,
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
