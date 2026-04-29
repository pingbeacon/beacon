import {
  ArrowPathIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  TrashIcon,
} from "@heroicons/react/20/solid"
import { Head, router, WhenVisible } from "@inertiajs/react"
import { useEffect, useState } from "react"
import { Area, AreaChart } from "recharts"
import CheckSslCertificateController from "@/actions/App/Http/Controllers/CheckSslCertificateController"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"
import { TagBadge } from "@/components/tag-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CartesianGrid, Chart, ChartTooltip, XAxis, YAxis } from "@/components/ui/chart"
import { Container } from "@/components/ui/container"
import { Heading } from "@/components/ui/heading"
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs"
import { Tracker } from "@/components/ui/tracker"
import AppLayout from "@/layouts/app-layout"
import { statusBadgeIntent, uptimeColor } from "@/lib/color"
import { formatInterval, heartbeatsToTracker } from "@/lib/heartbeats"
import monitorRoutes from "@/routes/monitors"
import { hydrate, subscribeToEvents, useMonitor } from "@/stores/monitor-realtime"
import type {
  ChartDataPoint,
  Heartbeat,
  Incident,
  Monitor,
  SslCertificate,
  UptimeStats,
} from "@/types/monitor"

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
  return <p className="font-medium text-primary text-xs uppercase tracking-widest">{children}</p>
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
  useEffect(() => {
    const seed: Monitor = {
      ...initialMonitor,
      heartbeats:
        initialHeartbeats?.data && initialHeartbeats.meta?.current_page === 1
          ? initialHeartbeats.data
          : initialMonitor.heartbeats,
    }
    hydrate([seed])
  }, [initialMonitor, initialHeartbeats])
  const monitor = useMonitor(initialMonitor.id) ?? initialMonitor
  const [heartbeats, setHeartbeats] = useState(initialHeartbeats)
  const [incidents, setIncidents] = useState(initialIncidents)
  const [chartData, setChartData] = useState(initialChartData)
  const [chartPeriod, setChartPeriod] = useState(initialChartPeriod ?? "24h")
  const [scanningSSL, setScanningSSL] = useState(false)

  const validTabs = ["overview", "heartbeats", "incidents", "ssl"]
  const getInitialTab = () => {
    const tab = new URLSearchParams(window.location.search).get("tab")
    return validTabs.includes(tab ?? "") ? tab! : "overview"
  }
  const [activeTab, setActiveTab] = useState(getInitialTab)

  const handleTabChange = (key: React.Key) => {
    const tab = String(key)
    setActiveTab(tab)
    const params = new URLSearchParams(window.location.search)
    params.set("tab", tab)
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`)
  }

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

  const monitorId = monitor.id

  useEffect(() => {
    return subscribeToEvents((event) => {
      if (event.payload.monitorId !== monitorId) return
      if (event.type === "heartbeat") {
        if (
          event.payload.heartbeat.response_time !== null &&
          (chartPeriod === "1h" || chartPeriod === "24h")
        ) {
          setChartData((prev) => {
            if (!prev) return prev
            return [
              ...prev,
              {
                created_at: event.payload.heartbeat.created_at,
                response_time: event.payload.heartbeat.response_time,
                status: event.payload.heartbeat.status,
              },
            ]
          })
        }
      } else if (event.type === "status") {
        if (event.payload.newStatus === "down" && event.payload.oldStatus !== "down") {
          setIncidents((prev) => [
            {
              id: Date.now(),
              monitor_id: monitorId,
              started_at: new Date().toISOString(),
              resolved_at: null,
              cause: event.payload.message ?? null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Incident,
            ...(prev ?? []),
          ])
        }
        if (event.payload.newStatus === "up" && event.payload.oldStatus === "down") {
          setIncidents((prev) =>
            (prev ?? []).map((inc) =>
              inc.resolved_at === null ? { ...inc, resolved_at: new Date().toISOString() } : inc,
            ),
          )
        }
      }
    })
  }, [monitorId, chartPeriod])

  const liveHeartbeats = monitor.heartbeats ?? []
  const trackerData = heartbeatsToTracker(liveHeartbeats)
  const liveHeartbeatsNewestFirst = [...liveHeartbeats].reverse()
  const heartbeatsTableNewestFirst = heartbeats ? [...heartbeats.data].reverse() : []

  return (
    <>
      <Head title={monitor.name} />
      <Container className="pt-4 pb-8">
        {/* ── Flat header ── */}
        <div className="border-border border-b pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <Badge
                  intent={statusBadgeIntent[monitor.status]}
                  className="shrink-0 font-bold text-xs uppercase tracking-wide"
                >
                  {monitor.status}
                </Badge>
                <Heading level={2} className="truncate font-semibold text-xl leading-tight">
                  {monitor.name}
                </Heading>
              </div>
              <p className="mt-0.5 text-muted-fg text-sm">
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
          <div className="mt-5 grid grid-cols-2 rounded-lg border border-border sm:grid-cols-4">
            <WhenVisible
              data="uptimeStats"
              fallback={Array(3)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="border-border border-r p-4">
                    <div className="mb-2 h-2.5 w-20 animate-pulse rounded-sm bg-muted" />
                    <div className="h-7 w-16 animate-pulse rounded-sm bg-muted" />
                  </div>
                ))}
            >
              <div className="border-border border-r p-4">
                <p className="text-muted-fg text-xs uppercase tracking-widest">30d Uptime</p>
                <p
                  className={`mt-1 font-medium text-2xl ${uptimeStats ? uptimeColor(uptimeStats.uptime_30d) : "text-fg"}`}
                >
                  {uptimeStats ? `${uptimeStats.uptime_30d}%` : "—"}
                </p>
              </div>
              <div className="border-border border-r p-4">
                <p className="text-muted-fg text-xs uppercase tracking-widest">
                  Avg Response · 24h
                </p>
                <p className="mt-1 font-medium text-2xl text-fg">
                  {uptimeStats?.avg_response_24h
                    ? `${Math.round(uptimeStats.avg_response_24h)} ms`
                    : "—"}
                </p>
              </div>
              <div className="border-border border-r p-4">
                <p className="text-muted-fg text-xs uppercase tracking-widest">
                  Avg Response · 30d
                </p>
                <p className="mt-1 font-medium text-2xl text-fg">
                  {uptimeStats?.avg_response_30d
                    ? `${Math.round(uptimeStats.avg_response_30d)} ms`
                    : "—"}
                </p>
              </div>
            </WhenVisible>
            <div className="p-4">
              <p className="text-muted-fg text-xs uppercase tracking-widest">Last Check</p>
              <p className="mt-1 font-medium text-2xl text-fg">
                {monitor.last_checked_at ? formatTimeAgo(monitor.last_checked_at) : "Never"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs className="mt-6" selectedKey={activeTab} onSelectionChange={handleTabChange}>
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
                <div className="rounded-lg border border-border p-4">
                  <SectionLabel>Uptime Tracker</SectionLabel>
                  <p className="mt-1 mb-3 text-muted-fg text-xs">Last 90 heartbeats</p>
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
                <div className="rounded-lg border border-border">
                  <div className="flex items-center justify-between border-border border-b px-4 py-3">
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
                            time: new Date(d.created_at).getTime(),
                            response_time: d.response_time,
                          }))
                          const percentiles = computePercentiles(chartData)
                          const minTime = chartPoints[0]?.time ?? 0
                          const maxTime = chartPoints[chartPoints.length - 1]?.time ?? 0
                          const TICK_COUNT = 5
                          const xTicks =
                            chartPoints.length <= TICK_COUNT
                              ? chartPoints.map((p) => p.time)
                              : Array.from(
                                  { length: TICK_COUNT },
                                  (_, i) =>
                                    chartPoints[
                                      Math.round((i * (chartPoints.length - 1)) / (TICK_COUNT - 1))
                                    ].time,
                                )
                          return (
                            <>
                              <Chart
                                config={chartConfig}
                                data={chartPoints}
                                dataKey="time"
                                containerHeight={200}
                              >
                                <AreaChart
                                  data={chartPoints}
                                  margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                                >
                                  <CartesianGrid />
                                  <XAxis
                                    dataKey="time"
                                    type="number"
                                    domain={[minTime, maxTime]}
                                    ticks={xTicks}
                                    tickFormatter={(v: number) =>
                                      formatTime(new Date(v).toISOString())
                                    }
                                    tick={{ transform: "translate(0, 6)" }}
                                    padding={{ left: 12, right: 12 }}
                                  />
                                  <YAxis
                                    tickFormatter={(v: number) => `${Math.round(v)}ms`}
                                    width={56}
                                  />
                                  <ChartTooltip
                                    content={({ active, payload }) => {
                                      if (!active || !payload?.length) return null
                                      const point = payload[0]
                                      return (
                                        <div className="rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs">
                                          <p className="text-muted-fg">
                                            {point?.payload?.time
                                              ? formatTime(
                                                  new Date(point.payload.time).toISOString(),
                                                )
                                              : null}
                                          </p>
                                          <p className="font-semibold text-primary">
                                            {point?.value}ms
                                          </p>
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
                                <div className="mt-4 grid grid-cols-4 border-border border-t pt-4 text-center">
                                  {(
                                    [
                                      { label: "P25", value: percentiles.p25 },
                                      { label: "P50", value: percentiles.p50 },
                                      { label: "P75", value: percentiles.p75 },
                                      { label: "P95", value: percentiles.p95 },
                                    ] as const
                                  ).map(({ label, value }, i) => (
                                    <div
                                      key={label}
                                      className={i > 0 ? "border-border border-l" : ""}
                                    >
                                      <p className="font-medium text-fg text-xl">{value} ms</p>
                                      <p className="mt-0.5 text-muted-fg text-xs uppercase tracking-widest">
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
                        <p className="py-8 text-center text-muted-fg text-sm">
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
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <SectionLabel>SSL Certificate</SectionLabel>
                      <Button
                        intent="plain"
                        size="sm"
                        isDisabled={scanningSSL}
                        onPress={() => {
                          setScanningSSL(true)
                          router.post(
                            CheckSslCertificateController.url(monitor.id),
                            {},
                            {
                              preserveScroll: true,
                              onFinish: () => setScanningSSL(false),
                            },
                          )
                        }}
                      >
                        <ArrowPathIcon
                          data-slot="icon"
                          className={scanningSSL ? "animate-spin" : ""}
                        />
                        {scanningSSL ? "Scanning…" : "Scan now"}
                      </Button>
                    </div>
                    <WhenVisible
                      data="sslCertificate"
                      fallback={<div className="mt-3 h-20 animate-pulse rounded-sm bg-muted" />}
                    >
                      {sslCertificate ? (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-medium text-sm ${sslCertificate.is_valid ? "text-success" : "text-danger"}`}
                            >
                              {sslCertificate.is_valid ? "Valid" : "Invalid"}
                            </span>
                            <span
                              className={`text-sm ${sslExpiryColor(sslCertificate.days_until_expiry)}`}
                            >
                              {sslCertificate.days_until_expiry !== null
                                ? sslCertificate.days_until_expiry <= 0
                                  ? "Expired"
                                  : `${sslCertificate.days_until_expiry}d remaining`
                                : "Unknown"}
                            </span>
                          </div>

                          {sslCertificate.valid_from &&
                            sslCertificate.valid_to &&
                            sslCertificate.days_until_expiry !== null &&
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
                            })()}

                          {sslCertificate.issuer && (
                            <div>
                              <p className="text-muted-fg text-xs">Issuer</p>
                              <p className="truncate text-fg text-sm">{sslCertificate.issuer}</p>
                            </div>
                          )}
                          {sslCertificate.valid_to && (
                            <div>
                              <p className="text-muted-fg text-xs">Expires</p>
                              <p className="text-fg text-sm">
                                {new Date(sslCertificate.valid_to).toLocaleDateString(undefined, {
                                  dateStyle: "medium",
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-muted-fg text-sm">No SSL data yet.</p>
                      )}
                    </WhenVisible>
                  </div>
                )}

                {/* Recent Incidents */}
                <div className="rounded-lg border border-border p-4">
                  <SectionLabel>Incidents</SectionLabel>
                  <WhenVisible
                    data="incidents"
                    fallback={<div className="mt-3 h-16 animate-pulse rounded-sm bg-muted" />}
                  >
                    {incidents && incidents.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {incidents.slice(0, 5).map((incident) => (
                          <div
                            key={incident.id}
                            className="flex items-start justify-between gap-2 py-1"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-fg text-sm">
                                {incident.cause ?? "Outage"}
                              </p>
                              <p className="text-muted-fg text-xs">
                                {formatDuration(incident.started_at, incident.resolved_at)}
                                {incident.resolved_at ? " · resolved" : " · ongoing"}
                              </p>
                            </div>
                            <span
                              className={`mt-0.5 shrink-0 font-bold text-xs ${
                                incident.resolved_at ? "text-success" : "text-danger"
                              }`}
                            >
                              {incident.resolved_at ? "✓" : "●"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-muted-fg text-sm">No incidents recorded.</p>
                    )}
                  </WhenVisible>
                </div>

                {/* Notification Channels */}
                {monitor.notification_channels && monitor.notification_channels.length > 0 && (
                  <div className="rounded-lg border border-border p-4">
                    <SectionLabel>Notification channels</SectionLabel>
                    <div className="mt-3 space-y-1.5">
                      {monitor.notification_channels.map((ch) => (
                        <div key={ch.id} className="flex items-center justify-between">
                          <span className="text-fg text-sm">{ch.name}</span>
                          <span className="text-muted-fg text-xs">{ch.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Log */}
                <div className="rounded-lg border border-border p-4">
                  <SectionLabel>Live log</SectionLabel>
                  {liveHeartbeats.length > 0 ? (
                    <div className="mt-3 space-y-1.5 font-mono">
                      {liveHeartbeatsNewestFirst.slice(0, 15).map((hb) => (
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
                            {hb.response_time ? `${hb.response_time}ms` : (hb.message ?? "—")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-muted-fg text-sm">No heartbeats yet.</p>
                  )}
                </div>
              </div>
            </div>
          </TabPanel>

          {/* ── Heartbeats tab ── */}
          <TabPanel id="heartbeats" className="pt-4">
            <div className="rounded-lg border border-border">
              <WhenVisible
                fallback={<div className="m-4 h-64 animate-pulse rounded-sm bg-muted" />}
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
                      <TableBody items={heartbeatsTableNewestFirst}>
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
                                timeStyle: "medium",
                              })}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {(heartbeats.meta?.last_page ?? 1) > 1 && (
                      <div className="flex items-center justify-between border-border border-t px-4 py-3 text-muted-fg text-sm">
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
                              (heartbeats.meta?.current_page ?? 1) >=
                              (heartbeats.meta?.last_page ?? 1)
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
                  <p className="py-8 text-center text-muted-fg text-sm">
                    No heartbeats recorded yet.
                  </p>
                )}
              </WhenVisible>
            </div>
          </TabPanel>

          {/* ── Incidents tab ── */}
          <TabPanel id="incidents" className="pt-4">
            <div className="rounded-lg border border-border p-4">
              <WhenVisible
                fallback={<div className="h-64 animate-pulse rounded-sm bg-muted" />}
                data="incidents"
              >
                {incidents && incidents.length > 0 ? (
                  <div className="space-y-3">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div>
                          <p className="font-medium text-sm">{incident.cause ?? "Unknown cause"}</p>
                          <p className="text-muted-fg text-xs">
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
                          <p className="mt-1 text-muted-fg text-xs">
                            Duration: {formatDuration(incident.started_at, incident.resolved_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-fg text-sm">
                    No incidents — this service has been running clean.
                  </p>
                )}
              </WhenVisible>
            </div>
          </TabPanel>

          {/* ── SSL tab ── */}
          {monitor.type === "http" && monitor.ssl_monitoring_enabled && (
            <TabPanel id="ssl" className="pt-4">
              <div className="rounded-lg border border-border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <SectionLabel>SSL Certificate</SectionLabel>
                  <Button
                    intent="outline"
                    size="sm"
                    isDisabled={scanningSSL}
                    onPress={() => {
                      setScanningSSL(true)
                      router.post(
                        CheckSslCertificateController.url(monitor.id),
                        {},
                        {
                          preserveScroll: true,
                          onFinish: () => setScanningSSL(false),
                        },
                      )
                    }}
                  >
                    <ArrowPathIcon data-slot="icon" className={scanningSSL ? "animate-spin" : ""} />
                    {scanningSSL ? "Scanning…" : "Scan now"}
                  </Button>
                </div>
                <WhenVisible
                  fallback={<div className="h-32 animate-pulse rounded-sm bg-muted" />}
                  data="sslCertificate"
                >
                  {sslCertificate ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-border p-4">
                          <p className="text-muted-fg text-sm">Status</p>
                          <p
                            className={`mt-1 font-semibold text-lg ${sslCertificate.is_valid ? "text-success" : "text-danger"}`}
                          >
                            {sslCertificate.is_valid ? "Valid" : "Invalid"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border p-4">
                          <p className="text-muted-fg text-sm">Days Until Expiry</p>
                          <p
                            className={`mt-1 font-semibold text-lg ${sslExpiryColor(sslCertificate.days_until_expiry)}`}
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
                          <p className="text-muted-fg text-sm">Issuer</p>
                          <p className="font-medium">{sslCertificate.issuer ?? "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-fg text-sm">Subject</p>
                          <p className="font-medium">{sslCertificate.subject ?? "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-fg text-sm">Valid From</p>
                          <p className="font-medium">
                            {sslCertificate.valid_from
                              ? new Date(sslCertificate.valid_from).toLocaleDateString(undefined, {
                                  dateStyle: "medium",
                                })
                              : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-fg text-sm">Valid To</p>
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
                          <p className="text-danger text-sm">{sslCertificate.error_message}</p>
                        </div>
                      )}
                      {sslCertificate.last_checked_at && (
                        <p className="text-muted-fg text-xs">
                          Last checked:{" "}
                          {new Date(sslCertificate.last_checked_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-fg text-sm">
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
