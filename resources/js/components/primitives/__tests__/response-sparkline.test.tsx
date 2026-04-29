import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ResponseSparkline } from "@/components/primitives"

describe("ResponseSparkline", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders an svg with configured dimensions", () => {
    const { container } = render(
      <ResponseSparkline points={[120, 132, 145, 110, 98, 124]} width={80} height={20} />,
    )
    const svg = container.querySelector("svg")!
    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute("width")).toBe("80")
    expect(svg.getAttribute("height")).toBe("20")
  })

  it("renders a polyline with one point per data sample", () => {
    const { container } = render(<ResponseSparkline points={[1, 2, 3, 4]} width={40} height={10} />)
    const polyline = container.querySelector("polyline")!
    expect(polyline).toBeInTheDocument()
    expect(polyline.getAttribute("points")?.split(" ")).toHaveLength(4)
  })

  it("renders an empty placeholder svg when there is no data", () => {
    const { container } = render(<ResponseSparkline points={[]} width={40} height={10} />)
    expect(container.querySelector("polyline")).toBeNull()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("flattens equal points to the vertical center", () => {
    const { container } = render(<ResponseSparkline points={[5, 5, 5]} width={20} height={10} />)
    const polyline = container.querySelector("polyline")!
    const ys = polyline
      .getAttribute("points")!
      .split(" ")
      .map((p) => Number(p.split(",")[1]))
    for (const y of ys) {
      expect(y).toBe(5)
    }
  })
})
