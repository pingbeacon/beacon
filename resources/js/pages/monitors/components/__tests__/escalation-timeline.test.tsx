import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { EscalationTimeline } from "@/pages/monitors/components/escalation-timeline"
import type { EscalationPolicy, NotificationChannel } from "@/types/monitor"

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

const policy: EscalationPolicy = {
  id: 5,
  team_id: 1,
  monitor_id: 7,
  name: "Critical incidents",
  is_active: true,
  created_at: "2026-04-30T00:00:00Z",
  updated_at: "2026-04-30T00:00:00Z",
  steps: [
    {
      id: 50,
      escalation_policy_id: 5,
      order: 1,
      delay_minutes: 0,
      channel_ids: [1],
      created_at: "",
      updated_at: "",
    },
    {
      id: 51,
      escalation_policy_id: 5,
      order: 2,
      delay_minutes: 15,
      channel_ids: [2],
      created_at: "",
      updated_at: "",
    },
  ],
}

afterEach(() => cleanup())

describe("EscalationTimeline", () => {
  it("renders steps with delay labels and channel chips", () => {
    render(<EscalationTimeline policy={policy} channels={channels} active={null} />)

    expect(screen.getByText(/\+0m/)).toBeInTheDocument()
    expect(screen.getByText(/\+15m/)).toBeInTheDocument()
    expect(screen.getByText("Team Email")).toBeInTheDocument()
    expect(screen.getByText("Slack #alerts")).toBeInTheDocument()
  })

  it("highlights the active step from the activeEscalation payload", () => {
    render(
      <EscalationTimeline
        policy={policy}
        channels={channels}
        active={{ incident_id: 123, fired_step_ids: [50] }}
      />,
    )

    const step1 = screen.getByTestId("escalation-step-50")
    const step2 = screen.getByTestId("escalation-step-51")
    expect(step2.getAttribute("data-active")).toBe("true")
    expect(step1.getAttribute("data-active")).toBe("false")
  })

  it("renders an empty state when no policy is provided", () => {
    render(<EscalationTimeline policy={null} channels={channels} active={null} />)

    expect(screen.getByTestId("escalation-empty")).toBeInTheDocument()
  })
})
