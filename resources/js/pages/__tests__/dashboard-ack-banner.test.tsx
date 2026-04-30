import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const { routerPost } = vi.hoisted(() => ({ routerPost: vi.fn() }))

vi.mock("@inertiajs/react", async () => {
  const actual = await vi.importActual<typeof import("@inertiajs/react")>("@inertiajs/react")
  return {
    ...actual,
    router: {
      ...actual.router,
      post: routerPost,
      reload: vi.fn(),
    },
  }
})

import { ActiveIncidentBanner, type OpenIncident } from "@/pages/dashboard"

function makeIncident(overrides: Partial<OpenIncident> = {}): OpenIncident {
  return {
    id: 42,
    monitor_id: 7,
    monitor_name: "API · production",
    started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    cause: "HTTP 500",
    acked_at: null,
    ...overrides,
  }
}

describe("ActiveIncidentBanner", () => {
  afterEach(() => {
    cleanup()
    routerPost.mockClear()
  })

  it("renders the Acknowledge button when the incident is not yet acked", () => {
    render(<ActiveIncidentBanner incidents={[makeIncident()]} />)

    expect(screen.getByTestId("ack-incident")).toBeInTheDocument()
  })

  it("posts to the acknowledge route with the incident id when the button is pressed", () => {
    render(<ActiveIncidentBanner incidents={[makeIncident({ id: 99 })]} />)

    fireEvent.click(screen.getByTestId("ack-incident"))

    expect(routerPost).toHaveBeenCalledTimes(1)
    expect(routerPost.mock.calls[0]?.[0]).toBe("/incidents/99/ack")
  })

  it("hides the Acknowledge button once the incident has been acked", () => {
    render(
      <ActiveIncidentBanner incidents={[makeIncident({ acked_at: new Date().toISOString() })]} />,
    )

    expect(screen.queryByTestId("ack-incident")).toBeNull()
  })

  it("renders nothing when there are no incidents", () => {
    const { container } = render(<ActiveIncidentBanner incidents={[]} />)

    expect(container.firstChild).toBeNull()
  })
})
