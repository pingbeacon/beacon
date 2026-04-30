import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { type PhaseTimingsPayload, ResponseTab } from "@/pages/monitors/components/response-tab"
import type { ChartDataPoint, Heartbeat } from "@/types/monitor"

const samplePhases = (
  overrides: Partial<PhaseTimingsPayload["phases"]> = {},
): PhaseTimingsPayload["phases"] => ({
  dns: { avg: 18, p95: 42, count: 100 },
  tcp: { avg: 24, p95: 58, count: 100 },
  tls: { avg: 86, p95: 142, count: 100 },
  ttfb: { avg: 132, p95: 480, count: 100 },
  transfer: { avg: 26, p95: 120, count: 100 },
  ...overrides,
})

const buildPayload = (overrides: Partial<PhaseTimingsPayload> = {}): PhaseTimingsPayload => ({
  period: "24h",
  count: 100,
  phases: samplePhases(),
  ...overrides,
})

const sampleHeartbeat = (overrides: Partial<Heartbeat> = {}): Heartbeat => ({
  id: 1,
  monitor_id: 7,
  status: "up",
  status_code: 200,
  response_time: 250,
  phase_dns_ms: null,
  phase_tcp_ms: null,
  phase_tls_ms: null,
  phase_ttfb_ms: null,
  phase_transfer_ms: null,
  message: null,
  created_at: "2026-04-30T12:00:00Z",
  ...overrides,
})

const sampleChart = (count = 50): ChartDataPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    created_at: new Date(Date.UTC(2026, 3, 30, 10, i)).toISOString(),
    response_time: 200 + (i % 7) * 50,
    status: "up",
  }))

