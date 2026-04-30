import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { PrimitivesGallery } from "@/components/primitives/__fixtures__/gallery"

describe("PrimitivesGallery", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders one section per primitive", () => {
    const { container } = render(<PrimitivesGallery />)
    const sections = container.querySelectorAll("[data-section]")
    const slugs = Array.from(sections, (n) => n.getAttribute("data-section"))
    expect(slugs).toEqual([
      "status-pill",
      "status-dot",
      "tag",
      "kpi",
      "heartbeat",
      "sparkline",
      "terminal",
      "segmented",
    ])
  })

  it("renders without throwing on empty datasets too", () => {
    render(<PrimitivesGallery />)
    expect(screen.getByText("no heartbeats yet")).toBeInTheDocument()
  })
})
