import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { StatusPill } from "@/components/primitives"

describe("StatusPill", () => {
  afterEach(() => {
    cleanup()
  })

  it.each([
    ["up", "pill-up"],
    ["degraded", "pill-degraded"],
    ["down", "pill-down"],
    ["resolved", "pill-resolved"],
    ["paused", "pill-paused"],
  ] as const)("renders %s state with %s class and uppercased label", (status, klass) => {
    render(<StatusPill status={status}>{status}</StatusPill>)
    const node = screen.getByText(status, { exact: false })
    expect(node).toHaveClass("pill", klass)
  })

  it("renders as a span by default", () => {
    const { container } = render(<StatusPill status="up">UP</StatusPill>)
    expect(container.firstChild?.nodeName).toBe("SPAN")
  })

  it("merges user className onto the variant classes", () => {
    render(
      <StatusPill status="up" className="custom-class">
        UP
      </StatusPill>,
    )
    expect(screen.getByText("UP")).toHaveClass("pill-up", "custom-class")
  })
})
