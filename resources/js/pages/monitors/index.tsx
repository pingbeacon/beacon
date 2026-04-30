import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/20/solid"
import { Head, router, WhenVisible } from "@inertiajs/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useMonitorFilters } from "@/hooks/use-monitor-filters"
import AppLayout from "@/layouts/app-layout"
import monitorRoutes from "@/routes/monitors"
import { useHydrateMonitors, useMonitors } from "@/stores/monitor-realtime"
import type { Monitor, MonitorGroup, Tag } from "@/types/monitor"
import BulkActionToolbar from "./components/bulk-action-toolbar"
import ImportExportSection from "./components/import-export-section"
import { MonitorCard, MonitorRow, MonitorsListHeader } from "./components/monitor-row"
import MonitorGroupModal from "./components/monitor-group-modal"
import MonitorGroupSection from "./components/monitor-group-section"
import {
  type MonitorsListSort,
  type MonitorsListStatusFilter,
  type MonitorsListView,
  MonitorsToolbar,
} from "./components/monitors-toolbar"

export { monitorRowAreEqual } from "./components/monitor-row"

interface Props {
  monitors?: Monitor[]
  tags: Tag[]
  groups: MonitorGroup[]
  trashedCount: number
}

function isDegraded(monitor: Monitor): boolean {
  return (
    monitor.status === "up" &&
    Array.isArray(monitor.heartbeats) &&
    monitor.heartbeats.some((hb) => hb.status !== "up")
  )
}

function applyDegradedFilter(monitors: Monitor[], filter: MonitorsListStatusFilter): Monitor[] {
  if (filter !== "degraded") {
    return monitors
  }
  return monitors.filter(isDegraded)
}

function sortMonitors(monitors: Monitor[], sort: MonitorsListSort): Monitor[] {
  const sorted = [...monitors]

  switch (sort) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case "uptime":
      return sorted.sort((a, b) => (b.uptime_percentage ?? -1) - (a.uptime_percentage ?? -1))
    case "response":
      return sorted.sort(
        (a, b) => (a.average_response_time ?? Infinity) - (b.average_response_time ?? Infinity),
      )
    case "last_check":
      return sorted.sort((a, b) => {
        const aTime = a.last_checked_at ? new Date(a.last_checked_at).getTime() : 0
        const bTime = b.last_checked_at ? new Date(b.last_checked_at).getTime() : 0
        return bTime - aTime
      })
    default: {
      const order: Record<string, number> = { down: 0, paused: 1, pending: 2, up: 3 }
      return sorted.sort((a, b) => {
        const aRank = isDegraded(a) ? 0.5 : (order[a.status] ?? 4)
        const bRank = isDegraded(b) ? 0.5 : (order[b.status] ?? 4)
        return aRank - bRank
      })
    }
  }
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
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 20

  const {
    filteredMonitors,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
    sort,
    setSort,
    view,
    setView,
    isFiltering,
  } = useMonitorFilters(monitors)

  const sortedMonitors = useMemo(
    () => sortMonitors(applyDegradedFilter(filteredMonitors, statusFilter), sort),
    [filteredMonitors, statusFilter, sort],
  )

  const totalPages = Math.ceil(sortedMonitors.length / PAGE_SIZE)

  const visibleMonitors = useMemo(
    () => sortedMonitors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedMonitors, page, PAGE_SIZE],
  )

  useEffect(() => {
    setSelectedIds([])
    setPage(1)
  }, [searchQuery, statusFilter, tagFilter, view])

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === visibleMonitors.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(visibleMonitors.map((m) => m.id))
    }
  }, [visibleMonitors, selectedIds.length])

  const totalCount = monitors.length

  return (
    <>
      <Head title="Monitors" />
      <div className="min-h-screen">
        <div className="flex items-center justify-between gap-4 border-border border-b px-6 py-5">
          <div>
            <h1 className="font-medium text-2xl text-foreground tracking-tight">
              Monitors{" "}
              <span className="font-normal text-lg text-muted-foreground">· {totalCount}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div data-testid="monitors-header-search" className="relative flex w-64 items-center">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="name, url, tag…"
                aria-label="Search monitors"
                className="w-full rounded-md border border-border bg-transparent py-1.5 pr-8 pl-8 text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="pointer-events-none absolute right-2 rounded border border-border px-1 text-[10px] text-muted-foreground">
                /
              </span>
            </div>
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
            <Button size="sm" onPress={() => router.visit(monitorRoutes.create.url())}>
              <PlusIcon data-slot="icon" />
              New monitor
            </Button>
          </div>
        </div>

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
              <MonitorsToolbar
                monitors={monitors}
                tags={tags}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter as MonitorsListStatusFilter}
                onStatusFilterChange={(value) =>
                  setStatusFilter(
                    value as ReturnType<typeof setStatusFilter> extends any ? any : never,
                  )
                }
                tagFilter={tagFilter}
                onTagFilterChange={setTagFilter}
                sort={sort}
                onSortChange={setSort}
                view={view}
                onViewChange={setView}
              />
              <BulkActionToolbar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
              {view === "list" ? (
                <MonitorTable
                  filteredMonitors={visibleMonitors}
                  groups={groups}
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  toggleSelectAll={toggleSelectAll}
                  isFiltering={isFiltering}
                  setSearchQuery={setSearchQuery}
                  setStatusFilter={setStatusFilter}
                  setTagFilter={setTagFilter}
                />
              ) : (
                <MonitorGrid
                  filteredMonitors={visibleMonitors}
                  isFiltering={isFiltering}
                  setSearchQuery={setSearchQuery}
                  setStatusFilter={setStatusFilter}
                  setTagFilter={setTagFilter}
                />
              )}

              <div className="flex items-center justify-between border-border border-t px-6 py-4 font-mono text-muted-foreground text-xs">
                <div>
                  showing {(page - 1) * PAGE_SIZE + 1}-
                  {Math.min(page * PAGE_SIZE, sortedMonitors.length)} of {sortedMonitors.length}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="disabled:opacity-30"
                  >
                    prev
                  </button>
                  <span>
                    page {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="disabled:opacity-30"
                  >
                    next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <p className="font-medium text-foreground">No monitors yet</p>
              <p className="mt-1 text-muted-foreground text-sm">
                Add a URL, host, or IP to start tracking uptime.
              </p>
              <Button className="mt-4" onPress={() => router.visit(monitorRoutes.create.url())}>
                <PlusIcon data-slot="icon" />
                Add monitor
              </Button>
            </div>
          )}
        </WhenVisible>
      </div>
    </>
  )
}

