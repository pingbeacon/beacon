import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const post = vi.fn()
const del = vi.fn()
const useFormMock = vi.fn()

vi.mock("@inertiajs/react", () => ({
  router: {
    post: (...args: unknown[]) => post(...args),
    delete: (...args: unknown[]) => del(...args),
  },
  useForm: (initial: unknown) => useFormMock(initial),
}))

import { RoutingRulesTable } from "@/pages/monitors/components/routing-rules-table"
import type { NotificationChannel, NotificationRoute } from "@/types/monitor"

const channels: NotificationChannel[] = [
  {
    id: 1,
    user_id: 1,
    team_id: 1,
    name: "Team Email",
    type: "email",
    is_enabled: true,
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
  {
    id: 2,
    user_id: 1,
    team_id: 1,
    name: "Slack #alerts",
    type: "slack",
    is_enabled: true,
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
]

const rules: NotificationRoute[] = [
  {
    id: 10,
    monitor_id: 5,
    team_id: 1,
    name: "Down → Slack + Email",
    priority: 10,
    is_active: true,
    conditions: { severity_filter: null, status_filter: ["down"] },
    channel_ids: [1, 2],
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
  {
    id: 20,
    monitor_id: 5,
    team_id: 1,
    name: "Recovery → Slack",
    priority: 20,
    is_active: true,
    conditions: { severity_filter: null, status_filter: ["up"] },
    channel_ids: [2],
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
]

const formStub = {
  data: {
    name: "",
    priority: 30,
    is_active: true,
    conditions: { severity_filter: [], status_filter: [] },
    channel_ids: [],
  },
  setData: vi.fn(),
  post: vi.fn(),
  errors: {},
  processing: false,
  reset: vi.fn(),
}

describe("RoutingRulesTable", () => {
  afterEach(() => {
    cleanup()
    post.mockReset()
    del.mockReset()
    useFormMock.mockReset()
    useFormMock.mockReturnValue(formStub)
  })

  it("renders all rules with their channel chips", () => {
    useFormMock.mockReturnValue(formStub)
    render(<RoutingRulesTable monitorId={5} rules={rules} channels={channels} />)

    expect(screen.getByText("Down → Slack + Email")).toBeInTheDocument()
    expect(screen.getByText("Recovery → Slack")).toBeInTheDocument()
    expect(screen.getAllByText("Team Email").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Slack #alerts").length).toBeGreaterThan(0)
  })

  it("shows an empty-state message when no rules exist", () => {
    useFormMock.mockReturnValue(formStub)
    render(<RoutingRulesTable monitorId={5} rules={[]} channels={channels} />)

    expect(screen.getByTestId("routing-rules-empty")).toBeInTheDocument()
  })

  it("calls reorder endpoint when a rule moves down", () => {
    useFormMock.mockReturnValue(formStub)
    render(<RoutingRulesTable monitorId={5} rules={rules} channels={channels} />)

    const firstRow = screen.getByTestId("routing-rule-10")
    const downBtn = within(firstRow).getByLabelText("Move rule down")
    fireEvent.click(downBtn)

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toBe("/monitors/5/notification-routes/reorder")
    expect(post.mock.calls[0][1]).toEqual({ order: [20, 10] })
  })

  it("calls destroy endpoint when delete is clicked", () => {
    useFormMock.mockReturnValue(formStub)
    render(<RoutingRulesTable monitorId={5} rules={rules} channels={channels} />)

    const firstRow = screen.getByTestId("routing-rule-10")
    fireEvent.click(within(firstRow).getByLabelText("Delete rule"))

    expect(del).toHaveBeenCalledTimes(1)
    expect(del.mock.calls[0][0]).toBe("/monitors/5/notification-routes/10")
  })
})
