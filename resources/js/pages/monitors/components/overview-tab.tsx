import { ArrowPathIcon } from "@heroicons/react/20/solid"
import { router, WhenVisible } from "@inertiajs/react"
import { Area, AreaChart } from "recharts"
import CheckSslCertificateController from "@/actions/App/Http/Controllers/CheckSslCertificateController"
import {
  Eyebrow,
  type HeartbeatStatus,
  StatusDot,
  StatusPill,
  Terminal,
} from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { CartesianGrid, Chart, ChartTooltip, XAxis, YAxis } from "@/components/ui/chart"
import { isSlow } from "@/lib/heartbeats"
import {
  type HeartbeatTooltipBucket,
  HeartbeatTooltipStrip,
} from "@/pages/monitors/components/heartbeat-tooltip-strip"
import type { ChartDataPoint, Heartbeat, Incident, Monitor, SslCertificate } from "@/types/monitor"

const UPTIME_BUCKET_COUNT = 90

const chartConfig = {
  response_time: {
    label: "Response Time",
    color: "var(--chart-1)",
  },
}

const periodLabels: Record<string, string> = {
  "1h": "1h",
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
}

export interface OverviewTabProps {
  monitor: Monitor
  liveHeartbeats: Heartbeat[]
  chartData: ChartDataPoint[] | undefined
  chartPeriod: string
  onPeriodChange: (period: string) => void
  formatChartTime: (iso: string) => string
  sslCertificate: SslCertificate | null | undefined
  incidents: Incident[] | undefined
  scanningSSL: boolean
  onScanSSL: (scanning: boolean) => void
}

function uptimeBuckets(heartbeats: Heartbeat[], monitorStatus: string): HeartbeatTooltipBucket[] {
  if (monitorStatus === "paused") {
    return Array.from({ length: UPTIME_BUCKET_COUNT }, () => ({
      status: "paused" as HeartbeatStatus,
      heartbeat: null,
      emptyLabel: "paused",
    }))
  }

  const recent = heartbeats.slice(-UPTIME_BUCKET_COUNT)
  const padCount = Math.max(0, UPTIME_BUCKET_COUNT - recent.length)
  const padding: HeartbeatTooltipBucket[] = Array.from({ length: padCount }, () => ({
    status: "pending" as HeartbeatStatus,
    heartbeat: null,
    emptyLabel: "no data",
  }))

  const upTimes = recent
    .filter((hb) => hb.status === "up" && hb.response_time != null)
    .map((hb) => hb.response_time as number)
  const avg = upTimes.length > 0 ? upTimes.reduce((a, b) => a + b, 0) / upTimes.length : 0

  const filled: HeartbeatTooltipBucket[] = recent.map((hb) => {
    if (hb.status === "down") return { status: "down" as HeartbeatStatus, heartbeat: hb }
    if (isSlow(hb, avg)) return { status: "degraded" as HeartbeatStatus, heartbeat: hb }
    return { status: "up" as HeartbeatStatus, heartbeat: hb }
  })
  return [...padding, ...filled]
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

function computePercentiles(
  data: ChartDataPoint[],
): { p50: number; p90: number; p95: number; p99: number } | null {
  const sorted = data
    .filter((d) => d.response_time !== null)
    .map((d) => d.response_time as number)
    .sort((a, b) => a - b)
  if (!sorted.length) return null
  const at = (p: number) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))
    return sorted[idx]
  }
  return { p50: at(0.5), p90: at(0.9), p95: at(0.95), p99: at(0.99) }
}

