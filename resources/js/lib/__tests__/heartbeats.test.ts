import { describe, expect, it } from "vitest"
import { heartbeatsToTracker } from "@/lib/heartbeats"
import type { Heartbeat } from "@/types/monitor"

describe("heartbeatsToTracker", () => {
    it("returns array of length count when given fewer heartbeats", () => {
        const heartbeats: Heartbeat[] = Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            monitor_id: 1,
            status: "up",
            status_code: 200,
            response_time: 100,
            message: null,
            created_at: new Date(Date.now() - i * 1000).toISOString(),
        }))

        const result = heartbeatsToTracker(heartbeats, 10)

        expect(result).toHaveLength(10)
    })
})
