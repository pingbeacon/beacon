import AppLayout from "@/layouts/app-layout"
import type { SharedData } from "@/types/shared"
import { Head, router, usePage, WhenVisible } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/components/ui/link"
import type { Monitor, Tag, Heartbeat, MonitorGroup } from "@/types/monitor"
import { Checkbox } from "@/components/ui/checkbox"
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import CreateMonitorModal from "./components/create-monitor-modal"
import MonitorGroupModal from "./components/monitor-group-modal"
import MonitorGroupSection from "./components/monitor-group-section"
import BulkActionToolbar from "./components/bulk-action-toolbar"
import ImportExportSection from "./components/import-export-section"
import { useMonitorFilters } from "@/hooks/use-monitor-filters"
import { uptimeColor, statusBadgeIntent } from "@/lib/color"
import monitorRoutes from "@/routes/monitors"
import { formatInterval } from "@/lib/heartbeats"

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

const HEARTBEAT_COUNT = 48

function timeAgo(dateString: string | null): string {
  if (!dateString) return "—"
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function statusCounts(monitors: Monitor[]) {
  return {
    all: monitors.length,
    up: monitors.filter((m) => m.status === "up").length,
    down: monitors.filter((m) => m.status === "down").length,
    pending: monitors.filter((m) => m.status === "pending").length,
    paused: monitors.filter((m) => m.status === "paused").length,
  }
}

type BarState = "up" | "slow" | "down" | "empty"

function HeartbeatBars({ heartbeats, status }: { heartbeats?: Heartbeat[]; status: string }) {
  const bars = useMemo<BarState[]>(() => {
    const result: BarState[] = Array(HEARTBEAT_COUNT).fill("empty")
    if (!heartbeats || heartbeats.length === 0) return result

    // compute avg response time to detect slow ("degraded") beats
    const upTimes = heartbeats
      .filter((hb) => hb.status === "up" && hb.response_time != null)
      .map((hb) => hb.response_time as number)
    const avg = upTimes.length > 0 ? upTimes.reduce((a, b) => a + b, 0) / upTimes.length : 0
    const slowThreshold = Math.max(avg * 2, 1500) // 2× avg, min 1.5 s

    const recent = [...heartbeats].slice(-HEARTBEAT_COUNT)
    const offset = HEARTBEAT_COUNT - recent.length
    recent.forEach((hb, i) => {
      if (hb.status === "down") {
        result[offset + i] = "down"
      } else if (hb.response_time != null && avg > 0 && hb.response_time > slowThreshold) {
        result[offset + i] = "slow"
      } else {
        result[offset + i] = "up"
      }
    })
    return result
  }, [heartbeats])

  if (status === "paused") {
    return (
      <div className="flex items-center h-[22px]">
        <span className="text-muted-fg text-xs">—</span>
      </div>
    )
  }

  return (
    <div className="grid gap-[1.5px] h-[22px] w-full" style={{ gridTemplateColumns: `repeat(${HEARTBEAT_COUNT}, 1fr)` }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            borderRadius: 1,
            height: "100%",
            background:
              b === "up"    ? "var(--color-success)" :
              b === "slow"  ? "var(--color-warning)" :
              b === "down"  ? "var(--color-danger)"  :
                              "var(--color-muted-fg)",
            opacity: b === "up" ? 0.4 : b === "empty" ? 0.18 : 1,
          }}
        />
      ))}
    </div>
  )
}

