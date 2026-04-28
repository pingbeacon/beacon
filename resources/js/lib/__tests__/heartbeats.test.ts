import { describe, expect, it } from "vitest"
import { heartbeatsToTracker } from "@/lib/heartbeats"
import type { Heartbeat } from "@/types/monitor"

function makeHeartbeat(overrides: Partial<Heartbeat>): Heartbeat {
  return {
    id: 1,
    monitor_id: 1,
    status: "up",
    status_code: 200,
    response_time: 100,
    message: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe("heartbeatsToTracker", () => {
  it("returns array of length count when given fewer heartbeats", () => {
    const heartbeats: Heartbeat[] = Array.from({ length: 5 }, (_, i) =>
      makeHeartbeat({
        id: i + 1,
        created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      }),
    )

    const result = heartbeatsToTracker(heartbeats, 10)

    expect(result).toHaveLength(10)
  })

  it("places newest heartbeat in the rightmost bar given oldest-first input", () => {
    const heartbeats: Heartbeat[] = [
      makeHeartbeat({ id: 1, status: "up", response_time: 100 }),
      makeHeartbeat({ id: 2, status: "up", response_time: 100 }),
      makeHeartbeat({ id: 3, status: "down", status_code: 500, response_time: null }),
    ]

    const result = heartbeatsToTracker(heartbeats, 5)

    expect(result).toHaveLength(5)
    expect(result[result.length - 1].color).toBe("bg-danger")
    expect(result[result.length - 2].color).toBe("bg-success")
    expect(result[result.length - 3].color).toBe("bg-success")
    expect(result[0].color).toBe("bg-muted")
  })

  it("produces left-padded array of correct length when input shorter than count", () => {
    const heartbeats: Heartbeat[] = [
      makeHeartbeat({ id: 1, status: "up" }),
      makeHeartbeat({ id: 2, status: "up" }),
    ]

    const result = heartbeatsToTracker(heartbeats, 6)

    expect(result).toHaveLength(6)
    expect(result.slice(0, 4).every((b) => b.color === "bg-muted")).toBe(true)
    expect(result[4].color).toBe("bg-success")
    expect(result[5].color).toBe("bg-success")
  })
})