function formatMs(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`
  return `${value} ms`
}

function percentileIntent(label: "p50" | "p90" | "p95" | "p99", value: number) {
  if (label === "p99" && value >= 3000) return "danger" as const
  if ((label === "p90" || label === "p95") && value >= 1000) return "warning" as const
  return "neutral" as const
}

function intentTextClass(intent: "neutral" | "warning" | "danger"): string {
  if (intent === "danger") return "text-destructive"
  if (intent === "warning") return "text-warning"
  return "text-foreground"
}

function sslDaysIntent(days: number | null): "warning" | "danger" | "neutral" | "muted" {
  if (days === null) return "muted"
  if (days <= 0) return "danger"
  if (days <= 14) return "warning"
  return "neutral"
}

function sslDaysClass(days: number | null): string {
  const intent = sslDaysIntent(days)
  if (intent === "danger") return "text-destructive"
  if (intent === "warning") return "text-warning"
  if (intent === "muted") return "text-muted-foreground"
  return "text-success"
}

function UptimePanel({
  monitor,
  liveHeartbeats,
}: {
  monitor: Monitor
  liveHeartbeats: Heartbeat[]
}) {
  const buckets = uptimeBuckets(liveHeartbeats, monitor.status)
  return (
    <div data-slot="overview-uptime" className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Eyebrow>uptime tracker</Eyebrow>
          <p className="mt-1 text-muted-foreground text-xs">Last 90 heartbeats</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <StatusDot status="up" /> up
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot status="degraded" /> degraded
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot status="down" /> down
          </span>
        </div>
      </div>
      <div className="mt-4">
        <WhenVisible
          fallback={<div className="h-11 animate-pulse rounded-sm bg-muted" />}
          data="heartbeats"
        >
          <HeartbeatTooltipStrip
            buckets={buckets}
            height={44}
            ariaLabel={`Uptime history for ${monitor.name} — last ${UPTIME_BUCKET_COUNT} checks`}
          />
        </WhenVisible>
      </div>
    </div>
  )
}

function ResponsePanel({
  chartPeriod,
  chartData,
  onPeriodChange,
  formatChartTime,
}: {
  chartPeriod: string
  chartData: ChartDataPoint[] | undefined
  onPeriodChange: (period: string) => void
  formatChartTime: (iso: string) => string
}) {
  return (
    <div data-slot="overview-response" className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div>
          <Eyebrow>response time</Eyebrow>
          <p className="mt-0.5 text-muted-foreground text-xs">
            ms · {periodLabels[chartPeriod] ?? chartPeriod}
          </p>
        </div>
        <div className="flex gap-1">
          {(["1h", "24h", "7d", "30d"] as const).map((p) => (
            <Button
              key={p}
              intent={chartPeriod === p ? "secondary" : "plain"}
              size="sm"
              onPress={() => onPeriodChange(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>
      <div className="p-5">
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
              const minTime = chartPoints[0]?.time ?? 0
              const maxTime = chartPoints[chartPoints.length - 1]?.time ?? 0
              const TICK_COUNT = 5
              const xTicks =
                chartPoints.length <= TICK_COUNT
                  ? chartPoints.map((p) => p.time)
                  : Array.from(
                      { length: TICK_COUNT },
                      (_, i) =>
                        chartPoints[Math.round((i * (chartPoints.length - 1)) / (TICK_COUNT - 1))]
                          .time,
                    )
              return (
                <Chart config={chartConfig} data={chartPoints} dataKey="time" containerHeight={200}>
                  <AreaChart data={chartPoints} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid />
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={[minTime, maxTime]}
                      ticks={xTicks}
                      tickFormatter={(v: number) => formatChartTime(new Date(v).toISOString())}
                      tick={{ transform: "translate(0, 6)" }}
                      padding={{ left: 12, right: 12 }}
                    />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v)}ms`} width={56} />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const point = payload[0]
                        return (
                          <div className="rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs">
                            <p className="text-muted-foreground">
                              {point?.payload?.time
                                ? formatChartTime(new Date(point.payload.time).toISOString())
                                : null}
                            </p>
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
              )
            })()
          ) : (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No response time data available yet.
            </p>
          )}
        </WhenVisible>
      </div>
    </div>
  )
}