describe("ResponseTab", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders all sections and the active period pill", async () => {
    const fetcher = vi.fn().mockResolvedValue(buildPayload())
    render(
      <ResponseTab
        monitorId={7}
        period="24h"
        onPeriodChange={() => {}}
        chartData={sampleChart()}
        prevChartData={sampleChart(40)}
        heartbeats={[sampleHeartbeat()]}
        fetcher={fetcher}
      />,
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalled())

    expect(fetcher.mock.calls[0][0]).toBe("/monitors/7/phase-timings?period=24h")

    expect(screen.getByRole("img", { name: "Response time chart" })).toBeInTheDocument()
    expect(screen.getByLabelText("Phase breakdown")).toBeInTheDocument()
    expect(screen.getByText(/where time is spent/i)).toBeInTheDocument()
    expect(screen.getByText(/responses bucketed/i)).toBeInTheDocument()
    expect(screen.getByText(/assertion pass\/fail timeline/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Slowest checks")).toBeInTheDocument()

    const active = screen.getByRole("button", { name: "24h" })
    expect(active).toHaveAttribute("aria-pressed", "true")
  })

  it("compare-to-previous toggle is on by default and renders the ghost line", async () => {
    const fetcher = vi.fn().mockResolvedValue(buildPayload())
    const { container } = render(
      <ResponseTab
        monitorId={7}
        period="24h"
        onPeriodChange={() => {}}
        chartData={sampleChart()}
        prevChartData={sampleChart(40)}
        heartbeats={[sampleHeartbeat()]}
        fetcher={fetcher}
      />,
    )

    const compareToggle = screen.getByRole("checkbox", {
      name: /compare to previous period/i,
    })
    expect(compareToggle).toBeChecked()

    await waitFor(() =>
      expect(container.querySelector('[data-slot="prev-period-line"]')).toBeInTheDocument(),
    )
  })

  it("turning the compare toggle off removes the ghost line", async () => {
    const fetcher = vi.fn().mockResolvedValue(buildPayload())
    const { container } = render(
      <ResponseTab
        monitorId={7}
        period="24h"
        onPeriodChange={() => {}}
        chartData={sampleChart()}
        prevChartData={sampleChart(40)}
        heartbeats={[sampleHeartbeat()]}
        fetcher={fetcher}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole("checkbox", { name: /compare to previous period/i }))
    })

    expect(container.querySelector('[data-slot="prev-period-line"]')).not.toBeInTheDocument()
  })

  it("clicking a different range pill calls onPeriodChange and refetches", async () => {
    const fetcher = vi.fn().mockResolvedValue(buildPayload())
    const onPeriodChange = vi.fn()
    const { rerender } = render(
      <ResponseTab
        monitorId={7}
        period="24h"
        onPeriodChange={onPeriodChange}
        chartData={sampleChart()}
        prevChartData={sampleChart()}
        heartbeats={[sampleHeartbeat()]}
        fetcher={fetcher}
      />,
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "7d" }))
    })
    expect(onPeriodChange).toHaveBeenCalledWith("7d")

    rerender(
      <ResponseTab
        monitorId={7}
        period="7d"
        onPeriodChange={onPeriodChange}
        chartData={sampleChart()}
        prevChartData={sampleChart()}
        heartbeats={[sampleHeartbeat()]}
        fetcher={fetcher}
      />,
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    expect(fetcher.mock.calls[1][0]).toBe("/monitors/7/phase-timings?period=7d")
  })

  it("renders one phase row per phase with the API values", async () => {
    const fetcher = vi.fn().mockResolvedValue(buildPayload())
    render(
      <ResponseTab
        monitorId={7}
        period="24h"
        onPeriodChange={() => {}}
        chartData={sampleChart()}
        prevChartData={sampleChart()}
        heartbeats={[sampleHeartbeat()]}
        fetcher={fetcher}
      />,
    )

    const expectedPhases = ["dns", "tcp", "tls", "ttfb", "transfer"]
    await waitFor(() => {
      for (const phase of expectedPhases) {
        expect(document.querySelector(`[data-phase="${phase}"]`)).not.toBeNull()
      }
    })

    expect(screen.getByText("DNS lookup")).toBeInTheDocument()
    expect(screen.getByLabelText("DNS lookup avg 18ms p95 42ms")).toBeInTheDocument()
    expect(screen.getByLabelText("Time to first byte avg 132ms p95 480ms")).toBeInTheDocument()
  })

  it("shows an empty-state message when phase payload reports zero captures", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      buildPayload({
        count: 0,
        phases: {
          dns: { avg: null, p95: null, count: 0 },
          tcp: { avg: null, p95: null, count: 0 },
          tls: { avg: null, p95: null, count: 0 },
          ttfb: { avg: null, p95: null, count: 0 },
          transfer: { avg: null, p95: null, count: 0 },
        },
      }),
    )
    render(
      <ResponseTab
        monitorId={7}
        period="24h"
        onPeriodChange={() => {}}
        chartData={[]}
        prevChartData={[]}
        heartbeats={[]}
        fetcher={fetcher}
      />,
    )
    await waitFor(() => expect(screen.getByText(/no http phase data/i)).toBeInTheDocument())
  })

  it("surfaces a fetch error in the phase waterfall", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Network down"))
    render(
      <ResponseTab
        monitorId={7}
        period="24h"
        onPeriodChange={() => {}}
        chartData={[]}
        prevChartData={[]}
        heartbeats={[]}
        fetcher={fetcher}
      />,
    )
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/network down/i))
  })

  it("renders the slowest checks table with the largest response_time first", async () => {
    const fetcher = vi.fn().mockResolvedValue(buildPayload())
    render(
      <ResponseTab
        monitorId={7}
        period="24h"
        onPeriodChange={() => {}}
        chartData={sampleChart()}
        prevChartData={sampleChart()}
        heartbeats={[
          sampleHeartbeat({ id: 1, response_time: 200 }),
          sampleHeartbeat({ id: 2, response_time: 4500, status_code: 503, status: "down" }),
          sampleHeartbeat({ id: 3, response_time: 800 }),
        ]}
        fetcher={fetcher}
      />,
    )
    await waitFor(() => expect(fetcher).toHaveBeenCalled())

    const rows = screen.getAllByRole("row").slice(1)
    expect(rows[0]).toHaveAttribute("data-id", "2")
    expect(rows[1]).toHaveAttribute("data-id", "3")
    expect(rows[2]).toHaveAttribute("data-id", "1")
  })
})