function ResponseSparkline({ heartbeats, status }: { heartbeats?: Heartbeat[]; status: string }) {
  const id = useRef(`spark-${Math.random().toString(36).slice(2)}`)

  const path = useMemo(() => {
    if (!heartbeats || heartbeats.length < 2 || status === "paused") return null
    const values = heartbeats
      .slice(-40)
      .map((hb) => hb.response_time ?? 0)
      .filter((v) => v > 0)
    if (values.length < 2) return null

    const max = Math.max(...values, 1)
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * 120
      const y = 24 - (v / max) * 22
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })

    const line = pts.join(" ")
    const fill = `${line} L120,24 L0,24 Z`
    return { line, fill }
  }, [heartbeats, status])

  if (!path) {
    return <div className="h-8 flex items-center text-muted-fg text-xs">—</div>
  }

  const isDown = status === "down"
  const colorVar = isDown ? "var(--color-danger)" : "var(--color-success)"

  return (
    <svg
      width="200"
      height="32"
      viewBox="0 0 120 24"
      preserveAspectRatio="none"
      className="block mt-1"
    >
      <defs>
        <linearGradient id={id.current} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colorVar} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.fill} fill={`url(#${id.current})`} />
      <path d={path.line} fill="none" stroke={colorVar} strokeWidth="1.2" />
    </svg>
  )
}

const STATUS_DOT_CLASS: Record<string, string> = {
  up: "bg-success shadow-[0_0_6px_var(--color-success)]",
  down: "bg-danger",
  pending: "bg-warning",
  paused: "bg-muted-fg",
}

const STATUS_LABEL_CLASS: Record<string, string> = {
  up: "text-success",
  down: "text-danger",
  pending: "text-warning",
  paused: "text-muted-fg",
}

// Matches design: 32px 280px 70px 0.9fr 88px 220px 84px 110px 36px
const COL_STYLE: React.CSSProperties = {
  gridTemplateColumns: "32px minmax(0, 280px) 70px minmax(0, 0.9fr) 88px minmax(0, 220px) 84px 110px 36px",
}

function TableHeader() {
  return (
    <div
      className="grid gap-x-4 px-6 py-3 bg-muted/30 border-b border-border text-muted-fg text-xs uppercase tracking-wider font-medium"
      style={COL_STYLE}
    >
      <div />
      <div>Monitor</div>
      <div>Type</div>
      <div>Heartbeats</div>
      <div>Uptime</div>
      <div>Response</div>
      <div>Interval</div>
      <div className="text-right">Last check</div>
      <div />
    </div>
  )
}

