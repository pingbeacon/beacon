import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Header } from "@/components/header"

describe("page Header", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the title in the heading slot", () => {
    render(<Header title="Dashboard" />)
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
  })

  it("renders an eyebrow when provided", () => {
    render(<Header eyebrow="acme team" title="Dashboard" />)
    expect(screen.getByText(/acme team/i)).toBeInTheDocument()
  })

  it("renders an action slot in the trailing area", () => {
    render(
      <Header title="Monitors" actions={<button type="button">+ new monitor</button>} />,
    )
    expect(screen.getByRole("button", { name: /new monitor/i })).toBeInTheDocument()
  })
})
