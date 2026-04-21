import AppLayout from "@/layouts/app-layout"
import type { SharedData } from "@/types/shared"
import { Head, router, usePage, WhenVisible } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Badge } from "@/components/ui/badge"
import { Tracker } from "@/components/ui/tracker"
import { Link } from "@/components/ui/link"
import type { Monitor, Tag, Heartbeat, MonitorGroup } from "@/types/monitor"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FolderPlusIcon,
  PlusIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/20/solid"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCallback, useEffect, useState } from "react"
import CreateMonitorModal from "./components/create-monitor-modal"
import MonitorGroupModal from "./components/monitor-group-modal"
import MonitorGroupSection from "./components/monitor-group-section"
import MonitorFilterBar from "@/components/monitor-filter-bar"
import BulkActionToolbar from "./components/bulk-action-toolbar"
import ImportExportSection from "./components/import-export-section"
import { useMonitorFilters } from "@/hooks/use-monitor-filters"
import { TagBadge } from "@/components/tag-badge"
import { uptimeColor, statusBadgeIntent } from "@/lib/color"
import monitorRoutes from "@/routes/monitors"
import { heartbeatsToTracker, formatInterval } from "@/lib/heartbeats"

interface Props {
  monitors?: Monitor[]
  tags: Tag[]
  groups: MonitorGroup[]
  trashedCount: number
}

interface HeartbeatPayload {
  monitorId: number
  heartbeat: Heartbeat
  monitorStatus: string
  uptimePercentage: number
  averageResponseTime: number | null
}

const TRACKER_COUNT = 20

