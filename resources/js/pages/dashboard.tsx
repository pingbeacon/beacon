import {
  BellAlertIcon,
  BellIcon,
  ComputerDesktopIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  PlusIcon,
  ShieldCheckIcon,
  SignalIcon,
} from "@heroicons/react/20/solid"
import { Head, router, usePage, WhenVisible } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { Heading } from "@/components/ui/heading"
import { Link } from "@/components/ui/link"
import { Tracker } from "@/components/ui/tracker"
import AppLayout from "@/layouts/app-layout"
import { statusBadgeIntent, uptimeColor } from "@/lib/color"
import { formatInterval, heartbeatsToTracker } from "@/lib/heartbeats"
import monitorRoutes from "@/routes/monitors"
import type { Heartbeat, Monitor } from "@/types/monitor"
import type { SharedData } from "@/types/shared"
import CreateMonitorModal from "./monitors/components/create-monitor-modal"

interface OpenIncident {
  id: number
  monitor_id: number
  monitor_name: string
  started_at: string
  cause: string | null
}

interface SslCert {
  monitor_name: string
  days_until_expiry: number | null
  issuer: string | null
  is_valid: boolean
}

interface NotifChannel {
  name: string
  type: string
  is_enabled: boolean
}

interface LiveEvent {
  id: number
  kind: string
  monitorName: string
  detail: string
  timestamp: Date
  isAlert: boolean
}

interface Props {
  counts: { total: number; up: number; down: number; paused: number }
  team_uptime_30d: number | null
  avg_response_24h: number | null
  open_incidents: OpenIncident[]
  ssl_certs: SslCert[]
  notification_channels: NotifChannel[]
  monitors?: Monitor[]
}

interface HeartbeatPayload {
  monitorId: number
  heartbeat: Heartbeat
  monitorStatus: string
  uptimePercentage: number
  averageResponseTime: number | null
}

interface StatusChangedPayload {
  monitorId: number
  oldStatus: string
  newStatus: string
  message: string | null
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8)
}

function KPIStrip({
  counts,
  teamUptime30d,
  avgResponse24h,
  openIncidentsCount,
}: {
  counts: Props["counts"]
  teamUptime30d: number | null
  avgResponse24h: number | null
  openIncidentsCount: number
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="flex flex-col rounded-lg border bg-overlay px-5 py-4">
        <span className="text-[10px] text-muted-fg uppercase tracking-widest">Monitors</span>
        <span className="mt-2 font-medium font-mono text-4xl tabular-nums">{counts.total}</span>
        <span className="mt-1.5 text-muted-fg text-xs">
          <span className="text-success">{counts.up} up</span>
          {" · "}
          {counts.down > 0 ? (
            <span className="text-danger">{counts.down} down</span>
          ) : (
            <span>0 down</span>
          )}
          {counts.paused > 0 && <span> · {counts.paused} paused</span>}
        </span>
      </div>

      <div className="flex flex-col rounded-lg border bg-overlay px-5 py-4">
        <span className="text-[10px] text-muted-fg uppercase tracking-widest">Uptime · 30d</span>
        <span
          className={`mt-2 font-medium font-mono text-4xl tabular-nums ${teamUptime30d !== null ? uptimeColor(teamUptime30d) : "text-muted-fg"}`}
        >
          {teamUptime30d !== null ? `${teamUptime30d}%` : "—"}
        </span>
        <span className="mt-1.5 text-muted-fg text-xs">team average</span>
      </div>

      <div className="flex flex-col rounded-lg border bg-overlay px-5 py-4">
        <span className="text-[10px] text-muted-fg uppercase tracking-widest">
          Avg response · 24h
        </span>
        <span className="mt-2 font-medium font-mono text-4xl tabular-nums">
          {avgResponse24h !== null ? `${avgResponse24h}ms` : "—"}
        </span>
        <span className="mt-1.5 text-muted-fg text-xs">across all monitors</span>
      </div>

      <div
        className={`flex flex-col rounded-lg border px-5 py-4 ${openIncidentsCount > 0 ? "border-danger/30 bg-danger/8" : "bg-overlay"}`}
      >
        <span
          className={`text-[10px] uppercase tracking-widest ${openIncidentsCount > 0 ? "text-danger/70" : "text-muted-fg"}`}
        >
          Open incidents
        </span>
        <span
          className={`mt-2 font-medium font-mono tabular-nums ${openIncidentsCount > 0 ? "text-5xl text-danger" : "text-4xl"}`}
        >
          {openIncidentsCount}
        </span>
        {openIncidentsCount > 0 && (
          <span className="mt-1.5 text-danger/70 text-xs">action required</span>
        )}
        {openIncidentsCount === 0 && (
          <span className="mt-1.5 text-muted-fg text-xs">all clear</span>
        )}
      </div>
    </div>
  )
}

