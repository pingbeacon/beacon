import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/20/solid"
import { Head, router, WhenVisible } from "@inertiajs/react"
import { memo, useCallback, useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "@/components/ui/link"
import { Tracker } from "@/components/ui/tracker"
import { useMonitorFilters } from "@/hooks/use-monitor-filters"
import AppLayout from "@/layouts/app-layout"
import { uptimeColor } from "@/lib/color"
import { formatInterval, heartbeatsToTracker } from "@/lib/heartbeats"
import monitorRoutes from "@/routes/monitors"
import { useHydrateMonitors, useMonitors } from "@/stores/monitor-realtime"
import type { Heartbeat, Monitor, MonitorGroup, Tag } from "@/types/monitor"
import BulkActionToolbar from "./components/bulk-action-toolbar"
import CreateMonitorModal from "./components/create-monitor-modal"
import ImportExportSection from "./components/import-export-section"
import MonitorGroupModal from "./components/monitor-group-modal"
import MonitorGroupSection from "./components/monitor-group-section"

interface Props {
  monitors?: Monitor[]
  tags: Tag[]
  groups: MonitorGroup[]
  trashedCount: number
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

function HeartbeatBars({
  heartbeats,
  status,
  monitorName,
}: {
  heartbeats?: Heartbeat[]
  status: string
  monitorName: string
}) {
  if (status === "paused") {
    return (
      <div className="flex h-[22px] items-center">
        <span className="text-muted-fg text-xs">—</span>
      </div>
    )
  }

  return (
    <Tracker
      data={heartbeatsToTracker(heartbeats, HEARTBEAT_COUNT)}
      className="h-[22px] w-full"
      aria-label={`Uptime history for ${monitorName} — last ${HEARTBEAT_COUNT} checks`}
    />
  )
}

function ResponseSparkline({ heartbeats, status }: { heartbeats?: Heartbeat[]; status: string }) {
  const id = useId()

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
    return <div className="flex h-8 items-center text-muted-fg text-xs">—</div>
  }

  const isDown = status === "down"
  const colorVar = isDown ? "var(--color-danger)" : "var(--color-success)"

  return (
    <svg
      width="200"
      height="32"
      viewBox="0 0 120 24"
      preserveAspectRatio="none"
      className="mt-1 block"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colorVar} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.fill} fill={`url(#${id})`} />
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
  gridTemplateColumns:
    "32px minmax(0, 280px) 70px minmax(0, 0.9fr) 88px minmax(0, 220px) 84px 110px 36px",
}