function DistributionPanel({ chartData }: { chartData: ChartDataPoint[] | undefined }) {
  if (chartData === undefined) {
    return (
      <div data-slot="overview-distribution" className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>response distribution</Eyebrow>
          <span className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["p50", "p90", "p95", "p99"] as const).map((label) => (
            <div
              key={label}
              className="rounded-md border border-border p-3.5"
              data-percentile={label}
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {label.toUpperCase()}
              </p>
              <div className="mt-1.5 h-7 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const percentiles = computePercentiles(chartData)
  const count = chartData.filter((d) => d.response_time !== null).length

  return (
    <div data-slot="overview-distribution" className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <Eyebrow>response distribution</Eyebrow>
        <span className="text-muted-foreground text-xs">
          {count > 0 ? `${count} checks` : "no data"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["p50", "p90", "p95", "p99"] as const).map((label) => {
          const value = percentiles ? percentiles[label] : null
          const intent = value !== null && percentiles ? percentileIntent(label, value) : "neutral"
          return (
            <div
              key={label}
              className="rounded-md border border-border p-3.5"
              data-percentile={label}
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {label.toUpperCase()}
              </p>
              <p className={`mt-1.5 font-medium text-xl tabular-nums ${intentTextClass(intent)}`}>
                {value !== null ? formatMs(value) : "—"}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SslPanel({
  monitor,
  sslCertificate,
  scanningSSL,
  onScanSSL,
}: {
  monitor: Monitor
  sslCertificate: SslCertificate | null | undefined
  scanningSSL: boolean
  onScanSSL: (scanning: boolean) => void
}) {
  return (
    <div data-slot="overview-ssl" className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>ssl certificate</Eyebrow>
        <div className="flex items-center gap-2">
          {sslCertificate ? (
            <StatusPill status={sslCertificate.is_valid ? "up" : "down"} data-testid="ssl-pill">
              {sslCertificate.is_valid ? "valid" : "invalid"}
            </StatusPill>
          ) : null}
          <Button
            intent="plain"
            size="sm"
            isDisabled={scanningSSL}
            onPress={() => {
              onScanSSL(true)
              router.post(
                CheckSslCertificateController.url(monitor.id),
                {},
                {
                  preserveScroll: true,
                },
              )
            }}
          >
            <ArrowPathIcon data-slot="icon" className={scanningSSL ? "animate-spin" : ""} />
            {scanningSSL ? "Scanning…" : "Scan now"}
          </Button>
        </div>
      </div>

      <WhenVisible
        data="sslCertificate"
        fallback={<div className="mt-4 h-20 animate-pulse rounded-sm bg-muted" />}
      >
        {sslCertificate ? (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs">cn</span>
              <span className="truncate text-foreground" title={sslCertificate.subject ?? ""}>
                {sslCertificate.subject ?? "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs">issuer</span>
              <span className="truncate text-foreground" title={sslCertificate.issuer ?? ""}>
                {sslCertificate.issuer ?? "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs">expires</span>
              <span className={sslDaysClass(sslCertificate.days_until_expiry)}>
                {sslCertificate.days_until_expiry !== null
                  ? sslCertificate.days_until_expiry <= 0
                    ? "expired"
                    : `in ${sslCertificate.days_until_expiry} days`
                  : "unknown"}
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
                  Math.min(100, Math.round((sslCertificate.days_until_expiry / totalDays) * 100)),
                )
                return (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        sslCertificate.days_until_expiry <= 14
                          ? "bg-destructive"
                          : sslCertificate.days_until_expiry <= 30
                            ? "bg-warning"
                            : "bg-success"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )
              })()}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground text-sm">No SSL data yet.</p>
        )}
      </WhenVisible>
    </div>
  )
}

function IncidentsPanel({ incidents }: { incidents: Incident[] | undefined }) {
  return (
    <div data-slot="overview-incidents" className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <Eyebrow>recent incidents</Eyebrow>
        <span className="text-muted-foreground text-xs">last 30 days</span>
      </div>
      <WhenVisible
        data="incidents"
        fallback={<div className="mt-4 h-16 animate-pulse rounded-sm bg-muted" />}
      >
        {incidents && incidents.length > 0 ? (
          <div className="mt-3 flex flex-col">
            {incidents.slice(0, 5).map((incident, idx) => {
              const resolved = incident.resolved_at !== null
              return (
                <div
                  key={incident.id}
                  className={`flex items-center gap-2.5 py-2.5 text-xs ${
                    idx > 0 ? "border-border border-t" : ""
                  }`}
                >
                  <span className="w-12 shrink-0 text-muted-foreground tabular-nums">
                    #{incident.id}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {incident.cause ?? "Outage"}
                  </span>
                  <StatusPill status={resolved ? "resolved" : "down"}>
                    {resolved ? "resolved" : "active"}
                  </StatusPill>
                  <span className="w-16 shrink-0 text-right text-muted-foreground tabular-nums">
                    {formatDuration(incident.started_at, incident.resolved_at)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground text-sm">No incidents recorded.</p>
        )}
      </WhenVisible>
    </div>
  )
}

function ChannelsPanel({ monitor, channels }: { monitor: Monitor; channels?: any[] }) {
  const channelList = channels ?? monitor.notification_channels ?? []

  return (
    <div data-slot="overview-channels" className="rounded-lg border border-border bg-card p-5">
      <Eyebrow>notification channels</Eyebrow>
      <p className="mt-1 mb-3 text-muted-foreground text-xs">
        Fires on down, degraded, and recovery
      </p>
      {channelList.length > 0 ? (
        <div className="flex flex-col">
          {channelList.map((ch, idx) => (
            <div
              key={ch.id}
              className={`flex items-center gap-2.5 py-2 text-xs ${
                idx > 0 ? "border-border border-t" : ""
              }`}
            >
              <StatusDot status={ch.is_enabled ? "up" : "unknown"} />
              <span className="w-20 shrink-0 truncate text-foreground">{ch.type}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{ch.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {ch.is_enabled ? "enabled" : "disabled"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No notification channels configured.</p>
      )}
    </div>
  )
}

function LiveLogPanel({ liveHeartbeats }: { liveHeartbeats: Heartbeat[] }) {
  const logs = [...liveHeartbeats].reverse().slice(0, 15)
  const connected = logs.length > 0
  return (
    <div data-slot="overview-live-log" className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <Eyebrow>live log</Eyebrow>
        <span className="flex items-center gap-1.5 text-[11px]">
          <StatusDot status={connected ? "up" : "unknown"} />
          <span className={connected ? "text-success" : "text-muted-foreground"}>
            {connected ? "ws://monitor" : "ws://idle"}
          </span>
        </span>
      </div>
      {logs.length > 0 ? (
        <Terminal className="text-[11px] leading-relaxed">
          {logs.map((hb) => {
            const time = new Date(hb.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
            const detail =
              hb.response_time != null
                ? `${hb.status_code ?? "—"} · ${hb.response_time}ms`
                : (hb.message ?? "no body")
            const color = hb.status === "up" ? "text-success" : "text-destructive"
            return (
              <div key={hb.id} className="flex gap-2.5">
                <span className="text-muted-foreground">{time}</span>
                <span className={color}>{hb.status.toUpperCase()}</span>
                <span className="truncate text-foreground/70">{detail}</span>
              </div>
            )
          })}
        </Terminal>
      ) : (
        <Terminal className="text-[11px] text-muted-foreground">
          waiting for first heartbeat…
        </Terminal>
      )}
    </div>
  )
}

export function OverviewTab(props: OverviewTabProps) {
  const { monitor } = props
  return (
    <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
      <div className="flex flex-col gap-4">
        <UptimePanel monitor={monitor} liveHeartbeats={props.liveHeartbeats} />
        <ResponsePanel
          chartPeriod={props.chartPeriod}
          chartData={props.chartData}
          onPeriodChange={props.onPeriodChange}
          formatChartTime={props.formatChartTime}
        />
        <DistributionPanel chartData={props.chartData} />
      </div>
      <div className="flex flex-col gap-4">
        {monitor.type === "http" && monitor.ssl_monitoring_enabled ? (
          <SslPanel
            monitor={monitor}
            sslCertificate={props.sslCertificate}
            scanningSSL={props.scanningSSL}
            onScanSSL={props.onScanSSL}
          />
        ) : null}
        <IncidentsPanel incidents={props.incidents} />
        <ChannelsPanel monitor={monitor} />
        <LiveLogPanel liveHeartbeats={props.liveHeartbeats} />
      </div>
    </div>
  )
}
