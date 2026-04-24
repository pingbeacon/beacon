import AppLayout from "@/layouts/app-layout"
import type { SharedData } from "@/types/shared"
import { Head, router, usePage, WhenVisible } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { Container } from "@/components/ui/container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tracker } from "@/components/ui/tracker"
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Monitor, Heartbeat, Incident, UptimeStats, ChartDataPoint, SslCertificate } from "@/types/monitor"
import { PencilIcon, PauseIcon, PlayIcon, TrashIcon } from "@heroicons/react/20/solid"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"
import { TagBadge } from "@/components/tag-badge"
import { Heading } from "@/components/ui/heading"
import { uptimeColor, statusBadgeIntent } from "@/lib/color"
import monitorRoutes from "@/routes/monitors"
import { heartbeatsToTracker, formatInterval } from "@/lib/heartbeats"
import { Chart, CartesianGrid, XAxis, YAxis, ChartTooltip } from "@/components/ui/chart"
import { Area, AreaChart } from "recharts"
import { useCallback, useEffect, useState } from "react"

interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

interface Props {
  monitor: Monitor
  heartbeats?: { data: Heartbeat[]; links: PaginationLinks; meta: PaginationMeta }
  incidents?: Incident[]
  chartData?: ChartDataPoint[]
  uptimeStats?: UptimeStats
  sslCertificate?: SslCertificate | null
  chartPeriod?: string
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

function formatDuration(start: string, end: string | null): string {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
  return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`
}

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function computePercentiles(data: ChartDataPoint[]) {
  const sorted = data
    .filter((d) => d.response_time !== null)
    .map((d) => d.response_time!)
    .sort((a, b) => a - b)
  if (!sorted.length) return null
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  return { p25: at(0.25), p50: at(0.5), p75: at(0.75), p95: at(0.95) }
}

const chartConfig = {
  response_time: {
    label: "Response Time",
    color: "var(--chart-1)",
  },
}

function sslExpiryColor(days: number | null): string {
  if (days === null) return "text-muted-fg"
  if (days <= 0) return "text-danger"
  if (days <= 14) return "text-warning"
  return "text-success"
}

const periodLabels: Record<string, string> = {
  "1h": "1h",
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-widest text-primary">{children}</p>
  )
}

export default function MonitorsShow({
  monitor: initialMonitor,
  heartbeats: initialHeartbeats,
  incidents: initialIncidents,
  chartData: initialChartData,
  uptimeStats,
  sslCertificate,
  chartPeriod: initialChartPeriod,
}: Props) {
  const { auth } = usePage<SharedData>().props
  const [monitor, setMonitor] = useState(initialMonitor)
  const [heartbeats, setHeartbeats] = useState(initialHeartbeats)
  const [incidents, setIncidents] = useState(initialIncidents)
  const [chartData, setChartData] = useState(initialChartData)
  const [chartPeriod, setChartPeriod] = useState(initialChartPeriod ?? "24h")

  useEffect(() => {
    setMonitor(initialMonitor)
  }, [initialMonitor])

  useEffect(() => {
    if (initialHeartbeats) setHeartbeats(initialHeartbeats)
  }, [initialHeartbeats])

  useEffect(() => {
    if (initialIncidents) setIncidents(initialIncidents)
  }, [initialIncidents])

  useEffect(() => {
    if (initialChartData) setChartData(initialChartData)
  }, [initialChartData])

  const handlePeriodChange = (period: string) => {
    setChartPeriod(period)
    router.reload({
      only: ["chartData"],
      data: { period },
      preserveScroll: true,
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (chartPeriod === "30d") {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
    if (chartPeriod === "7d") {
      return (
        date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      )
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleHeartbeat = useCallback(
    (payload: HeartbeatPayload) => {
      if (payload.monitorId !== monitor.id) return
      setMonitor((prev) => ({
        ...prev,
        status: payload.monitorStatus as Monitor["status"],
      }))
      setHeartbeats((prev) => {
        if (!prev) return prev
        return { ...prev, data: [payload.heartbeat, ...prev.data] }
      })
      if (payload.heartbeat.response_time !== null && (chartPeriod === "1h" || chartPeriod === "24h")) {
        setChartData((prev) => {
          if (!prev) return prev
          return [
            ...prev,
            {
              created_at: payload.heartbeat.created_at,
              response_time: payload.heartbeat.response_time,
              status: payload.heartbeat.status,
            },
          ]
        })
      }
    },
    [monitor.id, chartPeriod],
  )

  const handleStatusChanged = useCallback(
    (payload: StatusChangedPayload) => {
      if (payload.monitorId !== monitor.id) return
      setMonitor((prev) => ({ ...prev, status: payload.newStatus as Monitor["status"] }))
      if (payload.newStatus === "down" && payload.oldStatus !== "down") {
        setIncidents((prev) => [
          {
            id: Date.now(),
            monitor_id: monitor.id,
            started_at: new Date().toISOString(),
            resolved_at: null,
            cause: payload.message ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Incident,
          ...(prev ?? []),
        ])
      }
      if (payload.newStatus === "up" && payload.oldStatus === "down") {
        setIncidents((prev) =>
          (prev ?? []).map((inc) =>
            inc.resolved_at === null ? { ...inc, resolved_at: new Date().toISOString() } : inc,
          ),
        )
      }
    },
    [monitor.id],
  )

  const handleChecking = useCallback(
    (payload: { monitorId: number }) => {
      if (payload.monitorId !== monitor.id) return
      setMonitor((prev) => ({ ...prev, status: "pending" as Monitor["status"] }))
    },
    [monitor.id],
  )

  useEcho(`monitors.${auth.user.id}`, ".MonitorChecking", handleChecking)
  useEcho(`monitors.${auth.user.id}`, ".HeartbeatRecorded", handleHeartbeat)
  useEcho(`monitors.${auth.user.id}`, ".MonitorStatusChanged", handleStatusChanged)

  const trackerData = heartbeatsToTracker(heartbeats?.data)

  return (
    <>
      <Head title={monitor.name} />
      <Container className="pb-8 pt-4">

        {/* ── Flat header ── */}
        <div className="border-b border-border pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <Badge intent={statusBadgeIntent[monitor.status]} className="shrink-0 text-xs font-bold uppercase tracking-wide">
                  {monitor.status}
                </Badge>
                <Heading level={2} className="truncate text-xl font-semibold leading-tight">
                  {monitor.name}
                </Heading>
              </div>
              <p className="mt-0.5 text-sm text-muted-fg">
                {monitor.url || `${monitor.host}${monitor.port ? `:${monitor.port}` : ""}`}
                {" · "}
                {monitor.type.toUpperCase()}
                {" · "}
                {formatInterval(monitor.interval)}
              </p>
              {monitor.tags && monitor.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {monitor.tags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                intent="outline"
                size="sm"
                onPress={() => router.visit(monitorRoutes.edit.url(monitor.id))}
              >
                <PencilIcon data-slot="icon" />
                Configure
              </Button>
              <Button
                intent="outline"
                size="sm"
                onPress={() =>
                  router.post(monitorRoutes.toggle.url(monitor.id), {}, { preserveScroll: true })
                }
              >
                {monitor.is_active ? <PauseIcon data-slot="icon" /> : <PlayIcon data-slot="icon" />}
                {monitor.is_active ? "Pause" : "Resume"}
              </Button>
              <ConfirmDeleteModal
                title="Delete Monitor"
                description="Are you sure you want to delete this monitor? The monitor will be archived and can be restored later."
                deleteUrl={monitorRoutes.destroy.url(monitor.id)}
              >
                <Button intent="danger" size="sm">
                  <TrashIcon data-slot="icon" />
                  Delete
                </Button>
              </ConfirmDeleteModal>
            </div>
          </div>

          {/* KPI strip */}
          <div className="mt-5 grid grid-cols-2 border border-border sm:grid-cols-4">
            <WhenVisible
              data="uptimeStats"
              fallback={
                <>
                  {Array(3)
                    .fill(null)
                    .map((_, i) => (
                      <div key={i} className="border-r border-border p-4">
                        <div className="mb-2 h-2.5 w-20 animate-pulse rounded-sm bg-muted" />
                        <div className="h-7 w-16 animate-pulse rounded-sm bg-muted" />
                      </div>
                    ))}
                </>
              }
            >
              <>
                <div className="border-r border-border p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-fg">30d Uptime</p>
                  <p className={`mt-1 text-2xl font-medium ${uptimeStats ? uptimeColor(uptimeStats.uptime_30d) : "text-fg"}`}>
                    {uptimeStats ? `${uptimeStats.uptime_30d}%` : "—"}
                  </p>
                </div>
                <div className="border-r border-border p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-fg">Avg Response · 24h</p>
                  <p className="mt-1 text-2xl font-medium text-fg">
                    {uptimeStats?.avg_response_24h ? `${Math.round(uptimeStats.avg_response_24h)} ms` : "—"}
                  </p>
                </div>
                <div className="border-r border-border p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-fg">Avg Response · 30d</p>
                  <p className="mt-1 text-2xl font-medium text-fg">
                    {uptimeStats?.avg_response_30d ? `${Math.round(uptimeStats.avg_response_30d)} ms` : "—"}
                  </p>
                </div>
              </>
            </WhenVisible>
            <div className="p-4">
              <p className="text-xs uppercase tracking-widest text-muted-fg">Last Check</p>
              <p className="mt-1 text-2xl font-medium text-fg">
                {monitor.last_checked_at ? formatTimeAgo(monitor.last_checked_at) : "Never"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs className="mt-6">
          <TabList>
            <Tab id="overview">Overview</Tab>
            <Tab id="heartbeats">Heartbeats</Tab>
            <Tab id="incidents">Incidents</Tab>
            {monitor.type === "http" && monitor.ssl_monitoring_enabled && (
              <Tab id="ssl">SSL Certificate</Tab>
            )}
          </TabList>

          {/* ── Overview ── */}
          <TabPanel id="overview" className="pt-6">
            <div className="grid gap-6 lg:grid-cols-3">

              {/* Left: main content */}
              <div className="space-y-4 lg:col-span-2">

                {/* Uptime Tracker */}
                <div className="border border-border p-4">
                  <SectionLabel>Uptime Tracker</SectionLabel>
                  <p className="mb-3 mt-1 text-xs text-muted-fg">Last 90 heartbeats</p>
                  <WhenVisible
                    fallback={<div className="h-8 animate-pulse rounded-sm bg-muted" />}
                    data="heartbeats"
                  >
                    <Tracker
                      data={trackerData}
                      aria-label={`Uptime history for ${monitor.name} — last 90 checks`}
                    />
                  </WhenVisible>
                </div>

                {/* Response Time + Distribution */}
                <div className="border border-border">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <SectionLabel>
                      Response Time · {periodLabels[chartPeriod] ?? chartPeriod}
                    </SectionLabel>
                    <div className="flex gap-1">
                      {(["1h", "24h", "7d", "30d"] as const).map((p) => (
                        <Button
                          key={p}
                          intent={chartPeriod === p ? "secondary" : "plain"}
                          size="sm"
                          onPress={() => handlePeriodChange(p)}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4">
                    <WhenVisible
                      fallback={<div className="h-[200px] animate-pulse rounded-sm bg-muted" />}
                      data="chartData"
                    >
                      {chartData && chartData.length > 0 ? (
                        (() => {
                          const chartPoints = chartData.map((d) => ({
                            time: formatTime(d.created_at),
                            response_time: d.response_time,
                          }))
                          const percentiles = computePercentiles(chartData)
                          return (
                            <>
                              <Chart
                                config={chartConfig}
                                data={chartPoints}
                                dataKey="time"
                                containerHeight={200}
                              >
                                <AreaChart data={chartPoints} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                                  <CartesianGrid />
                                  <XAxis dataKey="time" tick={{ transform: "translate(0, 6)" }} padding={{ left: 12, right: 12 }} intervalType="equidistantPreserveStart" />
                                  <YAxis tickFormatter={(v: number) => `${Math.round(v)}ms`} width={56} />
                                  <ChartTooltip
                                    content={({ active, payload }) => {
                                      if (!active || !payload?.length) return null
                                      const point = payload[0]
                                      return (
                                        <div className="border border-border bg-secondary px-3 py-2 font-mono text-xs">
                                          <p className="text-muted-fg">{point?.payload?.time}</p>
                                          <p className="font-semibold text-primary">{point?.value}ms</p>
                                        </div>
                                      )
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="response_time"
                                    stroke="var(--chart-1)"
                                    fill="var(--chart-1)"
                                    fillOpacity={0.15}
                                    strokeWidth={2}
                                  />
                                </AreaChart>
                              </Chart>

                              {percentiles && (
                                <div className="mt-4 grid grid-cols-4 border-t border-border pt-4 text-center">
                                  {(
                                    [
                                      { label: "P25", value: percentiles.p25 },
                                      { label: "P50", value: percentiles.p50 },
                                      { label: "P75", value: percentiles.p75 },
                                      { label: "P95", value: percentiles.p95 },
                                    ] as const
                                  ).map(({ label, value }, i) => (
                                    <div key={label} className={i > 0 ? "border-l border-border" : ""}>
                                      <p className="text-xl font-medium text-fg">{value} ms</p>
                                      <p className="mt-0.5 text-xs uppercase tracking-widest text-muted-fg">
                                        {label}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )
                        })()
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-fg">
                          No response time data available yet.
                        </p>
                      )}
                    </WhenVisible>
                  </div>
                </div>
              </div>

              {/* Right: sidebar */}
              <div className="space-y-4">

                {/* SSL Certificate */}
                {monitor.type === "http" && monitor.ssl_monitoring_enabled && (
                  <div className="border border-border p-4">
                    <SectionLabel>SSL Certificate</SectionLabel>
                    <WhenVisible
                      data="sslCertificate"
                      fallback={<div className="mt-3 h-20 animate-pulse rounded-sm bg-muted" />}
                    >
                      {sslCertificate ? (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-medium ${sslCertificate.is_valid ? "text-success" : "text-danger"}`}
                            >
                              {sslCertificate.is_valid ? "Valid" : "Invalid"}
                            </span>
                            <span className={`text-sm ${sslExpiryColor(sslCertificate.days_until_expiry)}`}>
                              {sslCertificate.days_until_expiry !== null
                                ? sslCertificate.days_until_expiry <= 0
                                  ? "Expired"
                                  : `${sslCertificate.days_until_expiry}d remaining`
                                : "Unknown"}
                            </span>
                          </div>

