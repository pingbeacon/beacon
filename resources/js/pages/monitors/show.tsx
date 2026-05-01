import {
  ArrowPathIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  TrashIcon,
} from "@heroicons/react/20/solid"
import { Head, router, WhenVisible } from "@inertiajs/react"
import { useEffect, useRef, useState } from "react"
import CheckSslCertificateController from "@/actions/App/Http/Controllers/CheckSslCertificateController"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"
import { TagBadge } from "@/components/tag-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import AppLayout from "@/layouts/app-layout"
import { statusBadgeIntent, uptimeColor } from "@/lib/color"
import { formatInterval } from "@/lib/heartbeats"
import { type AssertionRowPayload, AssertionsTab } from "@/pages/monitors/components/assertions-tab"
import { EscalationTimeline } from "@/pages/monitors/components/escalation-timeline"
import { IncidentsTab } from "@/pages/monitors/components/incidents-tab"
import { NotificationDeliveryLog } from "@/pages/monitors/components/notification-delivery-log"
import { OverviewTab } from "@/pages/monitors/components/overview-tab"
import { ResponseTab, type ResponseTabPeriod } from "@/pages/monitors/components/response-tab"
import { RoutingRulesTable } from "@/pages/monitors/components/routing-rules-table"
import monitorRoutes from "@/routes/monitors"
import { hydrate, subscribeToEvents, useMonitor } from "@/stores/monitor-realtime"
import type {
  ActiveEscalation,
  ChartDataPoint,
  EscalationPolicy,
  Heartbeat,
  Incident,
  IncidentHeatmapPayload,
  Monitor,
  NotificationChannel,
  NotificationRoute,
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
  incidentHeatmap?: IncidentHeatmapPayload | null
  chartData?: ChartDataPoint[]
  prevChartData?: ChartDataPoint[]
  uptimeStats?: UptimeStats
  sslCertificate?: SslCertificate | null
  chartPeriod?: string
  teamNotificationChannels?: NotificationChannel[]
  notificationRoutes?: NotificationRoute[]
  escalationPolicy?: EscalationPolicy | null
  activeEscalation?: ActiveEscalation | null
  assertions?: AssertionRowPayload[]
  canUpdateAssertions?: boolean
}

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function sslExpiryColor(days: number | null): string {
  if (days === null) return "text-muted-foreground"
  if (days <= 0) return "text-destructive"
  if (days <= 14) return "text-warning"
  return "text-success"
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-medium text-primary text-xs uppercase tracking-widest">{children}</p>
}

