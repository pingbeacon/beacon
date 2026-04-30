import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { HeartbeatBar, HeartbeatStrip } from "@/components/primitives"

describe("HeartbeatBar", () => {
  afterEach(() => {
    cleanup()
  })

  it.each([
    ["up", "heartbeat-bar-up"],
    ["degraded", "heartbeat-bar-degraded"],
    ["down", "heartbeat-bar-down"],
    ["paused", "heartbeat-bar-paused"],
    ["pending", "heartbeat-bar-pending"],
  ] as const)("renders %s state with %s class", (status, klass) => {
    const { container } = render(<HeartbeatBar status={status} />)
    expect(container.firstElementChild).toHaveClass("heartbeat-bar", klass)
  })
})

describe("HeartbeatStrip", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders one bar per bucket", () => {
    const { container } = render(
      <HeartbeatStrip buckets={[{ status: "up" }, { status: "down" }, { status: "degraded" }]} />,
    )
    expect(container.querySelectorAll(".heartbeat-bar")).toHaveLength(3)
  })

  it("renders an empty placeholder when no buckets", () => {
    const { getByText } = render(<HeartbeatStrip buckets={[]} emptyLabel="no data" />)
    expect(getByText("no data")).toBeInTheDocument()
  })

  it("exposes bucket title as aria-label and role=img for screen readers", () => {
    const { container } = render(
      <HeartbeatStrip
        buckets={[
          { status: "up", title: "12:00 — up" },
          { status: "down", title: "12:01 — down" },
          { status: "up" },
        ]}
      />,
    )
    const bars = container.querySelectorAll(".heartbeat-bar")
    expect(bars[0]).toHaveAttribute("aria-label", "12:00 — up")
    expect(bars[0]).toHaveAttribute("role", "img")
    expect(bars[1]).toHaveAttribute("aria-label", "12:01 — down")
    expect(bars[2]).not.toHaveAttribute("aria-label")
    expect(bars[2]).not.toHaveAttribute("role")
  })
})