                          {sslCertificate.valid_from &&
                            sslCertificate.valid_to &&
                            sslCertificate.days_until_expiry !== null && (
                              (() => {
                                const totalDays = Math.max(
                                  1,
                                  Math.round(
                                    (new Date(sslCertificate.valid_to).getTime() -
                                      new Date(sslCertificate.valid_from).getTime()) /
                                      86400000,
                                  ),
                                )
                                const pct = Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Math.round((sslCertificate.days_until_expiry / totalDays) * 100),
                                  ),
                                )
                                return (
                                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className={`h-full rounded-full ${
                                        sslCertificate.days_until_expiry <= 14
                                          ? "bg-danger"
                                          : sslCertificate.days_until_expiry <= 30
                                            ? "bg-warning"
                                            : "bg-success"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                )
                              })()
                            )}

                          {sslCertificate.issuer && (
                            <div>
                              <p className="text-xs text-muted-fg">Issuer</p>
                              <p className="truncate text-sm text-fg">{sslCertificate.issuer}</p>
                            </div>
                          )}
                          {sslCertificate.valid_to && (
                            <div>
                              <p className="text-xs text-muted-fg">Expires</p>
                              <p className="text-sm text-fg">
                                {new Date(sslCertificate.valid_to).toLocaleDateString(undefined, {
                                  dateStyle: "medium",
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-fg">No SSL data yet.</p>
                      )}
                    </WhenVisible>
                  </div>
                )}

                {/* Recent Incidents */}
                <div className="border border-border p-4">
                  <SectionLabel>Incidents</SectionLabel>
                  <WhenVisible
                    data="incidents"
                    fallback={<div className="mt-3 h-16 animate-pulse rounded-sm bg-muted" />}
                  >
                    {incidents && incidents.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {incidents.slice(0, 5).map((incident) => (
                          <div key={incident.id} className="flex items-start justify-between gap-2 py-1">
                            <div className="min-w-0">
                              <p className="truncate text-sm text-fg">{incident.cause ?? "Outage"}</p>
                              <p className="text-xs text-muted-fg">
                                {formatDuration(incident.started_at, incident.resolved_at)}
                                {incident.resolved_at ? " · resolved" : " · ongoing"}
                              </p>
                            </div>
                            <span
                              className={`mt-0.5 shrink-0 text-xs font-bold ${
                                incident.resolved_at ? "text-success" : "text-danger"
                              }`}
                            >
                              {incident.resolved_at ? "✓" : "●"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-fg">No incidents recorded.</p>
                    )}
                  </WhenVisible>
                </div>

                {/* Notification Channels */}
                {monitor.notification_channels && monitor.notification_channels.length > 0 && (
                  <div className="border border-border p-4">
                    <SectionLabel>Notification channels</SectionLabel>
                    <div className="mt-3 space-y-1.5">
                      {monitor.notification_channels.map((ch) => (
                        <div key={ch.id} className="flex items-center justify-between">
                          <span className="text-sm text-fg">{ch.name}</span>
                          <span className="text-xs text-muted-fg">{ch.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Log */}
                <div className="border border-border p-4">
                  <SectionLabel>Live log</SectionLabel>
                  <WhenVisible
                    data="heartbeats"
                    fallback={<div className="mt-3 h-32 animate-pulse rounded-sm bg-muted" />}
                  >
                    {heartbeats && heartbeats.data.length > 0 ? (
                      <div className="mt-3 space-y-1.5 font-mono">
                        {heartbeats.data.slice(0, 15).map((hb) => (
                          <div key={hb.id} className="flex items-start gap-2.5 text-xs">
                            <span className="shrink-0 text-muted-fg">
                              {new Date(hb.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                            <span
                              className={`shrink-0 font-semibold ${
                                hb.status === "up" ? "text-success" : "text-danger"
                              }`}
                            >
                              {hb.status.toUpperCase()}
                            </span>
                            <span className="truncate text-muted-fg">
                              {hb.response_time ? `${hb.response_time}ms` : hb.message ?? "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-fg">No heartbeats yet.</p>
                    )}
                  </WhenVisible>
                </div>
              </div>
            </div>
          </TabPanel>

          {/* ── Heartbeats tab ── */}
          <TabPanel id="heartbeats" className="pt-4">
            <div className="border border-border">
              <WhenVisible
                fallback={<div className="h-64 animate-pulse rounded-sm bg-muted m-4" />}
                data="heartbeats"
              >
                {heartbeats && heartbeats.data.length > 0 ? (
                  <div>
                    <Table aria-label="Heartbeats">
                      <TableHeader>
                        <TableColumn isRowHeader>Status</TableColumn>
                        <TableColumn>Status Code</TableColumn>
                        <TableColumn>Response Time</TableColumn>
                        <TableColumn>Time</TableColumn>
                      </TableHeader>
                      <TableBody items={heartbeats.data}>
                        {(hb) => (
                          <TableRow id={hb.id}>
                            <TableCell>
                              <Badge
                                intent={
                                  hb.status === "up"
                                    ? "success"
                                    : hb.status === "down"
                                      ? "danger"
                                      : "warning"
                                }
                              >
                                {hb.status.charAt(0).toUpperCase() + hb.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{hb.status_code ?? "—"}</TableCell>
                            <TableCell>
                              {hb.response_time ? `${hb.response_time}ms` : "—"}
                            </TableCell>
                            <TableCell>
                              {new Date(hb.created_at).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {(heartbeats.meta?.last_page ?? 1) > 1 && (
                      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-fg">
                        <span>
                          Page {heartbeats.meta?.current_page} of {heartbeats.meta?.last_page}
                          {(heartbeats.meta?.total ?? 0) > 0 && ` · ${heartbeats.meta.total} total`}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            intent="outline"
                            size="sm"
                            isDisabled={(heartbeats.meta?.current_page ?? 1) <= 1}
                            onPress={() =>
                              router.reload({
                                only: ["heartbeats"],
                                data: { page: (heartbeats.meta?.current_page ?? 1) - 1 },
                                preserveUrl: true,
                              })
                            }
                          >
                            Previous
                          </Button>
                          <Button
                            intent="outline"
                            size="sm"
                            isDisabled={
                              (heartbeats.meta?.current_page ?? 1) >= (heartbeats.meta?.last_page ?? 1)
                            }
                            onPress={() =>
                              router.reload({
                                only: ["heartbeats"],
                                data: { page: (heartbeats.meta?.current_page ?? 1) + 1 },
                                preserveUrl: true,
                              })
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-fg">No heartbeats recorded yet.</p>
                )}
              </WhenVisible>
            </div>
          </TabPanel>

          {/* ── Incidents tab ── */}
          <TabPanel id="incidents" className="pt-4">
            <div className="border border-border p-4">
              <WhenVisible
                fallback={<div className="h-64 animate-pulse rounded-sm bg-muted" />}
                data="incidents"
              >
                {incidents && incidents.length > 0 ? (
                  <div className="space-y-3">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="flex items-center justify-between border border-border p-4"
                      >
                        <div>
                          <p className="text-sm font-medium">{incident.cause ?? "Unknown cause"}</p>
                          <p className="text-xs text-muted-fg">
                            Started:{" "}
                            {new Date(incident.started_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge intent={incident.resolved_at ? "success" : "danger"}>
                            {incident.resolved_at ? "Resolved" : "Ongoing"}
                          </Badge>
                          <p className="mt-1 text-xs text-muted-fg">
                            Duration: {formatDuration(incident.started_at, incident.resolved_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-fg">
                    No incidents — this service has been running clean.
                  </p>
                )}
              </WhenVisible>
            </div>
          </TabPanel>

          {/* ── SSL tab ── */}
          {monitor.type === "http" && monitor.ssl_monitoring_enabled && (
            <TabPanel id="ssl" className="pt-4">
              <div className="border border-border p-4">
                <WhenVisible
                  fallback={<div className="h-32 animate-pulse rounded-sm bg-muted" />}
                  data="sslCertificate"
                >
                  {sslCertificate ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="border border-border p-4">
                          <p className="text-sm text-muted-fg">Status</p>
                          <p
                            className={`mt-1 text-lg font-semibold ${sslCertificate.is_valid ? "text-success" : "text-danger"}`}
                          >
                            {sslCertificate.is_valid ? "Valid" : "Invalid"}
                          </p>
                        </div>
                        <div className="border border-border p-4">
                          <p className="text-sm text-muted-fg">Days Until Expiry</p>
                          <p
                            className={`mt-1 text-lg font-semibold ${sslExpiryColor(sslCertificate.days_until_expiry)}`}
                          >
                            {sslCertificate.days_until_expiry !== null
                              ? sslCertificate.days_until_expiry <= 0
                                ? "Expired"
                                : `${sslCertificate.days_until_expiry} days`
                              : "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-fg">Issuer</p>
                          <p className="font-medium">{sslCertificate.issuer ?? "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-fg">Subject</p>
                          <p className="font-medium">{sslCertificate.subject ?? "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-fg">Valid From</p>
                          <p className="font-medium">
                            {sslCertificate.valid_from
                              ? new Date(sslCertificate.valid_from).toLocaleDateString(undefined, {
                                  dateStyle: "medium",
                                })
                              : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-fg">Valid To</p>
                          <p className="font-medium">
                            {sslCertificate.valid_to
                              ? new Date(sslCertificate.valid_to).toLocaleDateString(undefined, {
                                  dateStyle: "medium",
                                })
                              : "Unknown"}
                          </p>
                        </div>
                      </div>
                      {sslCertificate.error_message && (
                        <div className="border border-danger/30 bg-danger/5 p-4">
                          <p className="text-sm text-danger">{sslCertificate.error_message}</p>
                        </div>
                      )}
                      {sslCertificate.last_checked_at && (
                        <p className="text-xs text-muted-fg">
                          Last checked:{" "}
                          {new Date(sslCertificate.last_checked_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-fg">
                      No SSL certificate data available yet. The next check will run automatically.
                    </p>
                  )}
                </WhenVisible>
              </div>
            </TabPanel>
          )}
        </Tabs>
      </Container>
    </>
  )
}

MonitorsShow.layout = (page: React.ReactNode) => <AppLayout children={page} />
