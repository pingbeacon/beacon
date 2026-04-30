import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MonitorsToolbar } from "@/pages/monitors/components/monitors-toolbar"
import type { Monitor, Tag } from "@/types/monitor"

function monitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: 1,
    user_id: 1,
    monitor_group_id: null,
    name: "api",
    type: "http",
    url: "https://api.example.com",
    host: null,
    port: null,
    dns_record_type: null,
    method: "GET",
    body: null,
    headers: null,
    accepted_status_codes: null,
    interval: 60,
    timeout: 30,
    retry_count: 0,
    status: "up",
    is_active: true,
    push_token: null,
    ssl_monitoring_enabled: false,
    ssl_expiry_notification_days: null,
    last_checked_at: null,
    next_check_at: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  }
}

function tag(id: number, name: string): Tag {
  return {
    id,
    user_id: 1,
    name,
    color: "#f5a524",
    created_at: "2026-04-01",
    updated_at: "2026-04-01",
  }
}

const noop = () => {}

describe("MonitorsToolbar", () => {
  const monitors: Monitor[] = [
    monitor({ id: 1, status: "up" }),
    monitor({ id: 2, status: "up" }),
    monitor({ id: 3, status: "down" }),
    monitor({ id: 4, status: "paused" }),
  ]

  function renderToolbar(overrides: Partial<React.ComponentProps<typeof MonitorsToolbar>> = {}) {
    return render(
      <MonitorsToolbar
        monitors={monitors}
        tags={[tag(1, "prod"), tag(2, "staging")]}
        searchQuery=""
        onSearchChange={noop}
        statusFilter="all"
        onStatusFilterChange={noop}
        tagFilter={null}
        onTagFilterChange={noop}
        sort="status"
        onSortChange={noop}
        view="list"
        onViewChange={noop}
        {...overrides}
      />,
    )
  }

  it("renders status filter pills with counts including Degraded", () => {
    renderToolbar()
    expect(screen.getByRole("button", { name: /all 4/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /up 2/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /degraded/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /down 1/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /paused 1/i })).toBeInTheDocument()
  })

  it("renders tag chips for each tag", () => {
    renderToolbar()
    expect(screen.getByRole("button", { name: "#prod" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "#staging" })).toBeInTheDocument()
  })

  it("renders sort dropdown reflecting the current selection", () => {
    const { rerender } = render(
      <MonitorsToolbar
        monitors={monitors}
        tags={[]}
        searchQuery=""
        onSearchChange={noop}
        statusFilter="all"
        onStatusFilterChange={noop}
        tagFilter={null}
        onTagFilterChange={noop}
        sort="status"
        onSortChange={noop}
        view="list"
        onViewChange={noop}
      />,
    )

    expect(screen.getByRole("button", { name: /sort/i })).toHaveTextContent(/status/i)

    rerender(
      <MonitorsToolbar
        monitors={monitors}
        tags={[]}
        searchQuery=""
        onSearchChange={noop}
        statusFilter="all"
        onStatusFilterChange={noop}
        tagFilter={null}
        onTagFilterChange={noop}
        sort="name"
        onSortChange={noop}
        view="list"
        onViewChange={noop}
      />,
    )

    expect(screen.getByRole("button", { name: /sort/i })).toHaveTextContent(/name/i)
  })

  it("renders list/grid segmented toggle and emits the selected view", () => {
    const onViewChange = vi.fn()
    renderToolbar({ onViewChange })

    const grid = screen.getByRole("button", { name: /grid view/i })
    fireEvent.click(grid)
    expect(onViewChange).toHaveBeenCalledWith("grid")
  })

  it("emits the status pill that was clicked", () => {
    const onStatusFilterChange = vi.fn()
    renderToolbar({ onStatusFilterChange })

    fireEvent.click(screen.getByRole("button", { name: /down 1/i }))
    expect(onStatusFilterChange).toHaveBeenCalledWith("down")
  })

  it("toggles tag filter on click", () => {
    const onTagFilterChange = vi.fn()
    renderToolbar({ onTagFilterChange })

    fireEvent.click(screen.getByRole("button", { name: "#prod" }))
    expect(onTagFilterChange).toHaveBeenCalledWith(1)
  })
})