function ActiveIncidentBanner({ incidents }: { incidents: OpenIncident[] }) {
  const first = incidents[0]
  const startedAt = first?.started_at
  const [elapsed, setElapsed] = useState(() => (startedAt ? formatElapsed(startedAt) : ""))

  useEffect(() => {
    if (!startedAt) return
    const t = setInterval(() => setElapsed(formatElapsed(startedAt)), 1000)
    return () => clearInterval(t)
  }, [startedAt])

  if (incidents.length === 0 || !first) return null

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/8 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="relative flex size-3 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-30" />
          <span className="relative inline-flex size-3 rounded-full bg-danger" />
        </span>
        <span className="font-bold text-danger text-xs uppercase tracking-wider">
          Active incident
        </span>
        <span className="ml-auto font-mono text-danger/60 text-xs">{elapsed}</span>
      </div>
      <div className="mt-2 font-semibold text-danger">{first.monitor_name}</div>
      {first.cause && <div className="mt-0.5 text-danger/70 text-xs">{first.cause}</div>}
      {incidents.length > 1 && (
        <div className="mt-1 text-danger/60 text-xs">+{incidents.length - 1} more</div>
      )}
      <div className="mt-3 flex gap-2">
        <Link href={monitorRoutes.index.url({ query: { status: "down" } })}>
          <Button size="sm" intent="danger">
            <ExclamationCircleIcon data-slot="icon" />
            View affected
          </Button>
        </Link>
      </div>
    </div>
  )
}

