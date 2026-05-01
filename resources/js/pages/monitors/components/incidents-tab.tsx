import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid"
import { useMemo, useState } from "react"
import { Eyebrow, KpiCell, StatusDot } from "@/components/primitives"
import type { Incident, IncidentHeatmapDay, IncidentHeatmapPayload } from "@/types/monitor"

export interface IncidentsTabProps {
  incidents: Incident[]
  heatmap: IncidentHeatmapPayload | null
}

function formatDurationSeconds(start: string, end: string | null): string {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  const m = Math.floor(diff / 60)
  const s = diff % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatStartedAt(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const yesterday = new Date(today.getTime() - 86_400_000)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  if (sameDay) return `today · ${time}`
  if (isYesterday) return `yesterday · ${time}`
  const daysAgo = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
  if (daysAgo < 30) return `${daysAgo}d ago · ${time}`
  return `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${time}`
}

const SEV_LABEL: Record<Incident["severity"], string> = {
  sev1: "DOWN",
  sev2: "DOWN",
  sev3: "DEGRADED",
  info: "INFO",
}

function severityDotStatus(severity: Incident["severity"]): "down" | "degraded" | "unknown" {
  if (severity === "sev1" || severity === "sev2") return "down"
  if (severity === "sev3") return "degraded"
  return "unknown"
}

function severityTextClass(severity: Incident["severity"]): string {
  if (severity === "sev1" || severity === "sev2") return "text-destructive"
  if (severity === "sev3") return "text-warning"
  return "text-muted-foreground"
}

export function IncidentsSummary({ incidents }: { incidents: Incident[] }) {
  const stats = useMemo(() => {
    const now = Date.now()
    const cutoff30d = now - 30 * 86_400_000
    const within30 = incidents.filter((i) => new Date(i.started_at).getTime() >= cutoff30d)

    const active = incidents.find((i) => !i.resolved_at) ?? null
    const total30 = within30.length

    const resolved30 = within30.filter((i) => i.resolved_at !== null)
    const totalSeconds = resolved30.reduce((acc, i) => {
      const dur = (new Date(i.resolved_at!).getTime() - new Date(i.started_at).getTime()) / 1000
      return acc + Math.max(0, dur)
    }, 0)

    const mttrSeconds = resolved30.length > 0 ? Math.round(totalSeconds / resolved30.length) : null

    const longest = resolved30.reduce<{ seconds: number; startedAt: string | null }>(
      (acc, i) => {
        const dur = (new Date(i.resolved_at!).getTime() - new Date(i.started_at).getTime()) / 1000
        return dur > acc.seconds ? { seconds: dur, startedAt: i.started_at } : acc
      },
      { seconds: 0, startedAt: null },
    )

    return {
      active,
      total30,
      mttrSeconds,
      totalDowntimeSeconds: Math.round(totalSeconds),
      longestSeconds: Math.round(longest.seconds),
      longestStartedAt: longest.startedAt,
    }
  }, [incidents])

  const fmt = (s: number) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ${s % 60}s`
    return `${Math.floor(m / 60)}h ${m % 60}m`
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <div className="rounded-lg border border-border bg-card px-4 py-3.5">
        <KpiCell
          label="Active"
          value={stats.active ? "1" : "0"}
          sub={
            stats.active
              ? `${formatDurationSeconds(stats.active.started_at, null)} ago`
              : "all clear"
          }
          intent={stats.active ? "danger" : "muted"}
        />
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3.5">
        <KpiCell label="Total · 30d" value={String(stats.total30)} sub="" />
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3.5">
        <KpiCell
          label="MTTR"
          value={stats.mttrSeconds !== null ? fmt(stats.mttrSeconds) : "—"}
          sub={stats.mttrSeconds !== null ? "30d average" : "no resolved incidents"}
          intent="warning"
        />
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3.5">
        <KpiCell
          label="Total downtime"
          value={fmt(stats.totalDowntimeSeconds)}
          sub={
            stats.longestStartedAt
              ? `longest ${fmt(stats.longestSeconds)} · ${formatStartedAt(stats.longestStartedAt)}`
              : "—"
          }
        />
      </div>
    </div>
  )
}

const HEATMAP_WEEKS = 13
const HEATMAP_DAYS = HEATMAP_WEEKS * 7

function colorClass(n: number): string {
  if (n === 0) return "bg-[rgba(255,255,255,0.04)] border border-border"
  if (n === 1) return "bg-[rgba(245,165,36,0.35)]"
  if (n <= 3) return "bg-[rgba(245,165,36,0.75)]"
  if (n <= 5) return "bg-[rgba(255,130,80,0.85)]"
  return "bg-destructive"
}

export function IncidentsHeatmap({ heatmap }: { heatmap: IncidentHeatmapPayload | null }) {
  const days: IncidentHeatmapDay[] = heatmap?.days ?? []
  const padded = useMemo(() => {
    if (days.length >= HEATMAP_DAYS) return days.slice(-HEATMAP_DAYS)
    const fill = Array.from({ length: HEATMAP_DAYS - days.length }, () => ({
      date: "",
      count: 0,
    }))
    return [...fill, ...days]
  }, [days])

  const summary = heatmap?.summary ?? { incident_days: 0, clean_days: 0, max_day: 0, total: 0 }
  const todayIdx = padded.length - 1

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <Eyebrow>{"// incident calendar"}</Eyebrow>
          <span className="text-muted-foreground text-xs">
            last 90 days · <span className="text-foreground">{summary.incident_days} bad</span> ·{" "}
            <span className="text-muted-foreground">{summary.clean_days} clean</span> · worst day{" "}
            <span className="text-destructive">{summary.max_day}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>0</span>
          {[0, 1, 2, 4, 6].map((n) => (
            <span
              key={n}
              data-testid={`heatmap-legend-${n}`}
              className={`h-3 w-3 rounded-sm ${colorClass(n)}`}
            />
          ))}
          <span>6+ incidents/day</span>
        </div>
      </div>
      <div
        role="grid"
        aria-label="Incident calendar heatmap"
        className="grid grid-flow-col gap-1"
        style={{ gridTemplateRows: "repeat(7, 14px)" }}
      >
        {padded.map((d, idx) => (
          <div
            key={`${d.date}-${idx}`}
            data-testid="heatmap-cell"
            data-count={d.count}
            data-date={d.date}
            title={d.date ? `${d.count} incident${d.count === 1 ? "" : "s"} · ${d.date}` : ""}
            className={`relative flex h-3.5 items-center justify-center rounded-sm font-bold text-[8px] ${colorClass(d.count)} ${
              idx === todayIdx ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""
            }`}
          >
            <span
              className={
                d.count >= 2 ? (d.count >= 4 ? "text-background" : "text-foreground") : "sr-only"
              }
            >
              {d.count >= 2 ? d.count : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface IncidentRowProps {
  incident: Incident
  expanded: boolean
  onToggle: () => void
}

function IncidentRow({ incident, expanded, onToggle }: IncidentRowProps) {
  const sev: Incident["severity"] = incident.severity ?? "info"
  const sevClass = severityTextClass(sev)
  const sevLabel = SEV_LABEL[sev]
  const isActive = !incident.resolved_at

  return (
    <div className="border-border border-t">
      <button
        type="button"
        data-testid={`incident-row-${incident.id}`}
        aria-expanded={expanded}
        onClick={onToggle}
        className={`grid w-full cursor-pointer grid-cols-[16px_64px_1fr_80px_70px_70px_24px] items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40 ${
          expanded ? "bg-primary/5" : ""
        }`}
      >
        <StatusDot
          status={severityDotStatus(sev)}
          className={isActive ? "animate-pulse" : undefined}
        />
        <span className={`font-bold text-[10px] tracking-wider ${sevClass}`}>{sevLabel}</span>
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground text-xs">
            {incident.cause ?? `Incident #${incident.id}`}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            {isActive ? "ongoing" : "resolved"}
            {" · "}
            {sevLabel.toLowerCase()}
          </div>
        </div>
        <span className="text-[11px] text-foreground">
          {formatDurationSeconds(incident.started_at, incident.resolved_at)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatStartedAt(incident.started_at)}
        </span>
        <span
          className={`rounded-sm px-1.5 py-0.5 text-center font-semibold text-[9px] tracking-wider ${
            isActive ? "bg-destructive text-background" : "border border-success text-success"
          }`}
        >
          {isActive ? "ACTIVE" : "RESOLVED"}
        </span>
        <span className="text-muted-foreground">
          {expanded ? (
            <ChevronDownIcon data-slot="icon" className="size-4" />
          ) : (
            <ChevronRightIcon data-slot="icon" className="size-4" />
          )}
        </span>
      </button>
      {expanded ? <IncidentRowDetail incident={incident} /> : null}
    </div>
  )
}

