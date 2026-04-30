import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { type AssertionRowPayload, AssertionsTab } from "@/pages/monitors/components/assertions-tab"

const buildAssertion = (overrides: Partial<AssertionRowPayload> = {}): AssertionRowPayload => ({
  id: 1,
  type: "status",
  expression: "status == 200",
  name: null,
  severity: "critical",
  on_fail: "open_incident",
  muted: false,
  tolerance: 0,
  pass_rate: 99.5,
  fail_count_24h: 12,
  total_24h: 1440,
  last_fail_at: "2026-04-30T02:18:00Z",
  last_fail_actual: "503",
  state: "fail",
  buckets: Array.from({ length: 60 }, (_, i) => (i % 5 === 0 ? 2 : 0)),
  ...overrides,
})

afterEach(cleanup)

describe("AssertionsTab", () => {
  it("renders empty state when no assertions are present", () => {
    const { container } = render(<AssertionsTab monitorId={1} assertions={[]} />)
    expect(container.querySelector('[data-slot="assertions-empty"]')).toBeInTheDocument()
  })

  it("renders the summary, toolbar, and rows when assertions are present", () => {
    const assertions = [
      buildAssertion({ id: 1, state: "fail" }),
      buildAssertion({
        id: 2,
        state: "pass",
        expression: "response_time_ms < 2000",
        type: "latency",
        fail_count_24h: 0,
      }),
      buildAssertion({ id: 3, state: "mute", muted: true }),
    ]
    const { container } = render(<AssertionsTab monitorId={42} assertions={assertions} />)

    expect(container.querySelector('[data-slot="assertions-summary"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="assertions-toolbar"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="assertion-row"]').length).toBe(3)
  })

  it("filters rows when a filter pill is clicked", () => {
    const assertions = [
      buildAssertion({ id: 1, state: "fail" }),
      buildAssertion({ id: 2, state: "pass", fail_count_24h: 0 }),
    ]
    const { container } = render(<AssertionsTab monitorId={1} assertions={assertions} />)

    fireEvent.click(screen.getByRole("button", { name: /Failing/ }))
    expect(container.querySelectorAll('[data-slot="assertion-row"]').length).toBe(1)

    fireEvent.click(screen.getByRole("button", { name: /Passing/ }))
    expect(container.querySelectorAll('[data-slot="assertion-row"]').length).toBe(1)
  })

  it("expands a row to show definition, last failing check, and failure pattern", () => {
    const assertion = buildAssertion()
    const { container } = render(<AssertionsTab monitorId={1} assertions={[assertion]} />)

    const row = container.querySelector('[data-slot="assertion-row"] button') as HTMLElement
    fireEvent.click(row)
    expect(container.querySelector('[data-slot="assertion-detail"]')).toBeInTheDocument()
    expect(screen.getByText(/Last failing check/i)).toBeInTheDocument()
    expect(screen.getByText(/Failure pattern/i)).toBeInTheDocument()
  })

  it("opens the form modal when 'New assertion' is clicked", () => {
    const { container } = render(<AssertionsTab monitorId={1} assertions={[]} />)
    fireEvent.click(container.querySelector('[data-slot="new-assertion-trigger"]') as HTMLElement)
    expect(document.querySelector('[data-slot="assertion-form"]')).toBeInTheDocument()
  })
})
