import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { KpiCell } from "@/components/primitives"

describe("KpiCell", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders label, value, and sub trio", () => {
    render(<KpiCell label="Total monitors" value="24" sub="22 up · 1 degraded · 1 paused" />)
    expect(screen.getByText("Total monitors")).toHaveClass("kpi-label")
    expect(screen.getByText("24")).toHaveClass("kpi-value")
    expect(screen.getByText(/22 up/)).toHaveClass("kpi-sub")
  })

  it("omits sub when not provided", () => {
    render(<KpiCell label="Avg" value="186 ms" />)
    expect(screen.queryByText("kpi-sub")).not.toBeInTheDocument()
  })

  it("applies an intent token to the value color", () => {
    render(<KpiCell label="Open incidents" value="1" intent="danger" />)
    expect(screen.getByText("1")).toHaveClass("kpi-value", "text-destructive")
  })
})
