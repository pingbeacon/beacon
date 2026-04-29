import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Eyebrow } from "@/components/primitives"

describe("Eyebrow", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders children with the eyebrow utility class", () => {
    render(<Eyebrow>uptime tracker</Eyebrow>)
    const node = screen.getByText("uptime tracker")
    expect(node).toHaveClass("eyebrow")
  })

  it("merges custom className", () => {
    render(<Eyebrow className="mb-2">labeled</Eyebrow>)
    expect(screen.getByText("labeled")).toHaveClass("eyebrow", "mb-2")
  })
})
