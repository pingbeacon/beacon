import { useEffect, useMemo, useState } from "react"
import MonitorPhaseTimingsController from "@/actions/App/Http/Controllers/MonitorPhaseTimingsController"
import { Eyebrow } from "@/components/primitives"
import type { ChartDataPoint, Heartbeat } from "@/types/monitor"

export type ResponseTabPeriod = "1h" | "24h" | "7d" | "30d"

const PERIOD_LABELS: Record<ResponseTabPeriod, string> = {
  "1h": "1h",
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
}

const PERIOD_ORDER: ResponseTabPeriod[] = ["1h", "24h", "7d", "30d"]

export interface PhaseAggregate {
  avg: number | null
  p95: number | null
  count: number
}

export interface PhaseTimingsPayload {
  period: string
  count: number
  phases: {
    dns: PhaseAggregate
    tcp: PhaseAggregate
    tls: PhaseAggregate
    ttfb: PhaseAggregate
    transfer: PhaseAggregate
  }
}

interface Props {
  monitorId: number
  period: ResponseTabPeriod
  onPeriodChange: (next: ResponseTabPeriod) => void
  chartData: ChartDataPoint[] | null | undefined
  prevChartData: ChartDataPoint[] | null | undefined
  heartbeats: Heartbeat[]
  sloMs?: number
  fetcher?: (url: string) => Promise<PhaseTimingsPayload>
}

const defaultFetcher = (url: string): Promise<PhaseTimingsPayload> =>
  fetch(url, { headers: { Accept: "application/json" } }).then((r) => {
    if (!r.ok) {
      throw new Error(`Failed to load phase timings (${r.status})`)
    }
    return r.json()
  })

