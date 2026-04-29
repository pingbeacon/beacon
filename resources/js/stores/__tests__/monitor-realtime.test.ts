import { beforeEach, describe, expect, it } from "vitest"
import {
  __resetForTests,
  getSnapshot,
  handleChecking,
  handleHeartbeat,
  handleStatusChanged,
  hydrate,
} from "@/stores/monitor-realtime"
import type { Heartbeat, Monitor } from "@/types/monitor"

function makeMonitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: 1,
    user_id: 1,
    monitor_group_id: null,
    name: "Example",
    type: "http",
    url: "https://example.com",
    host: null,
    port: null,
    dns_record_type: null,
    method: "GET",
    body: null,
    headers: null,
    accepted_status_codes: null,
    interval: 60,
    timeout: 30,
    retry_count: 0,
    status: "up",
    is_active: true,
    push_token: null,
    ssl_monitoring_enabled: false,
    ssl_expiry_notification_days: null,
    last_checked_at: "2026-04-28T00:00:00Z",
    next_check_at: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    heartbeats: [],
    uptime_percentage: 100,
    average_response_time: 200,
    ...overrides,
  }
}

function makeHeartbeat(overrides: Partial<Heartbeat> = {}): Heartbeat {
  return {
    id: 1,
    monitor_id: 1,
    status: "up",
    status_code: 200,
    response_time: 150,
    message: null,
    created_at: "2026-04-28T00:01:00Z",
    ...overrides,
  }
}

beforeEach(() => {
  __resetForTests()
})

describe("monitor-realtime store", () => {
  describe("hydrate", () => {
    it("sets state from monitor array", () => {
      const monitors = [makeMonitor({ id: 1 }), makeMonitor({ id: 2, name: "Another" })]
      hydrate(monitors)
      const snap = getSnapshot()
      expect(snap.monitors).toHaveLength(2)
      expect(snap.byId[1]?.name).toBe("Example")
      expect(snap.byId[2]?.name).toBe("Another")
    })

    it("does not erase newer in-memory data on hydrate with stale snapshot", () => {
      hydrate([makeMonitor({ id: 1, last_checked_at: "2026-04-28T00:00:00Z", status: "up" })])
      handleStatusChanged({ monitorId: 1, oldStatus: "up", newStatus: "down", message: null })
      handleHeartbeat({
        monitorId: 1,
        heartbeat: makeHeartbeat({ created_at: "2026-04-28T00:05:00Z", status: "down" }),
        monitorStatus: "down",
        lastCheckedAt: "2026-04-28T00:05:00Z",
        uptimePercentage: 99,
        averageResponseTime: 180,
      })

      hydrate([makeMonitor({ id: 1, last_checked_at: "2026-04-28T00:00:00Z", status: "up" })])

      const snap = getSnapshot()
      expect(snap.byId[1]?.status).toBe("down")
      expect(snap.byId[1]?.last_checked_at).toBe("2026-04-28T00:05:00Z")
    })

    it("accepts newer hydration data over older in-memory data", () => {
      hydrate([makeMonitor({ id: 1, last_checked_at: "2026-04-28T00:00:00Z", status: "up" })])
      hydrate([makeMonitor({ id: 1, last_checked_at: "2026-04-28T01:00:00Z", status: "down" })])
      expect(getSnapshot().byId[1]?.status).toBe("down")
    })
  })

  describe("handleHeartbeat", () => {
    it("appends heartbeat and updates status, uptime, avg, last_checked_at on matching monitor only", () => {
      hydrate([
        makeMonitor({ id: 1, status: "up", uptime_percentage: 100, average_response_time: 200 }),
        makeMonitor({ id: 2, name: "Other", status: "up" }),
      ])
      const hb = makeHeartbeat({ id: 99, created_at: "2026-04-28T00:10:00Z" })
      handleHeartbeat({
        monitorId: 1,
        heartbeat: hb,
        monitorStatus: "down",
        lastCheckedAt: "2026-04-28T00:10:00Z",
        uptimePercentage: 95,
        averageResponseTime: 250,
      })

      const m1 = getSnapshot().byId[1]
      const m2 = getSnapshot().byId[2]
      expect(m1?.heartbeats?.[m1.heartbeats.length - 1]).toEqual(hb)
      expect(m1?.status).toBe("down")
      expect(m1?.uptime_percentage).toBe(95)
      expect(m1?.average_response_time).toBe(250)
      expect(m1?.last_checked_at).toBe("2026-04-28T00:10:00Z")
      expect(m2?.status).toBe("up")
      expect(m2?.heartbeats).toEqual([])
    })

    it("caps heartbeat history at 90 entries", () => {
      const initial = Array.from({ length: 90 }, (_, i) =>
        makeHeartbeat({ id: i + 1, created_at: `2026-04-28T00:${String(i).padStart(2, "0")}:00Z` }),
      )
      hydrate([makeMonitor({ id: 1, heartbeats: initial })])
      handleHeartbeat({
        monitorId: 1,
        heartbeat: makeHeartbeat({ id: 1000, created_at: "2026-04-28T05:00:00Z" }),
        monitorStatus: "up",
        lastCheckedAt: "2026-04-28T05:00:00Z",
        uptimePercentage: 100,
        averageResponseTime: 150,
      })
      const m1 = getSnapshot().byId[1]
      expect(m1?.heartbeats).toHaveLength(90)
      expect(m1?.heartbeats?.[89].id).toBe(1000)
    })

    it("ignores heartbeats for unknown monitor", () => {
      hydrate([makeMonitor({ id: 1 })])
      handleHeartbeat({
        monitorId: 999,
        heartbeat: makeHeartbeat({ monitor_id: 999 }),
        monitorStatus: "up",
        lastCheckedAt: "2026-04-28T00:10:00Z",
        uptimePercentage: 100,
        averageResponseTime: 100,
      })
      expect(getSnapshot().byId[999]).toBeUndefined()
      expect(getSnapshot().monitors).toHaveLength(1)
    })
  })

  describe("handleStatusChanged", () => {
    it("updates status on matching monitor", () => {
      hydrate([makeMonitor({ id: 1, status: "up" })])
      handleStatusChanged({ monitorId: 1, oldStatus: "up", newStatus: "down", message: null })
      expect(getSnapshot().byId[1]?.status).toBe("down")
    })

    it("is idempotent — same event twice yields same state ref", () => {
      hydrate([makeMonitor({ id: 1, status: "up" })])
      handleStatusChanged({ monitorId: 1, oldStatus: "up", newStatus: "down", message: null })
      const after1 = getSnapshot()
      handleStatusChanged({ monitorId: 1, oldStatus: "up", newStatus: "down", message: null })
      const after2 = getSnapshot()
      expect(after2).toBe(after1)
      expect(after2.byId[1]?.status).toBe("down")
    })
  })

  describe("handleChecking", () => {
    it("sets status to pending on matching monitor", () => {
      hydrate([makeMonitor({ id: 1, status: "up" })])
      handleChecking({ monitorId: 1 })
      expect(getSnapshot().byId[1]?.status).toBe("pending")
    })

    it("ignores unknown monitor", () => {
      hydrate([makeMonitor({ id: 1, status: "up" })])
      handleChecking({ monitorId: 42 })
      expect(getSnapshot().byId[1]?.status).toBe("up")
    })
  })
})
