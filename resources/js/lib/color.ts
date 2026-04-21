import type { MonitorStatus } from "@/types/monitor"

/**
 * Maps a monitor status to its corresponding Badge intent variant.
 */
export const statusBadgeIntent: Record<MonitorStatus, "success" | "danger" | "warning" | "secondary"> = {
  up: "success",
  down: "danger",
  pending: "warning",
  paused: "secondary",
}

/**
 * Returns a semantic Tailwind text color class for a given uptime percentage.
 * ≥99% → success (green), ≥95% → warning (amber), <95% → danger (red).
 */
export function uptimeColor(value: number): string {
  if (value >= 99) return "text-success"
  if (value >= 95) return "text-warning"
  return "text-danger"
}

/**
 * Returns a contrast-safe text color (#1a1a1a or #ffffff) for a given
 * hex background color, based on perceived luminance (WCAG formula).
 */
export function tagTextColor(hexBackground: string): string {
  const hex = hexBackground.replace("#", "")
  if (hex.length !== 6) return "#ffffff"
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? "#1a1a1a" : "#ffffff"
}