export function ResponseTab({
  monitorId,
  period,
  onPeriodChange,
  chartData,
  prevChartData,
  heartbeats,
  sloMs = 2000,
  fetcher = defaultFetcher,
}: Props) {
  const [compare, setCompare] = useState(true)
  const [phasePayload, setPhasePayload] = useState<PhaseTimingsPayload | null>(null)
  const [phaseError, setPhaseError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPhaseError(null)
    const url = MonitorPhaseTimingsController.url(monitorId, { query: { period } })
    fetcher(url)
      .then((payload) => {
        if (!cancelled) setPhasePayload(payload)
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setPhaseError(e.message)
          setPhasePayload(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [monitorId, period, fetcher])

  const buckets = useMemo(() => bucketChart(chartData ?? [], 48), [chartData])
  const prevBuckets = useMemo(() => bucketChart(prevChartData ?? [], 48), [prevChartData])
  const stats = useMemo(
    () => computeStats(chartData ?? [], prevChartData ?? [], sloMs),
    [chartData, prevChartData, sloMs],
  )
  const distribution = useMemo(() => computeDistribution(chartData ?? []), [chartData])
  const statusCodes = useMemo(() => computeStatusCodes(heartbeats), [heartbeats])

  return (
    <section aria-label="Response analytics" className="space-y-4">
      <RangeSelector
        period={period}
        onChange={onPeriodChange}
        compare={compare}
        onCompareChange={setCompare}
      />

      <ResponseChart
        buckets={buckets}
        prevBuckets={compare ? prevBuckets : []}
        sloMs={sloMs}
        stats={stats}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <DistributionHistogram distribution={distribution} />
        <PhaseWaterfall payload={phasePayload} error={phaseError} />
      </div>

      <StatusCodesBars buckets={statusCodes} />
      <AssertionTimelinePlaceholder />
      <SlowestChecks heartbeats={heartbeats} />
    </section>
  )
}

function RangeSelector({
  period,
  onChange,
  compare,
  onCompareChange,
}: {
  period: ResponseTabPeriod
  onChange: (next: ResponseTabPeriod) => void
  compare: boolean
  onCompareChange: (next: boolean) => void
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Response time period"
      >
        {PERIOD_ORDER.map((p) => (
          <button
            key={p}
            type="button"
            data-slot="response-range"
            data-value={p}
            data-selected={p === period ? "" : undefined}
            aria-pressed={p === period}
            onClick={() => onChange(p)}
            className={
              p === period
                ? "rounded-full bg-primary px-3.5 py-1 font-semibold text-[11px] text-primary-foreground"
                : "rounded-full border border-border px-3.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            }
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        <span aria-hidden className="mx-2 h-4 w-px bg-border" />
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => onCompareChange(e.target.checked)}
            className="size-3.5 accent-primary"
            aria-label="Compare to previous period"
          />
          <span className="text-foreground">Compare to prev period</span>
        </label>
      </div>
    </header>
  )
}

interface ChartBucket {
  index: number
  p50: number
  p95: number
  p99: number
  count: number
}

function bucketChart(points: ChartDataPoint[], buckets: number): ChartBucket[] {
  if (points.length === 0) return []
  const sorted = [...points]
    .filter((p) => p.response_time != null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  if (sorted.length === 0) return []
  const start = new Date(sorted[0].created_at).getTime()
  const end = new Date(sorted[sorted.length - 1].created_at).getTime()
  const span = Math.max(1, end - start)
  const bucketWidth = span / buckets
  const out: number[][] = Array.from({ length: buckets }, () => [])
  for (const p of sorted) {
    const t = new Date(p.created_at).getTime()
    const idx = Math.min(buckets - 1, Math.floor((t - start) / bucketWidth))
    if (p.response_time != null) {
      out[idx].push(p.response_time)
    }
  }
  return out.map((vals, i) => {
    if (vals.length === 0) return { index: i, p50: 0, p95: 0, p99: 0, count: 0 }
    const sortedVals = [...vals].sort((a, b) => a - b)
    return {
      index: i,
      p50: percentileAt(sortedVals, 0.5),
      p95: percentileAt(sortedVals, 0.95),
      p99: percentileAt(sortedVals, 0.99),
      count: vals.length,
    }
  })
}

function percentileAt(sortedVals: number[], p: number): number {
  if (sortedVals.length === 0) return 0
  const idx = Math.min(sortedVals.length - 1, Math.floor(p * sortedVals.length))
  return sortedVals[idx]
}

interface ResponseStats {
  p50: number | null
  p95: number | null
  p99: number | null
  min: number | null
  max: number | null
  spread: number | null
  sloBreachPct: number | null
  prevP95: number | null
  count: number
}

function computeStats(
  points: ChartDataPoint[],
  prevPoints: ChartDataPoint[],
  sloMs: number,
): ResponseStats {
  const values = points
    .map((p) => p.response_time)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
  if (values.length === 0) {
    return {
      p50: null,
      p95: null,
      p99: null,
      min: null,
      max: null,
      spread: null,
      sloBreachPct: null,
      prevP95: null,
      count: 0,
    }
  }
  const breach = values.filter((v) => v > sloMs).length
  const prevValues = prevPoints
    .map((p) => p.response_time)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
  return {
    p50: percentileAt(values, 0.5),
    p95: percentileAt(values, 0.95),
    p99: percentileAt(values, 0.99),
    min: values[0],
    max: values[values.length - 1],
    spread: values[values.length - 1] - values[0],
    sloBreachPct: (breach / values.length) * 100,
    prevP95: prevValues.length > 0 ? percentileAt(prevValues, 0.95) : null,
    count: values.length,
  }
}

function ResponseChart({
  buckets,
  prevBuckets,
  sloMs,
  stats,
}: {
  buckets: ChartBucket[]
  prevBuckets: ChartBucket[]
  sloMs: number
  stats: ResponseStats
}) {
  const W = 1000
  const H = 240
  const PAD = 12
  const maxY = useMaxY(buckets, prevBuckets, sloMs)
  const xFor = (i: number) =>
    PAD + (buckets.length <= 1 ? 0 : (i / (buckets.length - 1)) * (W - PAD * 2))
  const yFor = (v: number) => H - PAD - (Math.min(v, maxY) / maxY) * (H - PAD * 2)

  const path = (key: "p50" | "p95" | "p99") =>
    buckets
      .map((b, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(b[key]).toFixed(1)}`)
      .join(" ")

  const prevPath =
    prevBuckets.length > 0
      ? prevBuckets
          .map(
            (b, i) =>
              `${i === 0 ? "M" : "L"}${xFor(Math.min(i, buckets.length - 1)).toFixed(1)},${yFor(b.p95).toFixed(1)}`,
          )
          .join(" ")
      : null

  return (
    <article
      data-slot="response-chart"
      className="rounded-lg border border-border bg-card px-5 py-4"
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <Eyebrow>response time</Eyebrow>
          <p className="mt-0.5 font-semibold text-foreground text-sm">
            {buckets.length > 0 ? `${stats.count} checks · bucketed` : "No data in window"}
          </p>
        </div>
        <ChartLegend />
      </header>
      <svg
        role="img"
        aria-label="Response time chart"
        width="100%"
        viewBox={`0 0 ${W} ${H + 22}`}
        preserveAspectRatio="none"
        className="block"
      >
        {[0.25, 0.5, 0.75, 1].map((g) => {
          const v = Math.round(maxY * g)
          return (
            <g key={g}>
              <line
                x1={PAD}
                x2={W - PAD}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="var(--border)"
                strokeDasharray="2 4"
              />
              <text
                x={PAD - 4}
                y={yFor(v) + 3}
                fontSize="9"
                fill="var(--muted-foreground)"
                textAnchor="end"
              >
                {v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}`}
              </text>
            </g>
          )
        })}

        <line
          x1={PAD}
          x2={W - PAD}
          y1={yFor(sloMs)}
          y2={yFor(sloMs)}
          stroke="var(--destructive)"
          strokeDasharray="3 3"
          opacity={0.5}
        />
        <text
          x={W - PAD - 4}
          y={yFor(sloMs) - 4}
          fontSize="9"
          fill="var(--destructive)"
          textAnchor="end"
        >
          SLO · {sloMs >= 1000 ? `${sloMs / 1000}s` : `${sloMs}ms`}
        </text>

        {prevPath ? (
          <path
            data-slot="prev-period-line"
            d={prevPath}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.55}
          />
        ) : null}

        {buckets.length > 0 ? (
          <>
            <path d={path("p99")} fill="none" stroke="var(--destructive)" strokeWidth={1.4} />
            <path d={path("p95")} fill="none" stroke="var(--primary)" strokeWidth={1.6} />
            <path d={path("p50")} fill="none" stroke="var(--foreground)" strokeWidth={1.4} />
          </>
        ) : null}
      </svg>

      <StatStrip stats={stats} />
    </article>
  )
}

function ChartLegend() {
  return (
    <ul
      className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground"
      aria-label="Chart legend"
    >
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 bg-foreground" />
        p50
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 bg-primary" />
        p95
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 bg-destructive" />
        p99
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-0 w-3"
          style={{ borderTop: "1px dashed var(--muted-foreground)" }}
        />
        prev period
      </li>
    </ul>
  )
}

function useMaxY(buckets: ChartBucket[], prevBuckets: ChartBucket[], sloMs: number): number {
  const dataMax = Math.max(
    0,
    ...buckets.flatMap((b) => [b.p50, b.p95, b.p99]),
    ...prevBuckets.map((b) => b.p95),
  )
  // Anchor on the data so it fills the viewport, then keep enough headroom
  // for the SLO line. If data sits well below SLO, only show SLO + a thin band.
  const headroom = dataMax * 1.2
  const max = Math.max(headroom, sloMs * 1.05) || sloMs || 100
  return Math.max(100, Math.ceil(max / 100) * 100)
}

function StatStrip({ stats }: { stats: ResponseStats }) {
  const cells: Array<{
    label: string
    value: string
    sub: string
    intent: "neutral" | "primary" | "danger"
  }> = [
    {
      label: "p50",
      value: formatMs(stats.p50),
      sub: "median",
      intent: "neutral",
    },
    {
      label: "p95",
      value: formatMs(stats.p95),
      sub:
        stats.p95 != null && stats.prevP95 != null
          ? formatDelta(stats.p95, stats.prevP95)
          : "vs prev",
      intent: "primary",
    },
    {
      label: "p99",
      value: formatMs(stats.p99),
      sub: "tail",
      intent: "danger",
    },
    {
      label: "min · max",
      value:
        stats.min != null && stats.max != null
          ? `${formatMs(stats.min)} · ${formatMs(stats.max)}`
          : "—",
      sub: stats.spread != null ? `spread ${formatMs(stats.spread)}` : "spread —",
      intent: "neutral",
    },
    {
      label: "SLO breach",
      value: stats.sloBreachPct != null ? `${stats.sloBreachPct.toFixed(1)}%` : "—",
      sub: "target < 1%",
      intent: "danger",
    },
  ]
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 border-border border-t pt-3 sm:grid-cols-5">
      {cells.map((c) => (
        <div key={c.label} data-slot="stat-cell" data-stat={c.label}>
          <p className="kpi-label">{c.label}</p>
          <p
            className={
              c.intent === "primary"
                ? "kpi-value text-primary"
                : c.intent === "danger"
                  ? "kpi-value text-destructive"
                  : "kpi-value text-foreground"
            }
          >
            {c.value}
          </p>
          <p className="kpi-sub">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}

function formatMs(v: number | null): string {
  if (v == null) return "—"
  if (v >= 1000) return `${(v / 1000).toFixed(2)} s`
  return `${Math.round(v)} ms`
}

function formatDelta(current: number, prev: number): string {
  if (prev === 0) return "vs prev"
  const pct = ((current - prev) / prev) * 100
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(1)}% vs prev`
}

interface DistributionBucket {
  label: string
  count: number
  intent: "success" | "primary" | "warning" | "danger"
}

function computeDistribution(points: ChartDataPoint[]): DistributionBucket[] {
  const ranges: Array<{
    label: string
    min: number
    max: number
    intent: DistributionBucket["intent"]
  }> = [
    { label: "0-100", min: 0, max: 100, intent: "success" },
    { label: "100-200", min: 100, max: 200, intent: "success" },
    { label: "200-300", min: 200, max: 300, intent: "primary" },
    { label: "300-500", min: 300, max: 500, intent: "primary" },
    { label: "500-1k", min: 500, max: 1000, intent: "warning" },
    { label: "1-2s", min: 1000, max: 2000, intent: "warning" },
    { label: "2-5s", min: 2000, max: 5000, intent: "danger" },
    { label: "5s+", min: 5000, max: Number.POSITIVE_INFINITY, intent: "danger" },
  ]
  return ranges.map((r) => {
    const count = points.filter(
      (p) => p.response_time != null && p.response_time >= r.min && p.response_time < r.max,
    ).length
    return { label: r.label, count, intent: r.intent }
  })
}

function DistributionHistogram({ distribution }: { distribution: DistributionBucket[] }) {
  const max = Math.max(1, ...distribution.map((d) => d.count))
  const total = distribution.reduce((acc, d) => acc + d.count, 0)
  return (
    <article
      data-slot="distribution-histogram"
      className="rounded-lg border border-border bg-card px-5 py-4"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <Eyebrow>distribution</Eyebrow>
          <p className="mt-0.5 font-semibold text-foreground text-sm">
            {total} checks · bucketed by response time
          </p>
        </div>
      </header>
      <div className="flex h-[120px] items-stretch gap-1 border-border border-b pb-2">
        {distribution.map((b) => {
          const h = (b.count / max) * 100
          return (
            <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[9px] text-muted-foreground">{b.count}</span>
              <div
                role="img"
                aria-label={`${b.label}: ${b.count}`}
                className={
                  b.intent === "success"
                    ? "w-full rounded-t bg-success"
                    : b.intent === "primary"
                      ? "w-full rounded-t bg-primary"
                      : b.intent === "warning"
                        ? "w-full rounded-t bg-warning"
                        : "w-full rounded-t bg-destructive"
                }
                style={{ height: `${h}%`, minHeight: 2 }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {distribution.map((b) => (
          <div key={`l-${b.label}`} className="flex-1 text-center text-[9px] text-muted-foreground">
            {b.label}
          </div>
        ))}
      </div>
    </article>
  )
}

const PHASE_KEYS: Array<{
  key: keyof PhaseTimingsPayload["phases"]
  label: string
  className: string
}> = [
  { key: "dns", label: "DNS lookup", className: "bg-purple-500/80" },
  { key: "tcp", label: "TCP connect", className: "bg-sky-500/80" },
  { key: "tls", label: "TLS handshake", className: "bg-success" },
  { key: "ttfb", label: "Time to first byte", className: "bg-primary" },
  { key: "transfer", label: "Content transfer", className: "bg-destructive" },
]

function PhaseWaterfall({
  payload,
  error,
}: {
  payload: PhaseTimingsPayload | null
  error: string | null
}) {
  const totalP95 = payload
    ? PHASE_KEYS.reduce((acc, p) => acc + (payload.phases[p.key].p95 ?? 0), 0)
    : 0
  const totalAvg = payload
    ? PHASE_KEYS.reduce((acc, p) => acc + (payload.phases[p.key].avg ?? 0), 0)
    : 0

  return (
    <article
      data-slot="phase-waterfall"
      className="rounded-lg border border-border bg-card px-5 py-4"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <Eyebrow>phase breakdown</Eyebrow>
          <p className="mt-0.5 font-semibold text-foreground text-sm">where time is spent</p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          avg <span className="text-foreground">{totalAvg}ms</span> · p95{" "}
          <span className="text-primary">{totalP95}ms</span>
        </p>
      </header>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {payload && payload.count === 0 ? (
        <p className="text-muted-foreground text-sm">
          No HTTP phase data captured in this window yet.
        </p>
      ) : null}
      {payload && payload.count > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Phase breakdown">
          {PHASE_KEYS.map((p) => {
            const cell = payload.phases[p.key]
            const avg = cell.avg ?? 0
            const p95 = cell.p95 ?? 0
            const denom = Math.max(1, totalP95)
            const avgPct = (avg / denom) * 100
            const p95Pct = (p95 / denom) * 100
            return (
              <li
                key={p.key}
                data-slot="phase-row"
                data-phase={p.key}
                className="grid grid-cols-[140px_1fr_120px] items-center gap-3"
              >
                <span className="text-foreground text-xs">{p.label}</span>
                <div
                  role="img"
                  aria-label={`${p.label} avg ${avg}ms p95 ${p95}ms`}
                  className="relative h-[18px] w-full overflow-hidden rounded-sm"
                  style={{ background: "color-mix(in oklch, var(--foreground) 8%, transparent)" }}
                >
                  <div
                    className={`absolute inset-y-0 left-0 rounded-sm opacity-25 ${p.className}`}
                    style={{ width: `${p95Pct}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-sm ${p.className}`}
                    style={{ width: `${avgPct}%` }}
                  />
                </div>
                <p className="text-right text-[11px] text-muted-foreground">
                  <span className="text-foreground">{avg}ms</span>
                  <span className="text-muted-foreground"> · {p95}ms</span>
                </p>
              </li>
            )
          })}
        </ul>
      ) : null}
      {!payload && !error ? (
        <p className="text-muted-foreground text-sm">Loading phase data…</p>
      ) : null}
    </article>
  )
}

interface StatusBucket {
  label: string
  s2xx: number
  s3xx: number
  s4xx: number
  s5xx: number
  timeout: number
}

function computeStatusCodes(heartbeats: Heartbeat[]): StatusBucket[] {
  if (heartbeats.length === 0) return []
  const sorted = [...heartbeats].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const start = new Date(sorted[0].created_at).getTime()
  const end = new Date(sorted[sorted.length - 1].created_at).getTime()
  const span = Math.max(1, end - start)
  const buckets = 24
  const width = span / buckets
  const out: StatusBucket[] = Array.from({ length: buckets }, (_, i) => ({
    label: `${i}`,
    s2xx: 0,
    s3xx: 0,
    s4xx: 0,
    s5xx: 0,
    timeout: 0,
  }))
  for (const h of sorted) {
    const t = new Date(h.created_at).getTime()
    const idx = Math.min(buckets - 1, Math.floor((t - start) / width))
    if (h.status_code == null) {
      out[idx].timeout += 1
    } else if (h.status_code >= 500) {
      out[idx].s5xx += 1
    } else if (h.status_code >= 400) {
      out[idx].s4xx += 1
    } else if (h.status_code >= 300) {
      out[idx].s3xx += 1
    } else {
      out[idx].s2xx += 1
    }
  }
  return out
}

function StatusCodesBars({ buckets }: { buckets: StatusBucket[] }) {
  const totals = buckets.reduce(
    (acc, b) => ({
      s2xx: acc.s2xx + b.s2xx,
      s3xx: acc.s3xx + b.s3xx,
      s4xx: acc.s4xx + b.s4xx,
      s5xx: acc.s5xx + b.s5xx,
      timeout: acc.timeout + b.timeout,
    }),
    { s2xx: 0, s3xx: 0, s4xx: 0, s5xx: 0, timeout: 0 },
  )
  const grand = totals.s2xx + totals.s3xx + totals.s4xx + totals.s5xx + totals.timeout
  const peak = Math.max(1, ...buckets.map((b) => b.s2xx + b.s3xx + b.s4xx + b.s5xx + b.timeout))
  const legend: Array<{
    key: keyof StatusBucket
    label: string
    bg: string
  }> = [
    { key: "s2xx", label: "2xx", bg: "bg-success" },
    { key: "s3xx", label: "3xx", bg: "bg-sky-500/80" },
    { key: "s4xx", label: "4xx", bg: "bg-primary" },
    { key: "s5xx", label: "5xx", bg: "bg-destructive" },
    { key: "timeout", label: "timeout", bg: "bg-purple-500/80" },
  ]
  return (
    <article data-slot="status-codes" className="rounded-lg border border-border bg-card px-5 py-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Eyebrow>status codes</Eyebrow>
          <p className="mt-0.5 font-semibold text-foreground text-sm">{grand} responses bucketed</p>
        </div>
        <ul className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span aria-hidden className={`size-2 rounded-sm ${l.bg}`} />
              <span className="text-foreground">{l.label}</span>
              <span>· {totals[l.key as keyof typeof totals]}</span>
            </li>
          ))}
        </ul>
      </header>
      <div className="flex h-[100px] items-end gap-1">
        {buckets.length === 0 ? (
          <p className="text-muted-foreground text-sm">No status code data in this window.</p>
        ) : (
          buckets.map((b, i) => {
            const total = b.s2xx + b.s3xx + b.s4xx + b.s5xx + b.timeout
            const heightPx = (total / peak) * 100
            return (
              <div
                key={i}
                data-slot="status-bucket"
                className="flex flex-1 flex-col-reverse"
                style={{ height: `${heightPx}%` }}
              >
                {b.s2xx > 0 ? (
                  <div className="bg-success" style={{ height: `${(b.s2xx / total) * 100}%` }} />
                ) : null}
                {b.s3xx > 0 ? (
                  <div className="bg-sky-500/80" style={{ height: `${(b.s3xx / total) * 100}%` }} />
                ) : null}
                {b.s4xx > 0 ? (
                  <div className="bg-primary" style={{ height: `${(b.s4xx / total) * 100}%` }} />
                ) : null}
                {b.s5xx > 0 ? (
                  <div
                    className="bg-destructive"
                    style={{ height: `${(b.s5xx / total) * 100}%` }}
                  />
                ) : null}
                {b.timeout > 0 ? (
                  <div
                    className="bg-purple-500/80"
                    style={{ height: `${(b.timeout / total) * 100}%` }}
                  />
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </article>
  )
}

function AssertionTimelinePlaceholder() {
  return (
    <article
      data-slot="assertion-timeline"
      className="rounded-lg border border-border border-dashed bg-card px-5 py-4 text-muted-foreground text-sm"
    >
      <Eyebrow>assertions</Eyebrow>
      <p className="mt-1.5">Assertion pass/fail timeline lands once the assertions module ships.</p>
    </article>
  )
}

type SlowestMode = "slowest" | "failed" | "latest"

function applySlowestMode(heartbeats: Heartbeat[], mode: SlowestMode, limit: number): Heartbeat[] {
  const filtered = mode === "failed" ? heartbeats.filter((h) => h.status !== "up") : heartbeats
  const withTime = filtered.filter((h) => h.response_time != null)
  if (mode === "latest") {
    return [...withTime]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }
  return [...withTime]
    .sort((a, b) => (b.response_time ?? 0) - (a.response_time ?? 0))
    .slice(0, limit)
}

function durationIntent(ms: number | null): string {
  if (ms == null) return "text-muted-foreground"
  if (ms >= 2000) return "text-destructive"
  if (ms >= 1000) return "text-warning"
  if (ms >= 500) return "text-primary"
  return "text-foreground"
}

const SLOWEST_LIMIT = 8

function SlowestChecks({ heartbeats }: { heartbeats: Heartbeat[] }) {
  const [mode, setMode] = useState<SlowestMode>("slowest")
  const totalAvailable = heartbeats.length
  const visible = useMemo(
    () => applySlowestMode(heartbeats, mode, SLOWEST_LIMIT),
    [heartbeats, mode],
  )
  const modes: Array<{ value: SlowestMode; label: string }> = [
    { value: "slowest", label: "Slowest" },
    { value: "failed", label: "Failed only" },
    { value: "latest", label: "Latest" },
  ]
  return (
    <article
      data-slot="slowest-checks"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-border border-b px-5 py-4">
        <div>
          <Eyebrow>slowest checks</Eyebrow>
          <p className="mt-0.5 font-semibold text-foreground text-sm">
            top {visible.length} sorted by {mode === "latest" ? "time" : "duration"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Slowest checks filter">
          {modes.map((m) => (
            <button
              key={m.value}
              type="button"
              data-slot="slowest-filter"
              data-value={m.value}
              data-selected={mode === m.value ? "" : undefined}
              aria-pressed={mode === m.value}
              onClick={() => setMode(m.value)}
              className={
                mode === m.value
                  ? "rounded-full bg-primary px-3 py-1 font-semibold text-[10px] text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-[10px] text-muted-foreground hover:text-foreground"
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>
      {visible.length === 0 ? (
        <p className="px-5 py-6 text-center text-muted-foreground text-sm">
          {mode === "failed" ? "No failed checks in this window." : "No checks in window."}
        </p>
      ) : (
        <>
          <table className="w-full text-xs" aria-label="Slowest checks">
            <thead className="bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-widest">
              <tr>
                <th className="px-5 py-2.5 text-left">Time</th>
                <th className="px-5 py-2.5 text-left">Duration</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-left">Body preview</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((h) => (
                <tr
                  key={h.id}
                  data-slot="slowest-row"
                  data-id={h.id}
                  className="border-border border-t"
                >
                  <td className="px-5 py-2.5 text-muted-foreground">
                    {new Date(h.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className={`px-5 py-2.5 font-medium ${durationIntent(h.response_time)}`}>
                    {formatMs(h.response_time)}
                  </td>
                  <td
                    className={`px-5 py-2.5 font-semibold ${h.status === "up" ? "text-success" : "text-destructive"}`}
                  >
                    {h.status_code ?? (h.status === "up" ? "OK" : "ERR")}
                  </td>
                  <td className="truncate px-5 py-2.5 text-muted-foreground">{h.message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-border border-t px-5 py-3 text-[11px] text-muted-foreground">
            <span>showing {visible.length}</span>
            <span className="text-primary">view all {totalAvailable} →</span>
          </div>
        </>
      )}
    </article>
  )
}