function TableHeader() {
  return (
    <div
      className="grid gap-x-4 border-border border-b bg-muted/30 px-6 py-3 font-medium text-muted-fg text-xs uppercase tracking-wider"
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

type MonitorRowProps = {
  monitor: Monitor
  isSelected?: boolean
  onToggleSelect?: (id: number) => void
}

export function monitorRowAreEqual(
  prev: Pick<MonitorRowProps, "monitor" | "isSelected">,
  next: Pick<MonitorRowProps, "monitor" | "isSelected">,
): boolean {
  return prev.monitor === next.monitor && prev.isSelected === next.isSelected
}

function MonitorRowImpl({ monitor, isSelected, onToggleSelect }: MonitorRowProps) {
  const dot = STATUS_DOT_CLASS[monitor.status] ?? "bg-muted-fg"
  const labelClass = STATUS_LABEL_CLASS[monitor.status] ?? "text-muted-fg"

  return (
    <div
      className="grid items-center gap-x-4 border-border border-t px-6 py-3.5 text-sm transition-colors hover:bg-muted/20"
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
        className="flex min-w-0 items-center gap-3 no-underline"
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0">
          <div className="truncate font-medium text-fg text-sm">{monitor.name}</div>
          <div className="mt-0.5 truncate text-muted-fg text-xs">
            {monitor.url || monitor.host || "—"}
          </div>
        </div>
      </Link>

      {/* type */}
      <div>
        <span className="rounded-lg rounded-sm border border-border px-2 py-0.5 font-mono text-muted-fg text-xs">
          {monitor.type.toUpperCase()}
        </span>
      </div>

      {/* heartbeats */}
      <HeartbeatBars
        heartbeats={monitor.heartbeats}
        status={monitor.status}
        monitorName={monitor.name}
      />

      {/* uptime */}
      <div>
        <div
          className={`font-medium text-sm tabular-nums ${
            monitor.uptime_percentage !== undefined
              ? uptimeColor(monitor.uptime_percentage)
              : "text-muted-fg"
          }`}
        >
          {monitor.uptime_percentage !== undefined
            ? `${monitor.uptime_percentage.toFixed(2)}%`
            : "—"}
        </div>
        <div className="mt-0.5 text-muted-fg text-xs">30d</div>
      </div>

      {/* response + sparkline */}
      <div>
        <div className="text-fg text-sm tabular-nums">
          {monitor.average_response_time != null
            ? `${Math.round(monitor.average_response_time)} ms`
            : "—"}
        </div>
        <ResponseSparkline heartbeats={monitor.heartbeats} status={monitor.status} />
      </div>

      {/* interval */}
      <div className="font-mono text-muted-fg text-xs">
        every {formatInterval(monitor.interval)}
      </div>

      {/* last check */}
      <div className="text-right">
        <div className="font-mono text-muted-fg text-xs">
          {monitor.status === "paused" ? "paused" : timeAgo(monitor.last_checked_at)}
        </div>
        <div className={`mt-0.5 font-mono text-[10px] uppercase tracking-wide ${labelClass}`}>
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
          className="rounded p-1 text-base text-muted-fg leading-none hover:text-fg"
          aria-label={`Actions for ${monitor.name}`}
        >
          ⋯
        </button>
      </div>
    </div>
  )
}

const MonitorRow = memo(MonitorRowImpl, monitorRowAreEqual)

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
    <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-6 py-3">
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
                "flex items-center gap-1.5 rounded-full px-3 py-1 font-medium text-xs transition-colors",
                active
                  ? "bg-primary text-primary-fg"
                  : "rounded-lg border border-border text-muted-fg hover:border-fg/30 hover:text-fg",
              ].join(" ")}
            >
              <span>{label}</span>
              <span className={active ? "opacity-70" : "text-muted-fg"}>{count}</span>
            </button>
          )
        })}

        {tags.length > 0 && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            <span className="text-muted-fg text-xs">tags</span>
            {tags.map((tag) => {
              const active = tagFilter === tag.id
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onTagFilterChange(active ? null : tag.id)}
                  className={[
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-2 font-medium"
                      : "rounded-lg border border-border text-muted-fg hover:border-fg/30 hover:text-fg",
                  ].join(" ")}
                  style={active ? { borderColor: tag.color, color: tag.color } : undefined}
                >
                  #{tag.name}
                </button>
              )
            })}
          </>
        )}
      </div>

      {/* right: search */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative flex items-center">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 size-3.5 text-muted-fg" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="name, url, tag…"
            className="w-52 rounded-lg rounded-md border border-border bg-transparent py-1.5 pr-8 pl-8 text-fg text-xs placeholder:text-muted-fg focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="pointer-events-none absolute right-2 rounded rounded-lg border border-border px-1 text-[10px] text-muted-fg">
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
      <div className="flex items-center gap-2 border-border border-b px-6 py-2">
        <Checkbox
          isSelected={selectedIds.length === filteredMonitors.length && filteredMonitors.length > 0}
          onChange={toggleSelectAll}
          aria-label="Select all monitors"
        />
        <span className="text-muted-fg text-xs">Select all</span>
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
            <div className="border-border border-b px-6 py-2 font-medium text-muted-fg text-xs uppercase tracking-wider">
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
              <p className="py-4 text-center text-muted-fg text-sm">No monitors in this group.</p>
            </MonitorGroupSection>
          ))}
    </div>
  )
}

export default function MonitorsIndex({
  monitors: initialMonitors,
  tags,
  groups,
  trashedCount,
}: Props) {
  useHydrateMonitors(initialMonitors)
  const monitors = useMonitors()
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const {
    filteredMonitors,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
    isFiltering,
  } = useMonitorFilters(monitors)

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredMonitors.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredMonitors.map((m) => m.id))
    }
  }, [filteredMonitors, selectedIds.length])

  const totalCount = monitors.length

  return (
    <>
      <Head title="Monitors" />
      <div className="min-h-screen">
        {/* page header */}
        <div className="flex items-center justify-between gap-4 border-border border-b px-6 py-5">
          <div>
            <h1 className="font-medium text-2xl text-fg tracking-tight">
              Monitors <span className="font-normal text-lg text-muted-fg">· {totalCount}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {trashedCount > 0 && (
              <Button
                intent="outline"
                size="sm"
                onPress={() => router.visit(monitorRoutes.trashed.url())}
              >
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
              <BulkActionToolbar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
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
              <div className="flex items-center justify-between border-border border-t px-6 py-4 font-mono text-muted-fg text-xs">
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
              <p className="mt-1 text-muted-fg text-sm">
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
