import {
  Eyebrow,
  HeartbeatBar,
  HeartbeatStrip,
  KpiCell,
  ResponseSparkline,
  SegmentedToggle,
  StatusDot,
  StatusPill,
  Tag,
  Terminal,
} from "@/components/primitives"

const SAMPLE_HEARTBEATS: { status: "up" | "degraded" | "down" | "paused" | "pending" }[] = [
  ...Array.from({ length: 30 }, () => ({ status: "up" as const })),
  { status: "degraded" },
  { status: "degraded" },
  { status: "down" },
  ...Array.from({ length: 10 }, () => ({ status: "up" as const })),
  { status: "pending" },
  { status: "paused" },
  ...Array.from({ length: 4 }, () => ({ status: "up" as const })),
]

const SAMPLE_LATENCIES = [142, 156, 138, 168, 192, 142, 134, 124, 156, 168, 198, 184]

interface GalleryProps {
  segmentedValue?: "grid" | "list"
  onSegmentedChange?: (value: "grid" | "list") => void
}

/**
 * Visual fixture used by `gallery.test.tsx` to confirm every primitive renders side-by-side.
 * Reviewers can also import this in a debug page for ad-hoc inspection.
 */
export function PrimitivesGallery({
  segmentedValue = "grid",
  onSegmentedChange = () => {},
}: GalleryProps) {
  return (
    <div data-testid="primitives-gallery" className="space-y-8 bg-background p-8 text-foreground">
      <section data-section="status-pill" className="space-y-2">
        <Eyebrow>Status pill</Eyebrow>
        <div className="flex flex-wrap gap-2">
          <StatusPill status="up">UP</StatusPill>
          <StatusPill status="degraded">DEGRADED</StatusPill>
          <StatusPill status="down">DOWN</StatusPill>
          <StatusPill status="resolved">RESOLVED</StatusPill>
          <StatusPill status="paused">PAUSED</StatusPill>
        </div>
      </section>

      <section data-section="status-dot" className="space-y-2">
        <Eyebrow>Status dot</Eyebrow>
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-2">
            <StatusDot status="up" /> up
          </span>
          <span className="inline-flex items-center gap-2">
            <StatusDot status="degraded" /> degraded
          </span>
          <span className="inline-flex items-center gap-2">
            <StatusDot status="down" /> down
          </span>
          <span className="inline-flex items-center gap-2">
            <StatusDot status="unknown" /> unknown
          </span>
        </div>
      </section>

      <section data-section="tag" className="space-y-2">
        <Eyebrow>Tag</Eyebrow>
        <div className="flex flex-wrap gap-2">
          <Tag>production</Tag>
          <Tag>api</Tag>
          <Tag>edge</Tag>
        </div>
      </section>

      <section data-section="kpi" className="grid grid-cols-4 gap-4">
        <KpiCell label="Total monitors" value="24" sub="22 up · 1 degraded · 1 paused" />
        <KpiCell
          label="Team uptime · 30d"
          value="99.94%"
          sub="+0.02% vs last 30d"
          intent="primary"
        />
        <KpiCell label="Avg response" value="186 ms" sub="p95 · 412 ms" />
        <KpiCell label="Open incidents" value="1" sub="billing.acme.io · 4m" intent="danger" />
      </section>

      <section data-section="heartbeat" className="space-y-3">
        <Eyebrow>Heartbeat</Eyebrow>
        <div className="flex items-center gap-3">
          {(["up", "degraded", "down", "paused", "pending"] as const).map((status) => (
            <span key={status} className="inline-flex items-center gap-2 text-xs">
              <span className="block h-7 w-1.5">
                <HeartbeatBar status={status} />
              </span>
              {status}
            </span>
          ))}
        </div>
        <HeartbeatStrip buckets={SAMPLE_HEARTBEATS} />
        <HeartbeatStrip buckets={[]} emptyLabel="no heartbeats yet" />
      </section>

      <section data-section="sparkline" className="space-y-2">
        <Eyebrow>Response sparkline</Eyebrow>
        <div className="flex items-center gap-4">
          <ResponseSparkline points={SAMPLE_LATENCIES} width={120} height={28} />
          <ResponseSparkline points={[]} width={120} height={28} />
        </div>
      </section>

      <section data-section="terminal" className="space-y-2">
        <Eyebrow>Terminal</Eyebrow>
        <Terminal>
          {`$ beacon check billing.acme.io
HTTP 503 · 3/3 retries failed
notified slack · email`}
        </Terminal>
      </section>

      <section data-section="segmented" className="space-y-2">
        <Eyebrow>Segmented toggle</Eyebrow>
        <SegmentedToggle
          value={segmentedValue}
          onChange={onSegmentedChange}
          options={[
            { value: "grid", label: "Grid" },
            { value: "list", label: "List" },
          ]}
        />
        <SegmentedToggle
          value={segmentedValue}
          onChange={onSegmentedChange}
          options={[
            { value: "grid", icon: <span aria-hidden>⊞</span>, ariaLabel: "Grid view" },
            { value: "list", icon: <span aria-hidden>☰</span>, ariaLabel: "List view" },
          ]}
        />
      </section>
    </div>
  )
}
