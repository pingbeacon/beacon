import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SegmentedToggle } from "@/components/primitives"

describe("SegmentedToggle", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders one button per option with labels", () => {
    render(
      <SegmentedToggle
        value="grid"
        onChange={() => {}}
        options={[
          { value: "grid", label: "Grid" },
          { value: "list", label: "List" },
        ]}
      />,
    )
    expect(screen.getByRole("button", { name: "Grid" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "List" })).toBeInTheDocument()
  })

  it("marks the selected segment with aria-pressed", () => {
    render(
      <SegmentedToggle
        value="list"
        onChange={() => {}}
        options={[
          { value: "grid", label: "Grid" },
          { value: "list", label: "List" },
        ]}
      />,
    )
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true")
  })

  it("calls onChange when an unselected segment is clicked", () => {
    const onChange = vi.fn()
    render(
      <SegmentedToggle
        value="grid"
        onChange={onChange}
        options={[
          { value: "grid", label: "Grid" },
          { value: "list", label: "List" },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "List" }))
    expect(onChange).toHaveBeenCalledWith("list")
  })

  it("supports an icon-only variant via aria-label", () => {
    render(
      <SegmentedToggle
        value="grid"
        onChange={() => {}}
        options={[
          { value: "grid", icon: <span aria-hidden>⊞</span>, ariaLabel: "Grid view" },
          { value: "list", icon: <span aria-hidden>☰</span>, ariaLabel: "List view" },
        ]}
      />,
    )
    expect(screen.getByRole("button", { name: "Grid view" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "List view" })).toBeInTheDocument()
  })
})
