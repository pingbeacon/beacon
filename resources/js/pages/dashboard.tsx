import AppLayout from "@/layouts/app-layout"
import type { SharedData } from "@/types/shared"
import { Head, usePage, WhenVisible } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { Container } from "@/components/ui/container"
import { Badge } from "@/components/ui/badge"
import { Tracker } from "@/components/ui/tracker"
import { Button } from "@/components/ui/button"
import { Link } from "@/components/ui/link"
import { Heading } from "@/components/ui/heading"
import type { Monitor, Tag, Heartbeat } from "@/types/monitor"
import {
  BellAlertIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  PlusIcon,
} from "@heroicons/react/20/solid"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import CreateMonitorModal from "./monitors/components/create-monitor-modal"
import { TagBadge } from "@/components/tag-badge"
import { uptimeColor, statusBadgeIntent } from "@/lib/color"
import monitorRoutes from "@/routes/monitors"
import MonitorFilterBar from "@/components/monitor-filter-bar"
import { useMonitorFilters } from "@/hooks/use-monitor-filters"
import { heartbeatsToTracker } from "@/lib/heartbeats"

interface Props {
  counts: { total: number; up: number; down: number; paused: number }
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

function StatusBanner({ counts }: { counts: Props["counts"] }) {
  if (counts.total === 0) return null

  const allUp = counts.down === 0

  if (allUp) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-success/20 bg-success/10 px-4 py-2.5 text-success-subtle-fg">
        <span className="relative flex size-4 shrink-0 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-20" />
          <CheckCircleIcon className="relative size-4 text-success" />
        </span>
        <span className="text-sm font-medium">All systems operational</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/10 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ExclamationCircleIcon className="size-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-danger leading-tight">
              {counts.down} monitor{counts.down > 1 ? "s" : ""} down
            </p>
            <p className="text-danger-subtle-fg text-xs mt-0.5">
              {counts.up} of {counts.total} operational
            </p>
          </div>
        </div>
        <Link
          href={monitorRoutes.index.url({ query: { status: "down" } })}
          className="shrink-0 rounded-md border border-danger/40 bg-danger/15 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/25 transition-colors"
        >
          View affected →
        </Link>
      </div>
    </div>
  )
}

function StatRow({ counts }: { counts: Props["counts"] }) {
  const hasDown = counts.down > 0
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="flex flex-col rounded-lg border px-4 py-3">
        <span className="text-xs text-muted-fg">Total</span>
        <span className="mt-0.5 font-semibold text-2xl tabular-nums">{counts.total}</span>
      </div>
      <div className="flex flex-col rounded-lg border px-4 py-3">
        <span className="text-xs text-muted-fg">Up</span>
        <span className="mt-0.5 font-semibold text-2xl tabular-nums text-success">{counts.up}</span>
      </div>
      <div className={`flex flex-col rounded-lg border px-4 py-3 ${hasDown ? "border-danger/30 bg-danger/8" : ""}`}>
        <span className={`text-xs ${hasDown ? "text-danger/70" : "text-muted-fg"}`}>Down</span>
        <span className={`mt-0.5 tabular-nums font-bold ${hasDown ? "text-3xl text-danger" : "text-2xl font-semibold text-muted-fg"}`}>
          {counts.down}
        </span>
      </div>
      <div className="flex flex-col rounded-lg border px-4 py-3">
        <span className="text-xs text-muted-fg">Paused</span>
        <span className="mt-0.5 font-semibold text-2xl tabular-nums text-muted-fg">{counts.paused}</span>
      </div>
    </div>
  )
}

