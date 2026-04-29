import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Terminal } from "@/components/primitives"

describe("Terminal", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders children inside a terminal-class container", () => {
    const { container } = render(<Terminal>$ echo hello</Terminal>)
    expect(container.firstElementChild).toHaveClass("terminal")
    expect(screen.getByText("$ echo hello")).toBeInTheDocument()
  })

  it("renders a <pre> by default for preformatted output", () => {
    const { container } = render(<Terminal>line one</Terminal>)
    expect(container.firstElementChild?.nodeName).toBe("PRE")
  })
})
