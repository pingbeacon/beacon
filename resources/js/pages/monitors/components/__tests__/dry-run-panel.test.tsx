import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DryRunPanel } from "@/pages/monitors/components/dry-run-panel"

const recentHeartbeats = [
  { id: 17_884, status_code: 200, response_time: 4218, created_at: "2026-04-30T02:18:00Z" },
  { id: 17_883, status_code: 503, response_time: 4500, created_at: "2026-04-30T02:17:00Z" },
]

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("DryRunPanel", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "fetch", {
      value: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          verdict: "fail",
          type: "latency",
          expression: "response_time_ms < 2000",
          actual_value: "4218",
          parse_error: null,
          evaluation_ms: 0.4,
        }),
      }),
      writable: true,
      configurable: true,
    })
  })

  it("renders the dry-run panel chrome", () => {
    const { container } = render(<DryRunPanel monitorId={1} recentHeartbeats={recentHeartbeats} />)
    expect(container.querySelector('[data-slot="dry-run-panel"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="dry-run-rule-editor"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="dry-run-source-picker"]')).toBeInTheDocument()
    expect(screen.getByText(/Dry run/i)).toBeInTheDocument()
  })

  it("toggles between heartbeat and pasted source", () => {
    const { container } = render(<DryRunPanel monitorId={1} recentHeartbeats={recentHeartbeats} />)
    const pastedToggle = container.querySelector(
      '[data-slot="segmented-toggle-item"][data-value="pasted"]',
    ) as HTMLElement
    fireEvent.click(pastedToggle)
    expect(container.querySelector('[data-slot="dry-run-pasted-form"]')).toBeInTheDocument()
  })

  it("posts the dry-run request and renders the verdict", async () => {
    const { container } = render(<DryRunPanel monitorId={42} recentHeartbeats={recentHeartbeats} />)

    fireEvent.click(container.querySelector('[data-slot="dry-run-run"]') as HTMLElement)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled()
    })

    await waitFor(() => {
      const verdict = container.querySelector('[data-slot="dry-run-verdict"]')
      expect(verdict).toBeInTheDocument()
      expect(verdict?.textContent).toContain("FAIL")
      expect(verdict?.textContent).toContain("4218")
    })
  })

  it("renders an empty-state when no recent heartbeats are available", () => {
    const { container } = render(<DryRunPanel monitorId={1} recentHeartbeats={[]} />)
    expect(container.querySelector('[data-slot="dry-run-no-heartbeats"]')).toBeInTheDocument()
  })
})
