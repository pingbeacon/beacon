import AppLayout from "@/layouts/app-layout"
import type { SharedData } from "@/types/shared"
import { Head, router, usePage, WhenVisible } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader, CardAction } from "@/components/ui/card"
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
import { Sheet, SheetContent, SheetHeader, SheetBody } from "@/components/ui/sheet"
import { PencilIcon, PauseIcon, PlayIcon, TrashIcon, InformationCircleIcon } from "@heroicons/react/20/solid"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"
import { TagBadge } from "@/components/tag-badge"
import { Heading } from "@/components/ui/heading"
import { uptimeColor, statusBadgeIntent } from "@/lib/color"
import monitorRoutes from "@/routes/monitors"
import { heartbeatsToTracker, formatInterval } from "@/lib/heartbeats"
import { Chart, CartesianGrid, XAxis, YAxis, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
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
  '1h': '1 Hour',
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
}

export default function MonitorsShow({
  monitor: initialMonitor,
  heartbeats: initialHeartbeats,
  incidents,
  chartData: initialChartData,
  uptimeStats,
  sslCertificate,
  chartPeriod: initialChartPeriod,
}: Props) {
  const { auth } = usePage<SharedData>().props
  const [monitor, setMonitor] = useState(initialMonitor)
  const [heartbeats, setHeartbeats] = useState(initialHeartbeats)
  const [chartData, setChartData] = useState(initialChartData)
  const [chartPeriod, setChartPeriod] = useState(initialChartPeriod ?? '24h')

  useEffect(() => {
    setMonitor(initialMonitor)
  }, [initialMonitor])

  useEffect(() => {
    if (initialHeartbeats) setHeartbeats(initialHeartbeats)
  }, [initialHeartbeats])

  useEffect(() => {
    if (initialChartData) setChartData(initialChartData)
  }, [initialChartData])

  const handlePeriodChange = (period: string) => {
    setChartPeriod(period)
    router.reload({
      only: ['chartData'],
      data: { period },
      preserveScroll: true,
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (chartPeriod === '30d') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
    if (chartPeriod === '7d') {
      return (
        date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      )
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        return {
          ...prev,
          data: [payload.heartbeat, ...prev.data],
        }
      })
      if (payload.heartbeat.response_time !== null && (chartPeriod === '1h' || chartPeriod === '24h')) {
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
      setMonitor((prev) => ({
        ...prev,
        status: payload.newStatus as Monitor["status"],
      }))
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
      <Container className="space-y-6 pt-2 pb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge intent={statusBadgeIntent[monitor.status]} className="text-sm">
                {monitor.status.charAt(0).toUpperCase() + monitor.status.slice(1)}
              </Badge>
              <div>
                <Heading level={2}>{monitor.name}</Heading>
                <p className="text-muted-fg text-sm">
                  {monitor.type.toUpperCase()} ·{" "}
                  {monitor.url || `${monitor.host}${monitor.port ? `:${monitor.port}` : ""}`}
                </p>
              </div>
            </div>
            <CardAction>
              <div className="flex gap-2">
                <Sheet>
                  <Button intent="outline" size="sm">
                    <InformationCircleIcon data-slot="icon" />
                    Details
                  </Button>
                  <SheetContent side="bottom" aria-label="Monitor Details">
                    <SheetHeader title="Monitor Details" description="Uptime statistics and configuration" />
                    <SheetBody className="space-y-6">
                      <div>
                        <h3 className="mb-3 font-medium text-sm">Uptime & Performance</h3>
                        <WhenVisible
                          fallback={
                            <div className="grid gap-4 sm:grid-cols-3">
                              {Array(3)
                                .fill(null)
                                .map((_, i) => (
                                  <div key={i} className="h-20 animate-pulse rounded bg-muted" />
                                ))}
                            </div>
                          }
                          data="uptimeStats"
                        >
                          {uptimeStats ? (
                            <div className="grid gap-4 sm:grid-cols-3">
                              {(
                                [
                                  { label: "24 Hours", uptime: uptimeStats.uptime_24h, avg: uptimeStats.avg_response_24h },
                                  { label: "7 Days", uptime: uptimeStats.uptime_7d, avg: uptimeStats.avg_response_7d },
                                  { label: "30 Days", uptime: uptimeStats.uptime_30d, avg: uptimeStats.avg_response_30d },
                                ] as const
                              ).map((period) => (
                                <div key={period.label} className="rounded-lg border p-4 text-center">
                                  <p className="text-muted-fg text-sm">{period.label}</p>
                                  <p className={`mt-1 font-bold text-2xl ${uptimeColor(period.uptime)}`}>
                                    {period.uptime}%
                                  </p>
                                  <p className="mt-1 text-muted-fg text-xs">
                                    {period.avg !== null ? `${Math.round(period.avg)}ms avg` : "No data"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="py-8 text-center text-muted-fg">No data available yet.</p>
                          )}
                        </WhenVisible>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border p-4">
                          <p className="text-muted-fg text-sm">Check Interval</p>
                          <p className="mt-1 font-semibold text-2xl">{formatInterval(monitor.interval)}</p>
                        </div>
                        <div className="rounded-lg border p-4">
                          <p className="text-muted-fg text-sm">Timeout</p>
                          <p className="mt-1 font-semibold text-2xl">{formatInterval(monitor.timeout)}</p>
                        </div>
                      </div>
                    </SheetBody>
                  </SheetContent>
                </Sheet>
                <Button
                  intent="outline"
                  size="sm"
                  onPress={() =>
                    router.post(monitorRoutes.toggle.url(monitor.id), {}, { preserveScroll: true })
                  }
                >
                  {monitor.is_active ? (
                    <PauseIcon data-slot="icon" />
                  ) : (
                    <PlayIcon data-slot="icon" />
                  )}
                  {monitor.is_active ? "Pause" : "Resume"}
                </Button>
                <Button
                  intent="outline"
                  size="sm"
                  onPress={() => router.visit(monitorRoutes.edit.url(monitor.id))}
                >
                  <PencilIcon data-slot="icon" />
                  Edit
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
            </CardAction>
          </CardHeader>
        </Card>

        <Tabs>
          <TabList>
            <Tab id="overview">Overview</Tab>
            <Tab id="heartbeats">Heartbeats</Tab>
            <Tab id="incidents">Incidents</Tab>
            {monitor.type === "http" && monitor.ssl_monitoring_enabled && (
              <Tab id="ssl">SSL Certificate</Tab>
            )}
          </TabList>

          <TabPanel id="overview" className="space-y-6 pt-4">
            <Card>
              <CardHeader title="Uptime Tracker" description="Last 90 heartbeats" />
              <CardContent>
                <WhenVisible
                  fallback={<div className="h-8 animate-pulse rounded bg-muted" />}
                  data="heartbeats"
                >
                  <Tracker
                    data={trackerData}
                    aria-label={`Uptime history for ${monitor.name} — last 90 checks`}
                  />
                </WhenVisible>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title={`Response Time (${periodLabels[chartPeriod] ?? chartPeriod})`}>
                <CardAction>
                  <div className="flex gap-1">
                    {(['1h', '24h', '7d', '30d'] as const).map((p) => (
                      <Button
                        key={p}
                        intent={chartPeriod === p ? 'secondary' : 'plain'}
                        size="sm"
                        onPress={() => handlePeriodChange(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <WhenVisible
                  fallback={<div className="h-[250px] animate-pulse rounded bg-muted" />}
                  data="chartData"
                >
                  {chartData && chartData.length > 0 ? (() => {
                    const chartPoints = chartData.map((d) => ({
                      time: formatTime(d.created_at),
                      response_time: d.response_time,
                    }))
                    return (
                      <Chart
                        config={chartConfig}
                        data={chartPoints}
                        dataKey="time"
                        containerHeight={250}
                      >
                        <AreaChart data={chartPoints}>
                          <CartesianGrid />
                          <XAxis dataKey="time" />
                          <YAxis tickFormatter={(v: number) => `${v}ms`} />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => `${value}ms`}
                                labelKey="time"
                              />
                            }
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
                    )
                  })() : (
                    <p className="py-8 text-center text-muted-fg">
                      No response time data available yet.
                    </p>
                  )}
                </WhenVisible>
              </CardContent>
            </Card>

            {monitor.tags && monitor.tags.length > 0 && (
              <Card>
                <CardHeader title="Tags" />
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {monitor.tags.map((tag) => (
                      <TagBadge key={tag.id} tag={tag} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabPanel>

          <TabPanel id="heartbeats" className="pt-4">
            <Card>
              <CardContent>
                <WhenVisible
                  fallback={<div className="h-64 animate-pulse rounded bg-muted" />}
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
                              <TableCell>{hb.status_code ?? "-"}</TableCell>
                              <TableCell>
                                {hb.response_time ? `${hb.response_time}ms` : "-"}
                              </TableCell>
                              <TableCell>{new Date(hb.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      {(heartbeats.meta?.last_page ?? 1) > 1 && (
                        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-fg">
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
                    <p className="py-8 text-center text-muted-fg">No heartbeats recorded yet.</p>
                  )}
                </WhenVisible>
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel id="incidents" className="pt-4">
            <Card>
              <CardContent>
                <WhenVisible
                  fallback={<div className="h-64 animate-pulse rounded bg-muted" />}
                  data="incidents"
                >
                  {incidents && incidents.length > 0 ? (
                    <div className="space-y-3">
                      {incidents.map((incident) => (
                        <div
                          key={incident.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {incident.cause ?? "Unknown cause"}
                            </p>
                            <p className="text-muted-fg text-xs">
                              Started: {new Date(incident.started_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
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
                    <p className="py-8 text-center text-muted-fg">No incidents — this service has been running clean.</p>
                  )}
                </WhenVisible>
              </CardContent>
            </Card>
          </TabPanel>

          {monitor.type === "http" && monitor.ssl_monitoring_enabled && (
            <TabPanel id="ssl" className="pt-4">
              <Card>
                <CardHeader title="SSL Certificate" />
                <CardContent>
                  <WhenVisible
                    fallback={<div className="h-32 animate-pulse rounded bg-muted" />}
                    data="sslCertificate"
                  >
                    {sslCertificate ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-lg border p-4">
                            <p className="text-muted-fg text-sm">Status</p>
                            <p className={`mt-1 font-semibold text-lg ${sslCertificate.is_valid ? "text-success" : "text-danger"}`}>
                              {sslCertificate.is_valid ? "Valid" : "Invalid"}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-muted-fg text-sm">Days Until Expiry</p>
                            <p className={`mt-1 font-semibold text-lg ${sslExpiryColor(sslCertificate.days_until_expiry)}`}>
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
                                ? new Date(sslCertificate.valid_from).toLocaleDateString(undefined, { dateStyle: "medium" })
                                : "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-fg text-sm">Valid To</p>
                            <p className="font-medium">
                              {sslCertificate.valid_to
                                ? new Date(sslCertificate.valid_to).toLocaleDateString(undefined, { dateStyle: "medium" })
                                : "Unknown"}
                            </p>
                          </div>
                        </div>
                        {sslCertificate.error_message && (
                          <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                            <p className="text-danger text-sm">{sslCertificate.error_message}</p>
                          </div>
                        )}
                        {sslCertificate.last_checked_at && (
                          <p className="text-muted-fg text-xs">
                            Last checked: {new Date(sslCertificate.last_checked_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="py-8 text-center text-muted-fg">
                        No SSL certificate data available yet. The next check will run automatically.
                      </p>
                    )}
                  </WhenVisible>
                </CardContent>
              </Card>
            </TabPanel>
          )}
        </Tabs>
      </Container>
    </>
  )
}

MonitorsShow.layout = (page: React.ReactNode) => <AppLayout children={page} />