MonitorsIndex.layout = (page: React.ReactNode) => <AppLayout children={page} />

interface ListProps {
  filteredMonitors: Monitor[]
  groups: MonitorGroup[]
  selectedIds: number[]
  toggleSelect: (id: number) => void
  toggleSelectAll: () => void
  isFiltering: boolean
  setSearchQuery: (v: string) => void
  setStatusFilter: (v: any) => void
  setTagFilter: (v: number | null) => void
}

function EmptyResults({
  isFiltering: _isFiltering,
  setSearchQuery,
  setStatusFilter,
  setTagFilter,
}: {
  isFiltering: boolean
  setSearchQuery: (v: string) => void
  setStatusFilter: (v: any) => void
  setTagFilter: (v: number | null) => void
}) {
  return (
    <div className="py-10 text-center">
      <p className="text-muted-foreground text-sm">No monitors match your filters.</p>
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
}: ListProps) {
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
      <EmptyResults
        isFiltering={isFiltering}
        setSearchQuery={setSearchQuery}
        setStatusFilter={setStatusFilter}
        setTagFilter={setTagFilter}
      />
    )
  }

  return (
    <div data-testid="monitors-list-view">
      <div className="flex items-center gap-2 border-border border-b px-6 py-2">
        <Checkbox
          isSelected={selectedIds.length === filteredMonitors.length && filteredMonitors.length > 0}
          onChange={toggleSelectAll}
          aria-label="Select all monitors"
        />
        <span className="text-muted-foreground text-xs">Select all</span>
      </div>

      <MonitorsListHeader />

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
            <div className="border-border border-b px-6 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
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
              <p className="py-4 text-center text-muted-foreground text-sm">
                No monitors in this group.
              </p>
            </MonitorGroupSection>
          ))}
    </div>
  )
}

function MonitorGrid({
  filteredMonitors,
  isFiltering,
  setSearchQuery,
  setStatusFilter,
  setTagFilter,
}: {
  filteredMonitors: Monitor[]
  isFiltering: boolean
  setSearchQuery: (v: string) => void
  setStatusFilter: (v: any) => void
  setTagFilter: (v: number | null) => void
}) {
  if (filteredMonitors.length === 0) {
    return (
      <EmptyResults
        isFiltering={isFiltering}
        setSearchQuery={setSearchQuery}
        setStatusFilter={setStatusFilter}
        setTagFilter={setTagFilter}
      />
    )
  }

  return (
    <div
      data-testid="monitors-grid-view"
      className="grid gap-3 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {filteredMonitors.map((monitor) => (
        <MonitorCard key={monitor.id} monitor={monitor} />
      ))}
    </div>
  )
}