function MonitorRow({
  monitor,
  isSelected,
  onToggleSelect,
}: {
  monitor: Monitor
  isSelected?: boolean
  onToggleSelect?: (id: number) => void
}) {
  const dot = STATUS_DOT_CLASS[monitor.status] ?? "bg-muted-fg"
  const labelClass = STATUS_LABEL_CLASS[monitor.status] ?? "text-muted-fg"

  return (
    <div
      className="grid gap-x-4 px-6 py-3.5 border-t border-border items-center text-sm transition-colors hover:bg-muted/20"
      style={COL_STYLE}
    >
      {/* checkbox */}
      <div className="flex items-center justify-center">
        {onToggleSelect && (
          <Checkbox
            isSelected={isSelected}
            onChange={() => onToggleSelect(monitor.id)}
            aria-label={`Select ${monitor.name}`}
          />
        )}
      </div>

      {/* name + url */}
      <Link
        href={monitorRoutes.show.url(monitor.id)}
        className="flex items-center gap-3 min-w-0 no-underline"
      >
        <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${dot}`} />
        <div className="min-w-0">
          <div className="font-medium text-fg text-sm truncate">{monitor.name}</div>
          <div className="text-muted-fg text-xs truncate mt-0.5">
            {monitor.url || monitor.host || "—"}
          </div>
        </div>
      </Link>

      {/* type */}
      <div>
        <span className="border border-border rounded-lg text-muted-fg text-xs px-2 py-0.5 rounded-sm font-mono">
          {monitor.type.toUpperCase()}
        </span>
      </div>

      {/* heartbeats */}
      <HeartbeatBars heartbeats={monitor.heartbeats} status={monitor.status} />

      {/* uptime */}
      <div>
        <div
          className={`font-medium tabular-nums text-sm ${
            monitor.uptime_percentage !== undefined
              ? uptimeColor(monitor.uptime_percentage)
              : "text-muted-fg"
          }`}
        >
          {monitor.uptime_percentage !== undefined
            ? `${monitor.uptime_percentage.toFixed(2)}%`
            : "—"}
        </div>
        <div className="text-muted-fg text-xs mt-0.5">30d</div>
      </div>

      {/* response + sparkline */}
      <div>
        <div className="text-fg tabular-nums text-sm">
          {monitor.average_response_time != null
            ? `${Math.round(monitor.average_response_time)} ms`
            : "—"}
        </div>
        <ResponseSparkline heartbeats={monitor.heartbeats} status={monitor.status} />
      </div>

      {/* interval */}
      <div className="text-muted-fg text-xs font-mono">
        every {formatInterval(monitor.interval)}
      </div>

      {/* last check */}
      <div className="text-right">
        <div className="text-muted-fg text-xs font-mono">
          {monitor.status === "paused" ? "paused" : timeAgo(monitor.last_checked_at)}
        </div>
        <div className={`text-[10px] mt-0.5 uppercase tracking-wide font-mono ${labelClass}`}>
          {monitor.status}
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            router.visit(monitorRoutes.show.url(monitor.id))
          }}
          className="text-muted-fg hover:text-fg text-base leading-none p-1 rounded"
          aria-label={`Actions for ${monitor.name}`}
        >
          ⋯
        </button>
      </div>
    </div>
  )
}

function MonitorToolbar({
  monitors,
  tags,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
}: {
  monitors: Monitor[]
  tags: Tag[]
  searchQuery: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: any) => void
  tagFilter: number | null
  onTagFilterChange: (v: number | null) => void
}) {
  const counts = useMemo(() => statusCounts(monitors), [monitors])
  const statusPills = [
    { key: "all", label: "All", count: counts.all },
    { key: "up", label: "Up", count: counts.up },
    { key: "down", label: "Down", count: counts.down },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "paused", label: "Paused", count: counts.paused },
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-border">
      {/* left: status + tag pills */}
      <div className="flex flex-wrap items-center gap-2">
        {statusPills.map(({ key, label, count }) => {
          const active = statusFilter === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onStatusFilterChange(key)}
              className={[
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-fg"
                  : "border border-border rounded-lg text-muted-fg hover:text-fg hover:border-fg/30",
              ].join(" ")}
            >
              <span>{label}</span>
              <span className={active ? "opacity-70" : "text-muted-fg"}>{count}</span>
            </button>
          )
        })}

        {tags.length > 0 && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <span className="text-muted-fg text-xs">tags</span>
            {tags.map((tag) => {
              const active = tagFilter === tag.id
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onTagFilterChange(active ? null : tag.id)}
                  className={[
                    "px-3 py-1 rounded-full text-xs transition-colors",
                    active
                      ? "border-2 font-medium"
                      : "border border-border rounded-lg text-muted-fg hover:text-fg hover:border-fg/30",
                  ].join(" ")}
                  style={
                    active
                      ? { borderColor: tag.color, color: tag.color }
                      : undefined
                  }
                >
                  #{tag.name}
                </button>
              )
            })}
          </>
        )}
      </div>

      {/* right: search */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex items-center">
          <MagnifyingGlassIcon className="absolute left-2.5 size-3.5 text-muted-fg pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="name, url, tag…"
            className="pl-8 pr-8 py-1.5 text-xs rounded-md border border-border rounded-lg bg-transparent text-fg placeholder:text-muted-fg focus:outline-none focus:ring-1 focus:ring-ring w-52"
          />
          <span className="absolute right-2 text-[10px] text-muted-fg border border-border rounded-lg rounded px-1 pointer-events-none">
            /
          </span>
        </div>
      </div>
    </div>
  )
}

function MonitorTable({
  filteredMonitors,
  groups,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  isFiltering,
  setSearchQuery,
  setStatusFilter,
  setTagFilter,
}: {
  filteredMonitors: Monitor[]
  groups: MonitorGroup[]
  selectedIds: number[]
  toggleSelect: (id: number) => void
  toggleSelectAll: () => void
  isFiltering: boolean
  setSearchQuery: (v: string) => void
  setStatusFilter: (v: any) => void
  setTagFilter: (v: number | null) => void
}) {
  const groupedMonitors = filteredMonitors.reduce<Record<number, Monitor[]>>((acc, monitor) => {
    const groupId = monitor.monitor_group_id ?? 0
    if (!acc[groupId]) acc[groupId] = []
    acc[groupId].push(monitor)
    return acc
  }, {})

  const ungroupedMonitors = groupedMonitors[0] ?? []
  const hasGroups = groups.length > 0

  if (filteredMonitors.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-fg text-sm">No monitors match your filters.</p>
        <Button
          intent="plain"
          size="xs"
          onPress={() => {
            setSearchQuery("")
            setStatusFilter("all")
            setTagFilter(null)
          }}
          className="mt-2"
        >
          Clear filters
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* select-all row */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-border">
        <Checkbox
          isSelected={selectedIds.length === filteredMonitors.length && filteredMonitors.length > 0}
          onChange={toggleSelectAll}
          aria-label="Select all monitors"
        />
        <span className="text-xs text-muted-fg">Select all</span>
      </div>

      <TableHeader />

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
        <div>
          {hasGroups && groupedMonitors[0] && (
            <div className="px-6 py-2 text-muted-fg text-xs uppercase tracking-wider font-medium border-b border-border">
              Ungrouped
            </div>
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
            <MonitorGroupSection key={group.id} group={group} monitorCount={0}>
              <p className="py-4 text-center text-muted-fg text-sm">
                No monitors in this group.
              </p>
            </MonitorGroupSection>
          ))}
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

  const totalCount = monitors?.length ?? 0

  return (
    <>
      <Head title="Monitors" />
      <div className="min-h-screen">
        {/* page header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-fg">
              Monitors{" "}
              <span className="text-muted-fg font-normal text-lg">· {totalCount}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {trashedCount > 0 && (
              <Button intent="outline" size="sm" onPress={() => router.visit(monitorRoutes.trashed.url())}>
                Trash ({trashedCount})
              </Button>
            )}
            <MonitorGroupModal>
              <Button intent="outline" size="sm">
                Add Group
              </Button>
            </MonitorGroupModal>
            <ImportExportSection selectedIds={selectedIds} />
            <CreateMonitorModal>
              <Button size="sm">
                <PlusIcon data-slot="icon" />
                New monitor
              </Button>
            </CreateMonitorModal>
          </div>
        </div>

        {/* monitors table */}
        <WhenVisible
          fallback={
            <div className="space-y-px">
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="h-14 animate-pulse bg-muted/30" />
                ))}
            </div>
          }
          data="monitors"
        >
          {monitors && monitors.length > 0 ? (
            <>
              <MonitorToolbar
                monitors={monitors}
                tags={tags}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                tagFilter={tagFilter}
                onTagFilterChange={setTagFilter}
              />
              <BulkActionToolbar
                selectedIds={selectedIds}
                onClear={() => setSelectedIds([])}
              />
              <MonitorTable
                filteredMonitors={filteredMonitors}
                groups={groups}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                toggleSelectAll={toggleSelectAll}
                isFiltering={isFiltering}
                setSearchQuery={setSearchQuery}
                setStatusFilter={setStatusFilter}
                setTagFilter={setTagFilter}
              />

              {/* footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border text-xs text-muted-fg font-mono">
                <div>
                  showing {filteredMonitors.length} of {totalCount}
                </div>
                <div className="flex items-center gap-3">
                  <span>page 1 / 1</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
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
      </div>
    </>
  )
}

MonitorsIndex.layout = (page: React.ReactNode) => <AppLayout children={page} />