function IncidentGantt({ monitors }: { monitors: Monitor[] }) {
  const windowMs = 24 * 60 * 60 * 1000
  const bucketMs = 5 * 60 * 1000
  const timeBucket = Math.floor(Date.now() / bucketMs)
  const now = timeBucket * bucketMs
  const windowStart = now - windowMs

  const rows = useMemo(
    () =>
      monitors
        .filter(
          (m) =>
            m.has_incidents_24h ||
            m.heartbeats?.some(
              (hb) => hb.status === "down" && new Date(hb.created_at).getTime() >= windowStart,
            ),
        )
        .slice(0, 8),
    [monitors, windowStart],
  )

  if (rows.length === 0) return null

  return (
    <div className="rounded-lg border bg-overlay p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-sm">Incident timeline · 24h</div>
          <div className="mt-0.5 text-muted-fg text-xs">
            {rows.length} monitor{rows.length > 1 ? "s" : ""} with incidents in the last 24 hours
          </div>
        </div>
        <div className="flex items-center gap-4 text-muted-fg text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-success/40" />
            up
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-danger" />
            down
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {rows.map((m) => {
          const hbs = [...(m.heartbeats ?? [])]
            .filter((hb) => new Date(hb.created_at).getTime() >= windowStart)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

          type Seg = { start: number; end: number; status: string }
          const segs: Seg[] = []

          for (let i = 0; i < hbs.length; i++) {
            const hb = hbs[i]
            const t = new Date(hb.created_at).getTime()
            const pct = ((t - windowStart) / windowMs) * 100
            const nextHb = hbs[i + 1]
            const nextPct = nextHb
              ? ((new Date(nextHb.created_at).getTime() - windowStart) / windowMs) * 100
              : 100
            const last = segs[segs.length - 1]
            if (!last || last.status !== hb.status) {
              segs.push({ start: Math.max(0, pct), end: Math.min(100, nextPct), status: hb.status })
            } else {
              last.end = Math.min(100, nextPct)
            }
          }

          return (
            <div
              key={m.id}
              className="grid items-center gap-3"
              style={{ gridTemplateColumns: "160px 1fr" }}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="truncate text-fg text-xs">{m.name}</span>
                <span className="shrink-0 rounded bg-muted/20 px-1 py-px font-mono text-[10px] text-muted-fg uppercase">
                  {m.type}
                </span>
              </div>
              <div className="relative h-4 overflow-hidden rounded-sm bg-success/15">
                {segs.map((seg, i) =>
                  seg.status === "down" ? (
                    <div
                      key={i}
                      className="absolute inset-y-0 bg-danger"
                      style={{
                        left: `${seg.start}%`,
                        width: `${Math.max(0.5, seg.end - seg.start)}%`,
                      }}
                    />
                  ) : null,
                )}
                <div className="absolute inset-y-0 right-0 w-px bg-primary/50" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "160px 1fr" }}>
        <div />
        <div className="flex justify-between text-[10px] text-muted-fg/60">
          {["24h ago", "18h", "12h", "6h", "now"].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: Monitor["status"] }) {
  const colors: Record<Monitor["status"], string> = {
    up: "bg-success",
    down: "bg-danger",
    pending: "bg-warning",
    paused: "bg-muted",
  }
  return (
    <span className="relative flex size-2.5 shrink-0">
      {status === "up" && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-20" />
      )}
      <span className={`relative inline-flex size-2.5 rounded-full ${colors[status]}`} />
    </span>
  )
}

function MonitorCard({ monitor }: { monitor: Monitor }) {
  const lastChecked = monitor.last_checked_at ? formatRelativeTime(monitor.last_checked_at) : "—"
  const isDown = monitor.status === "down"

  return (
    <Link
      href={monitorRoutes.show.url(monitor.id)}
      className={`flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:border-fg/20 hover:bg-secondary/20 ${
        isDown ? "border-danger/30 bg-danger/5" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot status={monitor.status} />
          <div className="min-w-0">
            <div className="truncate font-medium text-sm">{monitor.name}</div>
            <div className="truncate text-muted-fg text-xs">
              {monitor.type.toUpperCase()} · {monitor.url ?? monitor.host}
            </div>
          </div>
        </div>
        <Badge intent={statusBadgeIntent[monitor.status]} className="shrink-0 text-[10px]">
          {monitor.status.charAt(0).toUpperCase() + monitor.status.slice(1)}
        </Badge>
      </div>

      <Tracker
        data={heartbeatsToTracker(monitor.heartbeats, 40)}
        className="h-5 w-full"
        aria-label={`Uptime history for ${monitor.name}`}
      />

      <div className="grid grid-cols-4 gap-1 text-center">
        <div>
          <div className="text-[10px] text-muted-fg uppercase tracking-wide">Uptime</div>
          <div
            className={`mt-0.5 font-medium font-mono text-sm tabular-nums ${uptimeColor(monitor.uptime_percentage ?? 100)}`}
          >
            {monitor.uptime_percentage !== undefined ? `${monitor.uptime_percentage}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-fg uppercase tracking-wide">Avg</div>
          <div className="mt-0.5 font-mono text-sm tabular-nums">
            {monitor.average_response_time != null
              ? `${Math.round(monitor.average_response_time)}ms`
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-fg uppercase tracking-wide">Interval</div>
          <div className="mt-0.5 font-mono text-muted-fg text-sm tabular-nums">
            {formatInterval(monitor.interval)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-fg uppercase tracking-wide">Last check</div>
          <div className="mt-0.5 font-mono text-muted-fg text-xs">{lastChecked}</div>
        </div>
      </div>
    </Link>
  )
}

type GridFilter = "all" | "up" | "down" | "paused"

function MonitorGrid({ monitors }: { monitors: Monitor[] }) {
  const [filter, setFilter] = useState<GridFilter>("all")

  const counts = useMemo(
    () => ({
      all: monitors.length,
      up: monitors.filter((m) => m.status === "up").length,
      down: monitors.filter((m) => m.status === "down").length,
      paused: monitors.filter((m) => m.status === "paused" || !m.is_active).length,
    }),
    [monitors],
  )

  const filtered = useMemo(() => {
    if (filter === "all") return monitors
    if (filter === "paused") return monitors.filter((m) => m.status === "paused" || !m.is_active)
    return monitors.filter((m) => m.status === filter)
  }, [monitors, filter])

  const tabs: { key: GridFilter; label: string }[] = [
    { key: "all", label: `All ${counts.all}` },
    { key: "up", label: `Up ${counts.up}` },
    { key: "down", label: `Down ${counts.down}` },
    { key: "paused", label: `Paused ${counts.paused}` },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border bg-overlay p-1">
          {tabs.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-md px-3 py-1.5 font-medium text-xs transition-colors ${
                filter === t.key ? "bg-primary text-primary-fg" : "text-muted-fg hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CreateMonitorModal>
          <Button size="sm" intent="outline">
            <PlusIcon data-slot="icon" />
            Add
          </Button>
        </CreateMonitorModal>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <MonitorCard key={m.id} monitor={m} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-8 text-center text-muted-fg text-sm">
          No {filter === "all" ? "" : filter} monitors.
        </div>
      )}
    </div>
  )
}

function SSLExpiryWidget({ certs }: { certs: SslCert[] }) {
  if (certs.length === 0) return null

  const certColor = (days: number | null, isValid: boolean) => {
    if (!isValid) return "text-danger"
    if (days === null) return "text-muted-fg"
    if (days <= 7) return "text-danger"
    if (days <= 30) return "text-warning"
    return "text-success"
  }

  return (
    <div className="rounded-lg border bg-overlay p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <ShieldCheckIcon className="size-4 text-muted-fg" />
          SSL Expiry
        </div>
        <span className="text-muted-fg text-xs">{certs.length} monitored</span>
      </div>
      <div className="mt-3 space-y-0">
        {certs.map((c, i) => (
          <div key={i} className={`${i > 0 ? "border-border border-t" : ""} py-2.5`}>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium text-xs">{c.monitor_name}</span>
              <span
                className={`shrink-0 font-mono font-semibold text-xs ${certColor(c.days_until_expiry, c.is_valid)}`}
              >
                {c.is_valid && c.days_until_expiry !== null
                  ? `${c.days_until_expiry}d`
                  : c.is_valid
                    ? "—"
                    : "invalid"}
              </span>
            </div>
            {c.issuer && (
              <div className="mt-0.5 truncate text-[10px] text-muted-fg">{c.issuer}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function NotificationChannelsWidget({ channels }: { channels: NotifChannel[] }) {
  if (channels.length === 0) return null

  const typeLabel: Record<string, string> = {
    email: "Email",
    slack: "Slack",
    discord: "Discord",
    telegram: "Telegram",
    webhook: "Webhook",
  }

  return (
    <div className="rounded-lg border bg-overlay p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <BellIcon className="size-4 text-muted-fg" />
          Notifications
        </div>
        <Link href="/notification-channels" className="text-primary text-xs hover:underline">
          manage →
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {channels.map((c, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs">
            <span
              className={`size-2 shrink-0 rounded-full ${c.is_enabled ? "bg-success" : "bg-muted"}`}
            />
            <span className="w-16 shrink-0 text-muted-fg">{typeLabel[c.type] ?? c.type}</span>
            <span className="min-w-0 truncate">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveFeed({ events }: { events: LiveEvent[] }) {
  const alertKinds = new Set(["DOWN", "DEGRADED"])
  return (
    <div className="rounded-lg border bg-overlay p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <SignalIcon className="size-4 text-muted-fg" />
          Live feed
        </div>
        <div className="flex items-center gap-1.5 text-success text-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          streaming
        </div>
      </div>
      <div className="mt-3 font-mono text-xs">
        {events.length === 0 ? (
          <div className="py-6 text-center text-muted-fg">Waiting for events…</div>
        ) : (
          <div className="space-y-0.5">
            {events.slice(0, 15).map((e) => (
              <div
                key={e.id}
                className="grid items-center gap-3 py-1"
                style={{ gridTemplateColumns: "5.5rem 4rem 1fr" }}
              >
                <span className="text-muted-fg/60">{formatTime(e.timestamp)}</span>
                <span
                  className={`font-semibold uppercase ${alertKinds.has(e.kind) ? "text-danger" : e.kind === "UP" ? "text-success" : "text-muted-fg"}`}
                >
                  {e.kind}
                </span>
                <span className="truncate text-muted-fg">
                  {e.monitorName}
                  {e.detail ? ` · ${e.detail}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const steps = [
    {
      icon: ComputerDesktopIcon,
      step: "01",
      title: "Add your first monitor",
      description:
        "Point Beacon at a URL, host, or IP. It will check every 60 seconds and alert you the moment something goes wrong.",
      action: (
        <CreateMonitorModal>
          <Button size="sm">
            <PlusIcon data-slot="icon" />
            Add monitor
          </Button>
        </CreateMonitorModal>
      ),
    },
    {
      icon: BellAlertIcon,
      step: "02",
      title: "Set up notifications",
      description:
        "Get alerted via email, Slack, Discord, or webhook when a monitor goes down — before your users notice.",
      action: (
        <Link href="/notification-channels">
          <Button intent="outline" size="sm">
            Set up channels
          </Button>
        </Link>
      ),
    },
    {
      icon: GlobeAltIcon,
      step: "03",
      title: "Share a status page",
      description:
        "Create a public status page your users can bookmark. Show uptime history and communicate incidents transparently.",
      action: (
        <Link href="/status-pages">
          <Button intent="outline" size="sm">
            Create page
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="py-8">
      <div className="mb-10">
        <Heading level={2}>Get started</Heading>
        <p className="mt-1 text-muted-fg text-sm">
          Three steps to know the moment your services go down.
        </p>
      </div>

      <div className="space-y-3">
        {steps.map(({ icon: Icon, step, title, description, action }, index) => (
          <div
            key={step}
            className="fade-in slide-in-from-bottom-2 flex animate-in items-start gap-4 rounded-lg border bg-bg fill-mode-both px-5 py-4 transition-colors duration-300 hover:bg-secondary/20"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle">
              <Icon className="size-4 text-primary-subtle-fg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-fg text-xs">{step}</span>
                <span className="font-semibold text-sm">{title}</span>
              </div>
              <p className="mt-0.5 text-muted-fg text-xs leading-relaxed">{description}</p>
            </div>
            <div className="shrink-0 pt-0.5">{action}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({
  counts: initialCounts,
  monitors: initialMonitors,
  team_uptime_30d,
  avg_response_24h,
  open_incidents,
  ssl_certs,
  notification_channels,
}: Props) {
  const { auth } = usePage<SharedData>().props
  const [monitors, setMonitors] = useState(initialMonitors)
  const [counts, setCounts] = useState(initialCounts)
  const [openIncidents, setOpenIncidents] = useState(open_incidents)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const liveEventIdRef = useRef(0)

  useEffect(() => {
    if (initialMonitors) setMonitors(initialMonitors)
  }, [initialMonitors])

  useEffect(() => {
    setCounts(initialCounts)
  }, [initialCounts])

  useEffect(() => {
    setOpenIncidents(open_incidents)
  }, [open_incidents])

  const monitorMap = useMemo(() => {
    const map = new Map<number, { name: string; type: string }>()
    monitors?.forEach((m) => map.set(m.id, { name: m.name, type: m.type }))
    return map
  }, [monitors])

  const addLiveEvent = useCallback((event: Omit<LiveEvent, "id">) => {
    setLiveEvents((prev) => [{ ...event, id: ++liveEventIdRef.current }, ...prev].slice(0, 20))
  }, [])

  const handleHeartbeat = useCallback(
    (payload: HeartbeatPayload) => {
      setMonitors((prev) =>
        prev?.map((m) => {
          if (m.id !== payload.monitorId) return m
          const updatedHeartbeats = [...(m.heartbeats ?? []), payload.heartbeat].slice(-90)
          return {
            ...m,
            status: payload.monitorStatus as Monitor["status"],
            heartbeats: updatedHeartbeats,
            uptime_percentage: payload.uptimePercentage,
            average_response_time: payload.averageResponseTime,
          }
        }),
      )
      const info = monitorMap.get(payload.monitorId)
      addLiveEvent({
        kind: info?.type.toUpperCase() ?? "CHECK",
        monitorName: info?.name ?? `Monitor #${payload.monitorId}`,
        detail: [
          payload.heartbeat.status_code ? String(payload.heartbeat.status_code) : null,
          payload.heartbeat.response_time != null ? `${payload.heartbeat.response_time}ms` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        timestamp: new Date(),
        isAlert: payload.heartbeat.status === "down",
      })
    },
    [monitorMap, addLiveEvent],
  )

  const handleStatusChanged = useCallback(
    (payload: StatusChangedPayload) => {
      setMonitors((prev) =>
        prev?.map((m) =>
          m.id === payload.monitorId
            ? {
                ...m,
                status: payload.newStatus as Monitor["status"],
                has_incidents_24h: m.has_incidents_24h || payload.newStatus === "down",
              }
            : m,
        ),
      )
      setCounts((prev) => {
        const updated = { ...prev }
        if (payload.oldStatus === "up") updated.up--
        if (payload.oldStatus === "down") updated.down--
        if (payload.newStatus === "up") updated.up++
        if (payload.newStatus === "down") updated.down++
        return updated
      })

      if (payload.newStatus === "up") {
        setOpenIncidents((prev) => prev.filter((i) => i.monitor_id !== payload.monitorId))
      } else if (payload.newStatus === "down") {
        router.reload({ only: ["open_incidents"], preserveUrl: true })
      }

      const info = monitorMap.get(payload.monitorId)
      addLiveEvent({
        kind: payload.newStatus.toUpperCase(),
        monitorName: info?.name ?? `Monitor #${payload.monitorId}`,
        detail: payload.message ?? (payload.newStatus === "up" ? "recovered" : "incident started"),
        timestamp: new Date(),
        isAlert: payload.newStatus === "down",
      })
    },
    [monitorMap, addLiveEvent],
  )

  const handleChecking = useCallback((payload: { monitorId: number }) => {
    setMonitors((prev) =>
      prev?.map((m) =>
        m.id === payload.monitorId ? { ...m, status: "pending" as Monitor["status"] } : m,
      ),
    )
  }, [])

  useEcho(`monitors.${auth.user.id}`, ".MonitorChecking", handleChecking)
  useEcho(`monitors.${auth.user.id}`, ".HeartbeatRecorded", handleHeartbeat)
  useEcho(`monitors.${auth.user.id}`, ".MonitorStatusChanged", handleStatusChanged)

  return (
    <>
      <Head title="Dashboard" />
      <Container className="space-y-4 pt-2 pb-8">
        {counts.total > 0 && (
          <KPIStrip
            counts={counts}
            teamUptime30d={team_uptime_30d}
            avgResponse24h={avg_response_24h}
            openIncidentsCount={openIncidents.length}
          />
        )}

        {openIncidents.length > 0 && <ActiveIncidentBanner incidents={openIncidents} />}

        <WhenVisible
          fallback={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array(6)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-lg bg-muted/40" />
                ))}
            </div>
          }
          data="monitors"
        >
          {monitors && monitors.length > 0 ? (
            <div className="space-y-4">
              <IncidentGantt monitors={monitors} />

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
                <div className="space-y-4">
                  <MonitorGrid monitors={monitors} />
                  <LiveFeed events={liveEvents} />
                </div>
                <div className="space-y-4">
                  <SSLExpiryWidget certs={ssl_certs} />
                  <NotificationChannelsWidget channels={notification_channels} />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </WhenVisible>
      </Container>
    </>
  )
}

Dashboard.layout = (page: React.ReactNode) => <AppLayout children={page} />