function MonitorRow({
  monitor,
  isSelected,
  onToggleSelect,
}: {
  monitor: Monitor
  isSelected?: boolean
  onToggleSelect?: (id: number) => void
}) {
  const notificationCount = monitor.notification_channels?.filter((c) => c.is_enabled).length ?? 0

  return (
    <div className="flex items-center gap-2">
      {onToggleSelect && (
        <Checkbox
          isSelected={isSelected}
          onChange={() => onToggleSelect(monitor.id)}
          aria-label={`Select ${monitor.name}`}
        />
      )}
      <Link
        href={monitorRoutes.show.url(monitor.id)}
        className="grid flex-1 grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-border px-4 py-3 transition-colors hover:border-fg/20 hover:bg-secondary/30 sm:grid-cols-[auto_minmax(180px,1fr)_1fr_auto]"
      >
      <Badge intent={statusBadgeIntent[monitor.status]} className="w-18 justify-center">
        {monitor.status.charAt(0).toUpperCase() + monitor.status.slice(1)}
      </Badge>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{monitor.name}</span>
          {monitor.tags?.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-muted-fg text-xs">
          <span>{monitor.type.toUpperCase()} · {monitor.url || monitor.host}</span>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-0.5 rounded-sm text-muted-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
                <ClockIcon className="size-3.5" />
                <span>{formatInterval(monitor.interval)}</span>
              </TooltipTrigger>
              <TooltipContent>Check every {formatInterval(monitor.interval)}</TooltipContent>
            </Tooltip>
            {monitor.retry_count > 0 && (
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-0.5 rounded-sm text-muted-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
                  <ArrowPathIcon className="size-3.5" />
                  <span>{monitor.retry_count}</span>
                </TooltipTrigger>
                <TooltipContent>{monitor.retry_count} retries before alert</TooltipContent>
              </Tooltip>
            )}
            {monitor.ssl_monitoring_enabled && (
              <Tooltip>
                <TooltipTrigger className="rounded-sm text-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
                  <ShieldCheckIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>SSL certificate monitoring enabled</TooltipContent>
              </Tooltip>
            )}
            {notificationCount > 0 && (
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-0.5 rounded-sm text-muted-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
                  <BellAlertIcon className="size-3.5" />
                  <span>{notificationCount}</span>
                </TooltipTrigger>
                <TooltipContent>{notificationCount} notification channel{notificationCount > 1 ? "s" : ""}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      <div className="hidden sm:block">
        <Tracker
          data={heartbeatsToTracker(monitor.heartbeats, TRACKER_COUNT)}
          className="h-8"
          aria-label={`Uptime history for ${monitor.name}`}
        />
      </div>
      <div className="flex w-28 shrink-0 items-center justify-end gap-3 text-right text-sm">
        <span className={`tabular-nums font-medium ${monitor.uptime_percentage !== undefined ? uptimeColor(monitor.uptime_percentage) : "text-muted-fg"}`}>
          {monitor.uptime_percentage !== undefined ? `${monitor.uptime_percentage}%` : "\u2014"}
        </span>
        <span className="text-muted-fg tabular-nums">{monitor.average_response_time != null ? `${Math.round(monitor.average_response_time)}ms` : "\u2014"}</span>
      </div>
    </Link>
    </div>
  )
}

export default function MonitorsIndex({ monitors: initialMonitors, tags, groups, trashedCount }: Props) {
  const { auth } = usePage<SharedData>().props
  const [monitors, setMonitors] = useState(initialMonitors)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  useEffect(() => {
    if (initialMonitors) setMonitors(initialMonitors)
  }, [initialMonitors])

  const {
    filteredMonitors,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
    isFiltering,
  } = useMonitorFilters(monitors ?? [])

  const handleChecking = useCallback((payload: { monitorId: number }) => {
    setMonitors((prev) =>
      prev?.map((m) =>
        m.id === payload.monitorId ? { ...m, status: "pending" as Monitor["status"] } : m,
      ),
    )
  }, [])

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

  const handleStatusChanged = useCallback(
    (payload: { monitorId: number; newStatus: string }) => {
      setMonitors((prev) =>
        prev?.map((m) =>
          m.id === payload.monitorId
            ? { ...m, status: payload.newStatus as Monitor["status"] }
            : m,
        ),
      )
    },
    [],
  )

  useEcho(`monitors.${auth.user.id}`, ".MonitorChecking", handleChecking)
  useEcho(`monitors.${auth.user.id}`, ".HeartbeatRecorded", handleHeartbeat)
  useEcho(`monitors.${auth.user.id}`, ".MonitorStatusChanged", handleStatusChanged)

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredMonitors.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredMonitors.map((m) => m.id))
    }
  }, [filteredMonitors, selectedIds.length])

  const groupedMonitors = filteredMonitors.reduce<Record<number, Monitor[]>>((acc, monitor) => {
    const groupId = monitor.monitor_group_id ?? 0
    if (!acc[groupId]) acc[groupId] = []
    acc[groupId].push(monitor)
    return acc
  }, {})

  const ungroupedMonitors = groupedMonitors[0] ?? []
  const hasGroups = groups.length > 0

  return (
    <>
      <Head title="Monitors" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader title="Monitors">
            <div data-slot="card-action">
              <div className="flex gap-2">
                <ImportExportSection selectedIds={selectedIds} />
                <ButtonGroup>
                  {trashedCount > 0 && (
                    <Button intent="outline" onPress={() => router.visit(monitorRoutes.trashed.url())}>
                      Trash ({trashedCount})
                    </Button>
                  )}
                  <MonitorGroupModal>
                    <Button intent="outline">
                      <FolderPlusIcon data-slot="icon" />
                      Add Group
                    </Button>
                  </MonitorGroupModal>
                  <CreateMonitorModal />
                </ButtonGroup>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WhenVisible
              fallback={
                <div className="space-y-3">
                  {Array(3)
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
                  <BulkActionToolbar
                    selectedIds={selectedIds}
                    onClear={() => setSelectedIds([])}
                  />
                  {filteredMonitors.length > 0 ? (
                    <div className="space-y-4">
                      <Checkbox
                        isSelected={selectedIds.length === filteredMonitors.length && filteredMonitors.length > 0}
                        onChange={toggleSelectAll}
                      >
                        Select all
                      </Checkbox>
                      {groups
                        .filter((g) => groupedMonitors[g.id]?.length > 0)
                        .map((group) => (
                          <MonitorGroupSection
                            key={group.id}
                            group={group}
                            monitorCount={groupedMonitors[group.id]?.length ?? 0}
                          >
                            {(groupedMonitors[group.id] ?? []).map((monitor) => (
                              <MonitorRow
                                key={monitor.id}
                                monitor={monitor}
                                isSelected={selectedIds.includes(monitor.id)}
                                onToggleSelect={toggleSelect}
                              />
                            ))}
                          </MonitorGroupSection>
                        ))}
                      {ungroupedMonitors.length > 0 && (
                        <div className="space-y-2">
                          {hasGroups && groupedMonitors[0] && (
                            <h3 className="px-1 font-medium text-muted-fg text-xs uppercase tracking-wider">
                              Ungrouped
                            </h3>
                          )}
                          {ungroupedMonitors.map((monitor) => (
                            <MonitorRow
                              key={monitor.id}
                              monitor={monitor}
                              isSelected={selectedIds.includes(monitor.id)}
                              onToggleSelect={toggleSelect}
                            />
                          ))}
                        </div>
                      )}
                      {!isFiltering &&
                        groups
                          .filter((g) => !groupedMonitors[g.id]?.length)
                          .map((group) => (
                            <MonitorGroupSection
                              key={group.id}
                              group={group}
                              monitorCount={0}
                            >
                              <p className="py-4 text-center text-muted-fg text-sm">
                                No monitors in this group.
                              </p>
                            </MonitorGroupSection>
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
                <div className="py-12 text-center">
                  <p className="font-medium text-fg">No monitors yet</p>
                  <p className="mt-1 text-sm text-muted-fg">
                    Add a URL, host, or IP to start tracking uptime.
                  </p>
                  <CreateMonitorModal>
                    <Button className="mt-4">
                      <PlusIcon data-slot="icon" />
                      Add monitor
                    </Button>
                  </CreateMonitorModal>
                </div>
              )}
            </WhenVisible>
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

MonitorsIndex.layout = (page: React.ReactNode) => <AppLayout children={page} />