function IncidentRowDetail({ incident }: { incident: Incident }) {
  const isActive = !incident.resolved_at
  const events: Array<[string, string, string]> = [
    [
      new Date(incident.started_at).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      "OPEN",
      `incident #${incident.id} opened`,
    ],
  ]
  if (incident.cause) {
    events.push([
      new Date(incident.started_at).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      "CAUSE",
      incident.cause,
    ])
  }
  if (incident.resolved_at) {
    events.push([
      new Date(incident.resolved_at).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      "CLOSE",
      `incident resolved · ${formatDurationSeconds(incident.started_at, incident.resolved_at)}`,
    ])
  }

  return (
    <div
      data-testid={`incident-detail-${incident.id}`}
      className="grid gap-5 bg-primary/[0.02] px-5 pb-5 lg:grid-cols-[1.4fr_1fr]"
    >
      <div className="rounded-md border border-border bg-background p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-foreground text-xs">Event log</span>
          <span className="text-[10px] text-muted-foreground">{events.length} events</span>
        </div>
        <div className="grid gap-1 text-[11px]">
          {events.map((e, i) => (
            <div
              key={i}
              className="grid grid-cols-[88px_70px_1fr] gap-2 text-muted-foreground leading-relaxed"
            >
              <span>{e[0]}</span>
              <span className="font-semibold text-[10px] text-foreground tracking-wider">
                {e[1]}
              </span>
              <span>{e[2]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-border bg-background p-4">
        <div className="mb-2 font-semibold text-foreground text-xs">
          Response time during incident
        </div>
        <svg viewBox="0 0 360 100" preserveAspectRatio="none" className="h-24 w-full" aria-hidden>
          {[20, 40, 60, 80].map((y) => (
            <line
              key={y}
              x1={0}
              x2={360}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="2 4"
            />
          ))}
          <path
            d="M0,80 L40,78 L70,76 L90,72 L110,40 L130,20 L150,15 L170,12 L190,18 L210,30 L230,45 L260,60 L290,72 L320,76 L360,78"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="text-warning"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          <span>−5m</span>
          <span>opened</span>
          <span>{isActive ? "ongoing" : "resolved"}</span>
          <span>+5m</span>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground lg:col-span-2">notifications fired: —</div>
    </div>
  )
}

export function IncidentsList({ incidents }: { incidents: Incident[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-10 text-center text-muted-foreground text-sm">
        No incidents — this service has been running clean.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-5 py-3">
        <Eyebrow>{"// incidents"}</Eyebrow>
      </div>
      {incidents.map((inc) => (
        <IncidentRow
          key={inc.id}
          incident={inc}
          expanded={expandedId === inc.id}
          onToggle={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
        />
      ))}
    </div>
  )
}

export function IncidentsTab({ incidents, heatmap }: IncidentsTabProps) {
  return (
    <div className="space-y-4">
      <IncidentsSummary incidents={incidents} />
      <IncidentsHeatmap heatmap={heatmap} />
      <IncidentsList incidents={incidents} />
    </div>
  )
}
