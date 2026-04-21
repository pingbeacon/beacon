import { Head, router } from "@inertiajs/react"
import { useEffect } from "react"
import { Tracker } from "@/components/ui/tracker"
import { Badge } from "@/components/ui/badge"
import { Heading } from "@/components/ui/heading"
import type { Heartbeat, Tag } from "@/types/monitor"
import { TagBadge } from "@/components/tag-badge"
import { uptimeColor, statusBadgeIntent } from "@/lib/color"
import { heartbeatsToTracker } from "@/lib/heartbeats"

type OverallStatus = "operational" | "degraded" | "major_outage"
type MonitorStatus = "up" | "down" | "pending" | "paused"

interface PublicMonitor {
  id: number
  name: string
  status: MonitorStatus
  tags: Tag[]
  heartbeats: Heartbeat[]
  uptime_percentage: number
}

interface PublicStatusPage {
  id: number
  title: string
  description: string | null
  slug: string
  logo_path: string | null
  favicon_path: string | null
  primary_color: string | null
  background_color: string | null
  text_color: string | null
  custom_css: string | null
  header_text: string | null
  footer_text: string | null
  show_powered_by: boolean
}

interface Props {
  statusPage: PublicStatusPage
  monitors: PublicMonitor[]
  overallStatus: OverallStatus
}

const overallStatusConfig: Record<
  OverallStatus,
  { label: string; description: string; className: string }
> = {
  operational: {
    label: "All Systems Operational",
    description: "All services are running normally.",
    className: "bg-success/10 border-success/20 text-success-fg",
  },
  degraded: {
    label: "Partial Service Disruption",
    description: "Some services are experiencing issues.",
    className: "bg-warning/10 border-warning/20 text-warning-fg",
  },
  major_outage: {
    label: "Major Service Outage",
    description: "Multiple services are down.",
    className: "bg-danger/10 border-danger/20 text-danger-fg",
  },
}

const monitorStatusLabel: Record<MonitorStatus, string> = {
  up: "Operational",
  down: "Outage",
  pending: "Checking",
  paused: "Paused",
}

export default function StatusShow({ statusPage, monitors, overallStatus }: Props) {
  const statusConfig = overallStatusConfig[overallStatus]

  useEffect(() => {
    const interval = setInterval(() => {
      router.reload({ only: ["monitors", "overallStatus"] })
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const customStyles: React.CSSProperties = {
    ...(statusPage.background_color ? { backgroundColor: statusPage.background_color } : {}),
    ...(statusPage.text_color ? { color: statusPage.text_color } : {}),
    ...(statusPage.primary_color ? { "--sp-primary": statusPage.primary_color } as React.CSSProperties : {}),
  }

  return (
    <>
      <Head title={`${statusPage.title} - Status`}>
        {statusPage.favicon_path && (
          <link rel="icon" href={`/storage/${statusPage.favicon_path}`} />
        )}
      </Head>
      {statusPage.custom_css && <style>{statusPage.custom_css}</style>}
      <div
        className="status-page min-h-screen bg-bg"
        style={customStyles}
      >
        <div className="mx-auto max-w-3xl px-4 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            {statusPage.logo_path && (
              <img
                src={`/storage/${statusPage.logo_path}`}
                alt={statusPage.title}
                height={48}
                className="mx-auto mb-4 h-12 object-contain"
              />
            )}
            <Heading>{statusPage.title}</Heading>
            {statusPage.description && (
              <p className="mt-2 text-muted-fg text-sm">{statusPage.description}</p>
            )}
          </div>

          {/* Header text announcement */}
          {statusPage.header_text && (
            <div className="mb-6 rounded-lg border p-4 text-center text-sm">
              {statusPage.header_text}
            </div>
          )}

          {/* Overall status banner */}
          <div className={`mb-8 rounded-xl border p-5 ${statusConfig.className}`}>
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className={`size-3 rounded-full ${
                  overallStatus === "operational"
                    ? "bg-success"
                    : overallStatus === "degraded"
                      ? "bg-warning"
                      : "bg-danger"
                }`}
              />
              <div>
                <p className="font-semibold text-sm">{statusConfig.label}</p>
                <p className="text-xs opacity-80">{statusConfig.description}</p>
              </div>
            </div>
          </div>

          {/* Monitors */}
          {monitors.length > 0 ? (
            <div className="space-y-4">
              <Heading level={2}>Services</Heading>
              {monitors.map((monitor) => (
                <div key={monitor.id} className="rounded-xl border bg-overlay p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-fg text-sm">{monitor.name}</span>
                      {monitor.tags.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} />
                      ))}
                    </div>
                    <Badge intent={statusBadgeIntent[monitor.status]}>
                      {monitorStatusLabel[monitor.status]}
                    </Badge>
                  </div>

                  <Tracker
                    data={heartbeatsToTracker(monitor.heartbeats)}
                    className="h-6"
                    aria-label={`Uptime history for ${monitor.name} — last 90 checks`}
                  />

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-fg text-xs">Last 90 checks</span>
                    <span className={`font-medium text-xs tabular-nums ${uptimeColor(monitor.uptime_percentage)}`}>
                      {monitor.uptime_percentage}% uptime
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-overlay p-8 text-center text-muted-fg">
              <p>No monitors are configured for this status page.</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 text-center text-muted-fg text-xs">
            {statusPage.footer_text && (
              <p className="mb-2">{statusPage.footer_text}</p>
            )}
            {statusPage.show_powered_by && <p>Powered by UptimeRadar</p>}
          </div>
        </div>
      </div>
    </>
  )
}