export default function MonitorsShow({
  monitor: initialMonitor,
  heartbeats: initialHeartbeats,
  incidents: initialIncidents,
  incidentHeatmap,
  chartData: initialChartData,
  prevChartData: initialPrevChartData,
  uptimeStats,
  sslCertificate,
  chartPeriod: initialChartPeriod,
  teamNotificationChannels,
  notificationRoutes,
  escalationPolicy,
  activeEscalation,
  assertions,
  canUpdateAssertions = false,
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
  const [prevChartData, setPrevChartData] = useState(initialPrevChartData)
  const [chartPeriod, setChartPeriod] = useState(initialChartPeriod ?? "24h")
  const [scanningSSL, setScanningSSL] = useState(false)

  const validTabs = [
    "overview",
    "heartbeats",
    "incidents",
    "response",
    "assertions",
    "ssl",
    "notifications",
  ]
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

  useEffect(() => {
    if (initialPrevChartData) setPrevChartData(initialPrevChartData)
  }, [initialPrevChartData])

  const handlePeriodChange = (period: string) => {
    setChartPeriod(period)
    router.reload({
      only: ["chartData", "prevChartData"],
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
  const assertionRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (assertionRefreshTimerRef.current) clearTimeout(assertionRefreshTimerRef.current)
    }
  }, [])

  useEffect(() => {
    return subscribeToEvents((event) => {
      if (event.payload.monitorId !== monitorId) return
      if (event.type === "heartbeat") {
        // Debounce-refetch the assertions deferred prop so the per-rule
        // pass/fail strip on the Response + Assertions tabs reflects the
        // assertion_results emitted by the just-landed heartbeat.
        if (assertionRefreshTimerRef.current) clearTimeout(assertionRefreshTimerRef.current)
        assertionRefreshTimerRef.current = setTimeout(() => {
          router.reload({ only: ["assertions"], preserveScroll: true })
        }, 1500)

        if (
          event.payload.heartbeat.response_time !== null &&
          (chartPeriod === "1h" || chartPeriod === "24h")
        ) {
          const windowMs = chartPeriod === "1h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
          const newPoint = {
            created_at: event.payload.heartbeat.created_at,
            response_time: event.payload.heartbeat.response_time,
            status: event.payload.heartbeat.status,
          }
          const newPointMs = new Date(newPoint.created_at).getTime()
          setChartData((prev) => {
            if (!prev) return prev
            const cutoff = newPointMs - windowMs
            const trimmed = prev.filter((p) => new Date(p.created_at).getTime() >= cutoff)
            return [...trimmed, newPoint]
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
              <p className="mt-0.5 text-muted-foreground text-sm">
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
                <p className="text-muted-foreground text-xs uppercase tracking-widest">
                  30d Uptime
                </p>
                <p
                  className={`mt-1 font-medium text-2xl ${uptimeStats ? uptimeColor(uptimeStats.uptime_30d) : "text-foreground"}`}
                >
                  {uptimeStats ? `${uptimeStats.uptime_30d}%` : "—"}
                </p>
              </div>
              <div className="border-border border-r p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-widest">
                  Avg Response · 24h
                </p>
                <p className="mt-1 font-medium text-2xl text-foreground">
                  {uptimeStats?.avg_response_24h != null
                    ? `${Math.round(uptimeStats.avg_response_24h)} ms`
                    : "—"}
                </p>
              </div>
              <div className="border-border border-r p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-widest">
                  Avg Response · 30d
                </p>
                <p className="mt-1 font-medium text-2xl text-foreground">
                  {uptimeStats?.avg_response_30d != null
                    ? `${Math.round(uptimeStats.avg_response_30d)} ms`
                    : "—"}
                </p>
              </div>
            </WhenVisible>
            <div className="p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-widest">Last Check</p>
              <p className="mt-1 font-medium text-2xl text-foreground">
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
            <Tab id="response">Response</Tab>
            <Tab id="assertions">Assertions</Tab>
            {monitor.type === "http" && monitor.ssl_monitoring_enabled && (
              <Tab id="ssl">SSL Certificate</Tab>
            )}
            <Tab id="notifications">Notifications</Tab>
          </TabList>

          {/* ── Overview ── */}
          <TabPanel id="overview" className="pt-6">
            <OverviewTab
              monitor={monitor}
              liveHeartbeats={liveHeartbeats}
              chartData={chartData}
              chartPeriod={chartPeriod}
              onPeriodChange={handlePeriodChange}
              formatChartTime={formatTime}
              sslCertificate={sslCertificate}
              incidents={incidents}
              scanningSSL={scanningSSL}
              onScanSSL={setScanningSSL}
            />
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
                              {hb.response_time != null ? `${hb.response_time}ms` : "—"}
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
                      <div className="flex items-center justify-between border-border border-t px-4 py-3 text-muted-foreground text-sm">
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
                  <p className="py-8 text-center text-muted-foreground text-sm">
                    No heartbeats recorded yet.
                  </p>
                )}
              </WhenVisible>
            </div>
          </TabPanel>

          {/* ── Incidents tab ── */}
          <TabPanel id="incidents" className="pt-4">
            <WhenVisible
              fallback={<div className="h-64 animate-pulse rounded-sm bg-muted" />}
              data={["incidents", "incidentHeatmap"]}
            >
              <IncidentsTab incidents={incidents ?? []} heatmap={incidentHeatmap ?? null} />
            </WhenVisible>
          </TabPanel>

          {/* ── Response tab ── */}
          <TabPanel id="response" className="pt-4">
            <ResponseTab
              monitorId={monitor.id}
              period={(chartPeriod as ResponseTabPeriod) ?? "24h"}
              onPeriodChange={(p) => handlePeriodChange(p)}
              chartData={chartData ?? []}
              prevChartData={prevChartData ?? []}
              heartbeats={liveHeartbeats}
              assertions={assertions ?? []}
            />
          </TabPanel>

          {/* ── Assertions tab ── */}
          <TabPanel id="assertions" className="pt-4">
            <WhenVisible
              fallback={<div className="h-64 animate-pulse rounded-sm bg-muted" />}
              data="assertions"
            >
              <AssertionsTab
                monitorId={monitor.id}
                assertions={assertions}
                canUpdate={canUpdateAssertions}
              />
            </WhenVisible>
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
                          <p className="text-muted-foreground text-sm">Status</p>
                          <p
                            className={`mt-1 font-semibold text-lg ${sslCertificate.is_valid ? "text-success" : "text-destructive"}`}
                          >
                            {sslCertificate.is_valid ? "Valid" : "Invalid"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border p-4">
                          <p className="text-muted-foreground text-sm">Days Until Expiry</p>
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
                          <p className="text-muted-foreground text-sm">Issuer</p>
                          <p className="font-medium">{sslCertificate.issuer ?? "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Subject</p>
                          <p className="font-medium">{sslCertificate.subject ?? "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Valid From</p>
                          <p className="font-medium">
                            {sslCertificate.valid_from
                              ? new Date(sslCertificate.valid_from).toLocaleDateString(undefined, {
                                  dateStyle: "medium",
                                })
                              : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Valid To</p>
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
                        <div className="border border-destructive/30 bg-destructive/5 p-4">
                          <p className="text-destructive text-sm">{sslCertificate.error_message}</p>
                        </div>
                      )}
                      {sslCertificate.last_checked_at && (
                        <p className="text-muted-foreground text-xs">
                          Last checked:{" "}
                          {new Date(sslCertificate.last_checked_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground text-sm">
                      No SSL certificate data available yet. The next check will run automatically.
                    </p>
                  )}
                </WhenVisible>
              </div>
            </TabPanel>
          )}

          {/* ── Notifications tab ── */}
          <TabPanel id="notifications" className="pt-4">
            <div className="space-y-8">
              <RoutingRulesTable
                monitorId={monitor.id}
                rules={notificationRoutes ?? []}
                channels={teamNotificationChannels ?? []}
              />
              <EscalationTimeline
                policy={escalationPolicy ?? null}
                channels={teamNotificationChannels ?? []}
                active={activeEscalation ?? null}
              />
              <NotificationDeliveryLog monitorId={monitor.id} />
            </div>
          </TabPanel>
        </Tabs>
      </Container>
    </>
  )
}

MonitorsShow.layout = (page: React.ReactNode) => <AppLayout children={page} />
