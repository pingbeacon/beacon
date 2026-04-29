import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { StatusDot } from "@/components/primitives"

describe("StatusDot", () => {
  afterEach(() => {
    cleanup()
  })

  it.each([
    ["up", "status-dot-up"],
    ["degraded", "status-dot-degraded"],
    ["down", "status-dot-down"],
    ["unknown", "status-dot-unknown"],
  ] as const)("renders %s state with %s class", (status, klass) => {
    const { container } = render(<StatusDot status={status} />)
    const dot = container.firstElementChild as HTMLElement
    expect(dot).toHaveClass("status-dot", klass)
  })

  it("exposes a sr-only label when provided for accessibility", () => {
    const { getByText } = render(<StatusDot status="up" label="up" />)
    expect(getByText("up")).toHaveClass("sr-only")
  })
})
