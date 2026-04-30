import type {
  ActiveEscalation,
  EscalationPolicy,
  EscalationStep,
  NotificationChannel,
} from "@/types/monitor"

interface Props {
  policy: EscalationPolicy | null
  channels: NotificationChannel[]
  active: ActiveEscalation | null
}

function formatDelay(minutes: number): string {
  if (minutes === 0) return "+0m"
  if (minutes < 60) return `+${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `+${hours}h` : `+${hours}h${rem}m`
}

function pickActiveStepId(steps: EscalationStep[], active: ActiveEscalation | null): number | null {
  if (steps.length === 0) return null
  if (!active || active.fired_step_ids.length === 0) {
    return steps[0]?.id ?? null
  }

  const firedSet = new Set(active.fired_step_ids)
  const ordered = [...steps].sort((a, b) => a.order - b.order)
  const nextUnfired = ordered.find((s) => !firedSet.has(s.id))
  if (nextUnfired) return nextUnfired.id

  return ordered[ordered.length - 1]?.id ?? null
}

function channelLabel(channel: NotificationChannel | undefined, id: number): string {
  if (!channel) return `#${id}`
  return channel.name || channel.type
}

export function EscalationTimeline({ policy, channels, active }: Props) {
  if (!policy || !policy.steps || policy.steps.length === 0) {
    return (
      <div
        data-testid="escalation-empty"
        className="rounded-lg border border-border px-4 py-6 text-muted-foreground text-sm"
      >
        No escalation policy. Add steps to escalate unacked incidents through additional channels.
      </div>
    )
  }

  const channelById = new Map(channels.map((c) => [c.id, c]))
  const orderedSteps = [...policy.steps].sort((a, b) => a.order - b.order)
  const activeStepId = pickActiveStepId(orderedSteps, active)

  return (
    <div data-testid="escalation-timeline" className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <div>
          <p className="font-semibold text-foreground text-sm">{policy.name}</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Escalation policy · {orderedSteps.length} step{orderedSteps.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <ol className="px-4 py-4">
        {orderedSteps.map((step, index) => {
          const isActive = step.id === activeStepId
          const isLast = index === orderedSteps.length - 1
          return (
            <li
              key={step.id}
              data-testid={`escalation-step-${step.id}`}
              data-active={isActive ? "true" : "false"}
              className="grid grid-cols-[5rem_1.5rem_1fr] gap-3 pb-4 last:pb-0"
            >
              <div className="text-right">
                <p
                  className={`font-mono text-xs ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {formatDelay(step.delay_minutes)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                  step {step.order}
                </p>
              </div>

              <div className="relative flex justify-center">
                <span
                  className={`mt-1 size-2.5 rounded-full ring-2 ${
                    isActive ? "bg-primary ring-primary-subtle" : "bg-muted-foreground ring-border"
                  }`}
                  aria-hidden
                />
                {!isLast && (
                  <span className="absolute top-4 bottom-[-1rem] w-px bg-border" aria-hidden />
                )}
              </div>

              <div className={`min-w-0 ${isActive ? "" : "opacity-80"}`}>
                <div className="flex flex-wrap gap-1.5">
                  {(step.channel_ids ?? []).map((id) => (
                    <span
                      key={id}
                      className="rounded-sm border border-border bg-primary-subtle px-2 py-0.5 text-foreground text-xs"
                    >
                      {channelLabel(channelById.get(id), id)}
                    </span>
                  ))}
                  {(!step.channel_ids || step.channel_ids.length === 0) && (
                    <span className="text-muted-foreground text-xs">No channels</span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
