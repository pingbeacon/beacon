import { describe, expect, it } from "vitest"
import { heartbeatsToTracker, isSlow } from "@/lib/heartbeats"
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

  it("produces deterministic snapshot for known input set", () => {
    const heartbeats: Heartbeat[] = [
      makeHeartbeat({ id: 1, status: "up", response_time: 100 }),
      makeHeartbeat({ id: 2, status: "up", response_time: 120 }),
      makeHeartbeat({ id: 3, status: "down", status_code: 500, response_time: null }),
      makeHeartbeat({ id: 4, status: "up", response_time: 4000 }),
      makeHeartbeat({ id: 5, status: "up", response_time: 110 }),
    ]

    const result = heartbeatsToTracker(heartbeats, 6)

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "color": "bg-muted",
          "key": "pad-0",
          "tooltip": "No data",
        },
        {
          "color": "bg-success",
          "key": "hb-0",
          "tooltip": "Up — 100ms",
        },
        {
          "color": "bg-success",
          "key": "hb-1",
          "tooltip": "Up — 120ms",
        },
        {
          "color": "bg-danger",
          "key": "hb-2",
          "tooltip": "Down",
        },
        {
          "color": "bg-warning",
          "key": "hb-3",
          "tooltip": "Up — 4000ms (slow)",
        },
        {
          "color": "bg-success",
          "key": "hb-4",
          "tooltip": "Up — 110ms",
        },
      ]
    `)
  })
})

describe("isSlow", () => {
  it("returns false for non-up heartbeats", () => {
    const hb = makeHeartbeat({ status: "down", response_time: 9999 })
    expect(isSlow(hb, 100)).toBe(false)
  })

  it("returns false when avg is 0 (no baseline)", () => {
    const hb = makeHeartbeat({ status: "up", response_time: 5000 })
    expect(isSlow(hb, 0)).toBe(false)
  })

  it("returns false at 1500ms floor when avg*2 below floor", () => {
    // avg=100, 2*avg=200, floor=1500. 1500ms is NOT slow (must be > threshold).
    const hb = makeHeartbeat({ status: "up", response_time: 1500 })
    expect(isSlow(hb, 100)).toBe(false)
  })

  it("returns true just above 1500ms floor when avg*2 below floor", () => {
    const hb = makeHeartbeat({ status: "up", response_time: 1501 })
    expect(isSlow(hb, 100)).toBe(true)
  })

  it("uses avg*2 threshold when above 1500ms floor", () => {
    // avg=1000, 2*avg=2000. 2000ms is NOT slow; 2001ms IS slow.
    const atThreshold = makeHeartbeat({ status: "up", response_time: 2000 })
    const justOver = makeHeartbeat({ status: "up", response_time: 2001 })
    expect(isSlow(atThreshold, 1000)).toBe(false)
    expect(isSlow(justOver, 1000)).toBe(true)
  })

  it("returns false when response_time is null", () => {
    const hb = makeHeartbeat({ status: "up", response_time: null })
    expect(isSlow(hb, 100)).toBe(false)
  })
})
