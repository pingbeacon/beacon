import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NotificationDeliveryLog } from "@/pages/monitors/components/notification-delivery-log"
import type { NotificationDelivery } from "@/types/monitor"

const sample = (overrides: Partial<NotificationDelivery> = {}): NotificationDelivery => ({
  id: 1,
  channel_id: 1,
  channel: { id: 1, name: "Team Email", type: "email" },
  incident_id: 42,
  incident: { id: 42, started_at: "2026-04-30T10:00:00Z", resolved_at: null },
  event_type: "status_flip",
  status: "delivered",
  latency_ms: 120,
  error: null,
  dispatched_at: "2026-04-30T10:00:01Z",
  ...overrides,
})

describe("NotificationDeliveryLog", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders rows fetched from the deliveries endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: [sample({ id: 1 }), sample({ id: 2, status: "failed", error: "boom" })],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
    })

    render(<NotificationDeliveryLog monitorId={5} fetcher={fetcher} />)

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled()
    })

    expect(fetcher.mock.calls[0][0]).toBe("/monitors/5/notification-deliveries?status=all&page=1")

    expect(await screen.findAllByText("Team Email")).toHaveLength(2)
    expect(await screen.findByText("delivered")).toBeInTheDocument()
    expect(await screen.findByText("failed")).toBeInTheDocument()
    expect(await screen.findByText("boom")).toBeInTheDocument()
  })

  it("re-fetches when the failed filter is selected", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    })

    render(<NotificationDeliveryLog monitorId={5} fetcher={fetcher} />)

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Failed" }))
    })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    expect(fetcher.mock.calls[1][0]).toBe(
      "/monitors/5/notification-deliveries?status=failed&page=1",
    )
  })

  it("clears previously rendered rows when a later fetch fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        data: [sample({ id: 1 })],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      })
      .mockRejectedValueOnce(new Error("Failed to load deliveries (500)"))

    render(<NotificationDeliveryLog monitorId={5} fetcher={fetcher} />)

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    expect(await screen.findByText("Team Email")).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Failed" }))
    })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    await screen.findByRole("alert")
    expect(screen.queryByText("Team Email")).toBeNull()
  })

  it("paginates with next/previous buttons", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        data: [sample({ id: 1 })],
        meta: { current_page: 1, last_page: 3, per_page: 20, total: 60 },
      })
      .mockResolvedValueOnce({
        data: [sample({ id: 21 })],
        meta: { current_page: 2, last_page: 3, per_page: 20, total: 60 },
      })

    render(<NotificationDeliveryLog monitorId={5} fetcher={fetcher} />)

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }))
    })

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    expect(fetcher.mock.calls[1][0]).toBe("/monitors/5/notification-deliveries?status=all&page=2")
  })
})
