import {
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  TrashIcon,
} from "@heroicons/react/20/solid"
import { router } from "@inertiajs/react"
import { memo, useState } from "react"
import {
  HeartbeatStatus,
  ResponseSparkline,
  StatusDot,
  type StatusDotStatus,
} from "@/components/primitives"
import { type HeartbeatTooltipBucket, HeartbeatTooltipStrip } from "./heartbeat-tooltip-strip"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "@/components/ui/link"
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu"
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal"
import { uptimeColor } from "@/lib/color"
import { formatInterval } from "@/lib/heartbeats"
import monitorRoutes from "@/routes/monitors"
import type { Heartbeat, Monitor } from "@/types/monitor"

const HEARTBEAT_BUCKET_COUNT = 48

const STATUS_LABEL_CLASS: Record<string, string> = {
  up: "text-success",
  down: "text-destructive",
  pending: "text-warning",
  paused: "text-muted-foreground",
  degraded: "text-warning",
}

export const MONITORS_LIST_COL_STYLE: React.CSSProperties = {
  gridTemplateColumns:
    "32px minmax(0, 280px) 70px minmax(0, 0.9fr) 88px minmax(0, 220px) 84px 110px 36px",
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return "—"
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function heartbeatBuckets(
  heartbeats: Heartbeat[] | undefined,
  status: string,
): HeartbeatTooltipBucket[] {
  if (status === "paused") {
    return Array.from({ length: HEARTBEAT_BUCKET_COUNT }, () => ({
      status: "paused" as HeartbeatStatus,
      heartbeat: null,
      emptyLabel: "paused",
    }))
  }

  const recent = (heartbeats ?? []).slice(-HEARTBEAT_BUCKET_COUNT)
  const padCount = Math.max(0, HEARTBEAT_BUCKET_COUNT - recent.length)
  const padding: HeartbeatTooltipBucket[] = Array.from({ length: padCount }, () => ({
    status: "pending" as HeartbeatStatus,
    heartbeat: null,
    emptyLabel: "no data",
  }))

  const buckets: HeartbeatTooltipBucket[] = recent.map((hb) => {
    const heartbeatStatus: HeartbeatStatus = hb.status === "down" ? "down" : "up"
    return {
      status: heartbeatStatus,
      heartbeat: hb,
    }
  })

  return [...padding, ...buckets]
}

function rowDotStatus(status: string): StatusDotStatus {
  if (status === "up") return "up"
  if (status === "down") return "down"
  if (status === "degraded") return "degraded"
  if (status === "paused") return "unknown"
  return "degraded"
}

function sparklinePoints(heartbeats: Heartbeat[] | undefined, status: string): number[] {
  if (!heartbeats || status === "paused") return []
  return heartbeats
    .slice(-40)
    .map((hb) => hb.response_time ?? 0)
    .filter((value) => value > 0)
}

function sparklineToneClass(status: string): string {
  if (status === "down") return "text-destructive"
  if (status === "degraded") return "text-warning"
  if (status === "paused" || status === "pending") return "text-muted-foreground"
  return "text-success"
}

export type MonitorRowProps = {
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
  const labelClass = STATUS_LABEL_CLASS[monitor.status] ?? "text-muted-foreground"

  return (
    <div
      data-testid={`monitor-row-${monitor.id}`}
      className="grid items-center gap-x-4 border-border border-t px-6 py-3.5 text-sm transition-colors hover:bg-muted/20"
      style={MONITORS_LIST_COL_STYLE}
    >
      <div className="flex items-center justify-center">
        {onToggleSelect && (
          <Checkbox
            isSelected={isSelected}
            onChange={() => onToggleSelect(monitor.id)}
            aria-label={`Select ${monitor.name}`}
          />
        )}
      </div>

      <Link
        href={monitorRoutes.show.url(monitor.id)}
        className="flex min-w-0 items-center gap-3 no-underline"
      >
        <StatusDot status={rowDotStatus(monitor.status)} />
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground text-sm">{monitor.name}</div>
          <div className="mt-0.5 truncate text-muted-foreground text-xs">
            {monitor.url || monitor.host || "—"}
          </div>
        </div>
      </Link>

      <div>
        <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-muted-foreground text-xs">
          {monitor.type.toUpperCase()}
        </span>
      </div>

      <HeartbeatTooltipStrip
        buckets={heartbeatBuckets(monitor.heartbeats, monitor.status)}
        height={22}
        ariaLabel={`Uptime history for ${monitor.name} — last ${HEARTBEAT_BUCKET_COUNT} checks`}
      />

      <div>
        <div
          className={`font-medium text-sm tabular-nums ${
            monitor.uptime_percentage !== undefined
              ? uptimeColor(monitor.uptime_percentage)
              : "text-muted-foreground"
          }`}
        >
          {monitor.uptime_percentage !== undefined
            ? `${monitor.uptime_percentage.toFixed(2)}%`
            : "—"}
        </div>
        <div className="mt-0.5 text-muted-foreground text-xs">30d</div>
      </div>

      <div>
        <div className="text-foreground text-sm tabular-nums">
          {monitor.average_response_time != null
            ? `${Math.round(monitor.average_response_time)} ms`
            : "—"}
        </div>
        {(() => {
          const points = sparklinePoints(monitor.heartbeats, monitor.status)
          return points.length >= 2 ? (
            <ResponseSparkline
              points={points}
              width={200}
              height={32}
              className={`mt-1 block ${sparklineToneClass(monitor.status)}`}
            />
          ) : (
            <div className="flex h-8 items-center text-muted-foreground text-xs">—</div>
          )
        })()}
      </div>

      <div className="font-mono text-muted-foreground text-xs">
        every {formatInterval(monitor.interval)}
      </div>

      <div className="text-right">
        <div className="font-mono text-muted-foreground text-xs">
          {monitor.status === "paused" ? "paused" : timeAgo(monitor.last_checked_at)}
        </div>
        <div className={`mt-0.5 font-mono text-[10px] uppercase tracking-wide ${labelClass}`}>
          {monitor.status}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <MonitorRowActions monitor={monitor} />
      </div>
    </div>
  )
}

function MonitorRowActions({ monitor }: { monitor: Monitor }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleDelete = () => {
    setProcessing(true)
    router.delete(monitorRoutes.destroy.url(monitor.id), {
      preserveScroll: true,
      onSuccess: () => setDeleteOpen(false),
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <>
      <Menu>
        <Button
          intent="plain"
          size="sm"
          aria-label={`Actions for ${monitor.name}`}
          className="size-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <EllipsisHorizontalIcon data-slot="icon" />
        </Button>
        <MenuContent placement="bottom end" className="sm:min-w-44">
          <MenuItem onAction={() => router.visit(monitorRoutes.show.url(monitor.id))}>
            <ArrowTopRightOnSquareIcon data-slot="icon" />
            <MenuLabel>Open</MenuLabel>
          </MenuItem>
          <MenuItem onAction={() => router.visit(monitorRoutes.edit.url(monitor.id))}>
            <PencilIcon data-slot="icon" />
            <MenuLabel>Edit</MenuLabel>
          </MenuItem>
          <MenuItem
            onAction={() =>
              router.post(monitorRoutes.toggle.url(monitor.id), {}, { preserveScroll: true })
            }
          >
            {monitor.is_active ? <PauseIcon data-slot="icon" /> : <PlayIcon data-slot="icon" />}
            <MenuLabel>{monitor.is_active ? "Pause" : "Resume"}</MenuLabel>
          </MenuItem>
          <MenuSeparator />
          <MenuItem intent="danger" onAction={() => setDeleteOpen(true)}>
            <TrashIcon data-slot="icon" />
            <MenuLabel>Delete</MenuLabel>
          </MenuItem>
        </MenuContent>
      </Menu>

      <Modal isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent role="alertdialog">
          <ModalHeader>
            <ModalTitle>Delete monitor</ModalTitle>
            <ModalDescription>
              {monitor.name} will be archived and can be restored from Trash.
            </ModalDescription>
          </ModalHeader>
          <ModalBody />
          <ModalFooter>
            <ModalClose>Cancel</ModalClose>
            <Button intent="danger" onPress={handleDelete} isDisabled={processing}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export const MonitorRow = memo(MonitorRowImpl, monitorRowAreEqual)

export function MonitorsListHeader() {
  return (
    <div
      className="grid gap-x-4 border-border border-b bg-muted/30 px-6 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"
      style={MONITORS_LIST_COL_STYLE}
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

export function MonitorCard({ monitor }: { monitor: Monitor }) {
  const points = sparklinePoints(monitor.heartbeats, monitor.status)

  return (
    <Link
      href={monitorRoutes.show.url(monitor.id)}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface/30 p-4 no-underline transition-colors hover:border-foreground/30"
      data-testid={`monitor-card-${monitor.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot status={rowDotStatus(monitor.status)} />
          <span className="truncate font-medium text-foreground text-sm">{monitor.name}</span>
        </div>
        <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {monitor.type.toUpperCase()}
        </span>
      </div>

      <div className="truncate text-muted-foreground text-xs">
        {monitor.url || monitor.host || "—"}
      </div>

      <HeartbeatTooltipStrip
        buckets={heartbeatBuckets(monitor.heartbeats, monitor.status)}
        height={20}
        ariaLabel={`Uptime history for ${monitor.name} — last ${HEARTBEAT_BUCKET_COUNT} checks`}
      />

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="kpi-label">Uptime · 30d</div>
          <div
            className={`font-medium text-sm tabular-nums ${
              monitor.uptime_percentage !== undefined
                ? uptimeColor(monitor.uptime_percentage)
                : "text-muted-foreground"
            }`}
          >
            {monitor.uptime_percentage !== undefined
              ? `${monitor.uptime_percentage.toFixed(2)}%`
              : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="kpi-label">Avg</div>
          <div className="text-foreground text-sm tabular-nums">
            {monitor.average_response_time != null
              ? `${Math.round(monitor.average_response_time)} ms`
              : "—"}
          </div>
        </div>
      </div>

      {points.length >= 2 && (
        <ResponseSparkline
          points={points}
          width={240}
          height={28}
          className={`block w-full ${sparklineToneClass(monitor.status)}`}
        />
      )}

      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
        <span>every {formatInterval(monitor.interval)}</span>
        <span>{monitor.status === "paused" ? "paused" : timeAgo(monitor.last_checked_at)}</span>
      </div>
    </Link>
  )
}
