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
})
