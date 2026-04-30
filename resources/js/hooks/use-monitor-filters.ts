import { useCallback, useMemo, useState } from "react"
import type { Monitor, MonitorStatus } from "@/types/monitor"

export type StatusFilterValue = "all" | MonitorStatus | "degraded"
export type ViewModeValue = "list" | "grid"
export type SortValue = "status" | "name" | "uptime" | "response" | "last_check"

const STATUS_VALUES: StatusFilterValue[] = [
  "all",
  "up",
  "down",
  "pending",
  "paused",
  "degraded",
]
const VIEW_VALUES: ViewModeValue[] = ["list", "grid"]
const SORT_VALUES: SortValue[] = ["status", "name", "uptime", "response", "last_check"]

interface FilterState {
  search: string
  status: StatusFilterValue
  tag: number | null
  view: ViewModeValue
  sort: SortValue
}

function parseEnum<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value ?? "") ? (value as T) : fallback
}

function readFromUrl(): FilterState {
  if (typeof window === "undefined") {
    return { search: "", status: "all", tag: null, view: "list", sort: "status" }
  }
  const params = new URLSearchParams(window.location.search)
  return {
    search: params.get("search") ?? "",
    status: parseEnum(params.get("status"), STATUS_VALUES, "all"),
    tag: params.get("tag") ? Number(params.get("tag")) : null,
    view: parseEnum(params.get("view"), VIEW_VALUES, "list"),
    sort: parseEnum(params.get("sort"), SORT_VALUES, "status"),
  }
}

function syncToUrl(filters: FilterState): void {
  if (typeof window === "undefined") return
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.tag !== null) params.set("tag", String(filters.tag))
  if (filters.view !== "list") params.set("view", filters.view)
  if (filters.sort !== "status") params.set("sort", filters.sort)
  const query = params.toString()
  history.replaceState(null, "", query ? `?${query}` : window.location.pathname)
}

export function useMonitorFilters(monitors: Monitor[]) {
  const [filters, setFilters] = useState<FilterState>(readFromUrl)

  const update = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch }
      syncToUrl(next)
      return next
    })
  }, [])

  const setSearchQuery = useCallback((search: string) => update({ search }), [update])
  const setStatusFilter = useCallback((status: StatusFilterValue) => update({ status }), [update])
  const setTagFilter = useCallback((tag: number | null) => update({ tag }), [update])
  const setView = useCallback((view: ViewModeValue) => update({ view }), [update])
  const setSort = useCallback((sort: SortValue) => update({ sort }), [update])

  const filteredMonitors = useMemo(() => {
    let result = monitors

    if (filters.search) {
      const query = filters.search.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.url?.toLowerCase().includes(query) ||
          m.host?.toLowerCase().includes(query),
      )
    }

    if (filters.status !== "all" && filters.status !== "degraded") {
      result = result.filter((m) => m.status === filters.status)
    }

    if (filters.tag !== null) {
      result = result.filter((m) => m.tags?.some((t) => t.id === filters.tag))
    }

    return result
  }, [monitors, filters])

  const isFiltering = filters.search !== "" || filters.status !== "all" || filters.tag !== null

  return {
    filteredMonitors,
    searchQuery: filters.search,
    setSearchQuery,
    statusFilter: filters.status,
    setStatusFilter,
    tagFilter: filters.tag,
    setTagFilter,
    view: filters.view,
    setView,
    sort: filters.sort,
    setSort,
    isFiltering,
  }
}