function MonitorRow({ monitor }: { monitor: Monitor }) {
  const prevStatus = useRef(monitor.status)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    const prev = prevStatus.current
    prevStatus.current = monitor.status
    if (prev === "down" && monitor.status === "up") {
      setRecovering(true)
      const timer = setTimeout(() => setRecovering(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [monitor.status])

  return (
    <Link
      href={monitorRoutes.show.url(monitor.id)}
      className={`group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-border px-4 py-3 transition-colors hover:border-fg/20 hover:bg-secondary/30 sm:grid-cols-[auto_1fr_auto_auto]${recovering ? " animate-recovery-flash" : ""}`}
    >
      <Badge intent={statusBadgeIntent[monitor.status]} className="w-18 justify-center">
        {monitor.status.charAt(0).toUpperCase() + monitor.status.slice(1)}
      </Badge>
      <div className="min-w-0">
        <span className="block truncate font-medium text-sm">{monitor.name}</span>
        <span className="text-xs text-muted-fg">
          {monitor.type.toUpperCase()} · {monitor.url ?? monitor.host}
        </span>
      </div>
      <div className="hidden sm:block">
        <Tracker
          data={heartbeatsToTracker(monitor.heartbeats)}
          className="h-6 w-32"
          aria-label={`Uptime history for ${monitor.name}`}
        />
      </div>
      <div className="flex w-24 shrink-0 flex-col items-end text-right">
        {monitor.uptime_percentage !== undefined && (
          <span className={`text-sm font-medium tabular-nums ${uptimeColor(monitor.uptime_percentage)}`}>{monitor.uptime_percentage}%</span>
        )}
        {monitor.average_response_time != null && (
          <span className="text-xs text-muted-fg tabular-nums">
            {Math.round(monitor.average_response_time)}ms
          </span>
        )}
      </div>
    </Link>
  )
}

function EmptyState() {
  const steps = [
    {
      icon: ComputerDesktopIcon,
      step: "01",
      title: "Add your first monitor",
      description:
        "Point UptimeRadar at a URL, host, or IP. It will check every 60 seconds and alert you the moment something goes wrong.",
      action: <CreateMonitorModal><Button size="sm"><PlusIcon data-slot="icon" />Add monitor</Button></CreateMonitorModal>,
    },
    {
      icon: BellAlertIcon,
      step: "02",
      title: "Set up notifications",
      description:
        "Get alerted via email, Slack, Discord, or webhook when a monitor goes down — before your users notice.",
      action: (
        <Link href="/notification-channels">
          <Button intent="outline" size="sm">Set up channels</Button>
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
          <Button intent="outline" size="sm">Create page</Button>
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
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex items-start gap-4 rounded-lg border bg-bg px-5 py-4 transition-colors duration-300 hover:bg-secondary/20"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle">
              <Icon className="size-4 text-primary-subtle-fg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-fg">{step}</span>
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

export default function Dashboard({ counts: initialCounts, monitors: initialMonitors }: Props) {
  const { auth } = usePage<SharedData>().props
  const [monitors, setMonitors] = useState(initialMonitors)
  const [counts, setCounts] = useState(initialCounts)

  useEffect(() => {
    if (initialMonitors) setMonitors(initialMonitors)
  }, [initialMonitors])

  useEffect(() => {
    setCounts(initialCounts)
  }, [initialCounts])

  const tags = useMemo(() => {
    if (!monitors) return []
    const tagMap = new Map<number, Tag>()
    monitors.forEach((m) => m.tags?.forEach((t) => tagMap.set(t.id, t)))
    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [monitors])

  const {
    filteredMonitors,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
  } = useMonitorFilters(monitors ?? [])

  const handleHeartbeat = useCallback((payload: HeartbeatPayload) => {
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
  }, [])

  const handleStatusChanged = useCallback((payload: StatusChangedPayload) => {
    setMonitors((prev) =>
      prev?.map((m) =>
        m.id === payload.monitorId ? { ...m, status: payload.newStatus as Monitor["status"] } : m,
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
  }, [])

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
        <div className="flex items-center justify-between">
          <Heading>Dashboard</Heading>
          {counts.total > 0 && <CreateMonitorModal />}
        </div>

        {counts.total > 0 && (
          <>
            <StatusBanner counts={counts} />
            <StatRow counts={counts} />
          </>
        )}

        <WhenVisible
          fallback={
            <div className="space-y-2">
              {Array(4)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
            </div>
          }
          data="monitors"
        >
          {monitors && monitors.length > 0 ? (
            <div className="space-y-4">
              <MonitorFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                tagFilter={tagFilter}
                onTagFilterChange={setTagFilter}
                tags={tags}
              />
              {filteredMonitors.length > 0 ? (
                <div className="space-y-2">
                  {filteredMonitors.map((monitor) => (
                    <MonitorRow key={monitor.id} monitor={monitor} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-fg text-sm">No monitors match your filters.</p>
                  <Button
                    intent="plain"
                    size="xs"
                    onPress={() => { setSearchQuery(""); setStatusFilter("all"); setTagFilter(null) }}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </div>
              )}
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
