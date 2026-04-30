import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@inertiajs/react", () => ({
  Head: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  router: { reload: vi.fn(), visit: vi.fn(), post: vi.fn() },
}))

import StatusShow from "@/pages/status/show"

const baseStatusPage = {
  id: 1,
  title: "Acme Status",
  description: null,
  slug: "acme",
  logo_path: null,
  favicon_path: null,
  primary_color: null,
  background_color: null,
  text_color: null,
  custom_css: null,
  header_text: null,
  footer_text: null,
  show_powered_by: true,
}

describe("Public status page", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the StatusDot primitive (not a hand-rolled rounded-full div) for the overall status", () => {
    const { container } = render(
      <StatusShow statusPage={baseStatusPage} monitors={[]} overallStatus="operational" />,
    )

    const dot = container.querySelector('[data-slot="status-dot"]')
    expect(dot).not.toBeNull()
    expect(dot).toHaveAttribute("data-status", "up")
    expect(dot).toHaveClass("status-dot", "status-dot-up")
    expect(container.querySelector(".size-3.rounded-full")).toBeNull()
  })

  it.each([
    ["operational", "up"],
    ["degraded", "degraded"],
    ["major_outage", "down"],
  ] as const)("maps overall %s status to StatusDot %s state", (overall, dotState) => {
    const { container } = render(
      <StatusShow statusPage={baseStatusPage} monitors={[]} overallStatus={overall} />,
    )
    expect(container.querySelector('[data-slot="status-dot"]')).toHaveAttribute(
      "data-status",
      dotState,
    )
  })

  it("renders Beacon as the powered-by label, not UptimeRadar", () => {
    render(
      <StatusShow
        statusPage={{ ...baseStatusPage, show_powered_by: true }}
        monitors={[]}
        overallStatus="operational"
      />,
    )
    expect(screen.getByText(/Powered by Beacon/)).toBeInTheDocument()
    expect(screen.queryByText(/UptimeRadar/)).toBeNull()
  })

  it("hides the powered-by label when show_powered_by is false", () => {
    render(
      <StatusShow
        statusPage={{ ...baseStatusPage, show_powered_by: false }}
        monitors={[]}
        overallStatus="operational"
      />,
    )
    expect(screen.queryByText(/Powered by/)).toBeNull()
  })
})
