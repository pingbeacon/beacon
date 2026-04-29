import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Tag } from "@/components/primitives"

describe("Tag", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders children with the tag utility class", () => {
    render(<Tag>production</Tag>)
    expect(screen.getByText("production")).toHaveClass("tag")
  })

  it("supports an optional leading hash convention", () => {
    render(<Tag>#api</Tag>)
    expect(screen.getByText("#api")).toBeInTheDocument()
  })
})
