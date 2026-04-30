import { Bars3Icon, Squares2X2Icon } from "@heroicons/react/20/solid"
import { useMemo } from "react"
import { Label } from "react-aria-components"
import { SegmentedToggle } from "@/components/primitives"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import type { Monitor, MonitorStatus, Tag } from "@/types/monitor"

export type MonitorsListSort = "status" | "name" | "uptime" | "response" | "last_check"
export type MonitorsListView = "list" | "grid"
export type MonitorsListStatusFilter = "all" | MonitorStatus | "degraded"

interface Counts {
  all: number
  up: number
  degraded: number
  down: number
  paused: number
}

function isDegraded(monitor: Monitor): boolean {
  return (
    monitor.status === "up" &&
    Array.isArray(monitor.heartbeats) &&
    monitor.heartbeats.some((hb) => hb.status !== "up")
  )
}

function computeCounts(monitors: Monitor[]): Counts {
  return {
    all: monitors.length,
    up: monitors.filter((m) => m.status === "up" && !isDegraded(m)).length,
    degraded: monitors.filter(isDegraded).length,
    down: monitors.filter((m) => m.status === "down").length,
    paused: monitors.filter((m) => m.status === "paused").length,
  }
}

const STATUS_PILL_ORDER: { key: MonitorsListStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "up", label: "Up" },
  { key: "degraded", label: "Degraded" },
  { key: "down", label: "Down" },
  { key: "paused", label: "Paused" },
]

const SORT_OPTIONS: { value: MonitorsListSort; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "name", label: "Name" },
  { value: "uptime", label: "Uptime" },
  { value: "response", label: "Response" },
  { value: "last_check", label: "Last check" },
]

interface Props {
  monitors: Monitor[]
  tags: Tag[]
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: MonitorsListStatusFilter
  onStatusFilterChange: (value: MonitorsListStatusFilter) => void
  tagFilter: number | null
  onTagFilterChange: (value: number | null) => void
  sort: MonitorsListSort
  onSortChange: (value: MonitorsListSort) => void
  view: MonitorsListView
  onViewChange: (value: MonitorsListView) => void
}

export function MonitorsToolbar({
  monitors,
  tags,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: Props) {
  const counts = useMemo(() => computeCounts(monitors), [monitors])

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-6 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_PILL_ORDER.map(({ key, label }) => {
          const count = counts[key as keyof Counts] ?? 0
          const active = statusFilter === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onStatusFilterChange(key)}
              aria-pressed={active}
              aria-label={`${label} ${count}`}
              className={[
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
                active
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              ].join(" ")}
            >
              <span>{label}</span>
              <span className={active ? "opacity-70" : "text-muted-foreground"}>{count}</span>
            </button>
          )
        })}

        {tags.length > 0 && (
          <>
            <div className="mx-1 h-4 w-px bg-border" aria-hidden />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">tags</span>
            {tags.map((tagItem) => {
              const active = tagFilter === tagItem.id
              return (
                <button
                  key={tagItem.id}
                  type="button"
                  onClick={() => onTagFilterChange(active ? null : tagItem.id)}
                  aria-pressed={active}
                  className={[
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-2 font-medium"
                      : "border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  ].join(" ")}
                  style={active ? { borderColor: tagItem.color, color: tagItem.color } : undefined}
                >
                  #{tagItem.name}
                </button>
              )
            })}
          </>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">sort</span>
        <Select
          aria-label="Sort"
          selectedKey={sort}
          onSelectionChange={(value) => onSortChange(value as MonitorsListSort)}
        >
          <Label className="sr-only">Sort</Label>
          <SelectTrigger className="h-7 w-32 px-2 text-xs" />
          <SelectContent items={SORT_OPTIONS}>
            {(option) => <SelectItem id={option.value}>{option.label}</SelectItem>}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground">view</span>
        <SegmentedToggle<MonitorsListView>
          value={view}
          onChange={onViewChange}
          size="sm"
          options={[
            {
              value: "list",
              icon: <Bars3Icon className="size-3.5" data-slot="icon" />,
              ariaLabel: "List view",
            },
            {
              value: "grid",
              icon: <Squares2X2Icon className="size-3.5" data-slot="icon" />,
              ariaLabel: "Grid view",
            },
          ]}
        />
      </div>
    </div>
  )
}
