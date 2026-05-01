import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { IncidentsTab } from "@/pages/monitors/components/incidents-tab"
import type { Incident, IncidentHeatmapPayload } from "@/types/monitor"

const buildIncident = (overrides: Partial<Incident> = {}): Incident => ({
  id: 1,
  monitor_id: 1,
  started_at: new Date(Date.now() - 60_000).toISOString(),
  resolved_at: null,
  cause: "connection refused",
  severity: "sev2",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const buildHeatmap = (counts: number[]): IncidentHeatmapPayload => {
  const days = counts.map((count, i) => ({
    date: new Date(Date.now() - (counts.length - 1 - i) * 86_400_000).toISOString().slice(0, 10),
    count,
  }))
  const incidentDays = counts.filter((c) => c > 0).length
  return {
    days,
    summary: {
      incident_days: incidentDays,
      clean_days: counts.length - incidentDays,
      max_day: counts.length === 0 ? 0 : Math.max(...counts),
      total: counts.reduce((a, b) => a + b, 0),
    },
  }
}

afterEach(cleanup)

describe("IncidentsTab", () => {
  it("renders empty state when no incidents are present", () => {
    render(<IncidentsTab incidents={[]} heatmap={null} />)
    expect(screen.getByText(/No incidents/)).toBeInTheDocument()
  })

  it("renders the four-zone summary strip", () => {
    render(
      <IncidentsTab
        incidents={[buildIncident({ id: 1, resolved_at: null })]}
        heatmap={buildHeatmap([0, 0, 1])}
      />,
    )
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Total · 30d")).toBeInTheDocument()
    expect(screen.getByText("MTTR")).toBeInTheDocument()
    expect(screen.getByText("Total downtime")).toBeInTheDocument()
  })

  it("renders the heatmap legend with the 0 → 6+ ramp", () => {
    render(<IncidentsTab incidents={[]} heatmap={buildHeatmap([0])} />)
    expect(screen.getByText(/6\+ incidents\/day/)).toBeInTheDocument()
    for (const n of [0, 1, 2, 4, 6]) {
      expect(screen.getByTestId(`heatmap-legend-${n}`)).toBeInTheDocument()
    }
  })

  it("renders one heatmap cell per day in the ramp", () => {
    render(<IncidentsTab incidents={[]} heatmap={buildHeatmap(Array(90).fill(0))} />)
    const cells = screen.getAllByTestId("heatmap-cell")
    expect(cells.length).toBe(91)
  })

  it("expands an incident row on click and shows the detail panel", () => {
    const incident = buildIncident({ id: 42 })
    render(<IncidentsTab incidents={[incident]} heatmap={null} />)
    const row = screen.getByTestId("incident-row-42")
    fireEvent.click(row)
    expect(screen.getByTestId("incident-detail-42")).toBeInTheDocument()
  })

  it("shows ACTIVE badge for unresolved and RESOLVED for resolved incidents", () => {
    render(
      <IncidentsTab
        incidents={[
          buildIncident({ id: 1, resolved_at: null }),
          buildIncident({ id: 2, resolved_at: new Date().toISOString() }),
        ]}
        heatmap={null}
      />,
    )
    expect(screen.getByText("ACTIVE")).toBeInTheDocument()
    expect(screen.getByText("RESOLVED")).toBeInTheDocument()
  })
})
