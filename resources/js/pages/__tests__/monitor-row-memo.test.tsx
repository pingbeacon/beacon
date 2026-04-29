import { cleanup, render } from "@testing-library/react"
import { memo } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { monitorRowAreEqual } from "@/pages/monitors/index"
import type { Monitor } from "@/types/monitor"

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

describe("monitorRowAreEqual", () => {
  it("returns true for identical monitor ref and isSelected", () => {
    const monitor = makeMonitor()
    expect(monitorRowAreEqual({ monitor, isSelected: false }, { monitor, isSelected: false })).toBe(
      true,
    )
  })

  it("returns false when monitor ref differs", () => {
    const a = makeMonitor()
    const b = makeMonitor()
    expect(
      monitorRowAreEqual({ monitor: a, isSelected: false }, { monitor: b, isSelected: false }),
    ).toBe(false)
  })

  it("returns false when isSelected differs", () => {
    const monitor = makeMonitor()
    expect(monitorRowAreEqual({ monitor, isSelected: false }, { monitor, isSelected: true })).toBe(
      false,
    )
  })
})

describe("React.memo with monitorRowAreEqual", () => {
  afterEach(() => {
    cleanup()
  })

  it("skips re-render when monitor ref and isSelected are unchanged", () => {
    const renderSpy = vi.fn(() => null)
    const Memoized = memo(renderSpy, monitorRowAreEqual)
    const monitor = makeMonitor()

    const { rerender } = render(<Memoized monitor={monitor} isSelected={false} />)
    rerender(<Memoized monitor={monitor} isSelected={false} />)
    rerender(<Memoized monitor={monitor} isSelected={false} />)

    expect(renderSpy).toHaveBeenCalledTimes(1)
  })

  it("re-renders when monitor reference changes", () => {
    const renderSpy = vi.fn(() => null)
    const Memoized = memo(renderSpy, monitorRowAreEqual)

    const { rerender } = render(<Memoized monitor={makeMonitor()} isSelected={false} />)
    rerender(<Memoized monitor={makeMonitor()} isSelected={false} />)

    expect(renderSpy).toHaveBeenCalledTimes(2)
  })

  it("re-renders when isSelected toggles", () => {
    const renderSpy = vi.fn(() => null)
    const Memoized = memo(renderSpy, monitorRowAreEqual)
    const monitor = makeMonitor()

    const { rerender } = render(<Memoized monitor={monitor} isSelected={false} />)
    rerender(<Memoized monitor={monitor} isSelected={true} />)

    expect(renderSpy).toHaveBeenCalledTimes(2)
  })
})
