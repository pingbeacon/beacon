import { useEffect, useState } from "react"
import MonitorNotificationDeliveryController from "@/actions/App/Http/Controllers/MonitorNotificationDeliveryController"
import { SegmentedToggle, type SegmentedToggleOption } from "@/components/primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { NotificationDelivery, NotificationDeliveryStatus } from "@/types/monitor"

type Filter = "all" | "delivered" | "failed"

interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

interface DeliveryPayload {
  data: NotificationDelivery[]
  meta: PaginationMeta
}

interface Props {
  monitorId: number
  fetcher?: (url: string) => Promise<DeliveryPayload>
}

const FILTER_OPTIONS: SegmentedToggleOption<Filter>[] = [
  { value: "all", label: "All" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
]

const channelTypeLabel: Record<string, string> = {
  email: "Email",
  slack: "Slack",
  discord: "Discord",
  telegram: "Telegram",
  webhook: "Webhook",
}

function formatLatency(ms: number | null): string {
  if (ms == null) {
    return "—"
  }
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const defaultFetcher = (url: string): Promise<DeliveryPayload> =>
  fetch(url, { headers: { Accept: "application/json" } }).then((r) => {
    if (!r.ok) {
      throw new Error(`Failed to load deliveries (${r.status})`)
    }
    return r.json()
  })

function statusIntent(status: NotificationDeliveryStatus): "success" | "danger" {
  return status === "delivered" ? "success" : "danger"
}

export function NotificationDeliveryLog({ monitorId, fetcher = defaultFetcher }: Props) {
  const [filter, setFilter] = useState<Filter>("all")
  const [page, setPage] = useState(1)
  const [payload, setPayload] = useState<DeliveryPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const url = MonitorNotificationDeliveryController.index.url(monitorId, {
      query: { status: filter, page },
    })
    fetcher(url)
      .then((data) => {
        if (!cancelled) {
          setPayload(data)
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [monitorId, filter, page, fetcher])

  function changeFilter(next: Filter) {
    if (next === filter) {
      return
    }
    setFilter(next)
    setPage(1)
  }

  const rows = payload?.data ?? []
  const meta = payload?.meta

  return (
    <section aria-label="Notification delivery log" className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Delivery log</h2>
        <SegmentedToggle
          aria-label="Delivery status filter"
          value={filter}
          onChange={changeFilter}
          options={FILTER_OPTIONS}
          size="sm"
        />
      </header>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <Table aria-label="Notification deliveries">
        <TableHeader>
          <TableColumn isRowHeader>Time</TableColumn>
          <TableColumn>Channel</TableColumn>
          <TableColumn>Event</TableColumn>
          <TableColumn>Incident</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Latency</TableColumn>
          <TableColumn>Notes</TableColumn>
        </TableHeader>
        <TableBody
          renderEmptyState={() => (
            <p className="py-6 text-center text-muted-foreground text-sm">
              {loading ? "Loading deliveries…" : "No deliveries match this filter yet."}
            </p>
          )}
        >
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">
                {formatTimestamp(row.dispatched_at)}
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground text-xs uppercase">
                  {channelTypeLabel[row.channel?.type ?? ""] ?? row.channel?.type ?? "—"}
                </span>{" "}
                <span>{row.channel?.name ?? `#${row.channel_id}`}</span>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">{row.event_type}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {row.incident_id ? `#${row.incident_id}` : "—"}
              </TableCell>
              <TableCell>
                <Badge intent={statusIntent(row.status)} isCircle={false}>
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{formatLatency(row.latency_ms)}</TableCell>
              <TableCell className="text-destructive text-xs">{row.error ?? ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {meta && meta.last_page > 1 && (
        <footer className="flex items-center justify-between text-muted-foreground text-xs">
          <span>
            Page {meta.current_page} of {meta.last_page} · {meta.total} deliveries
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              intent="outline"
              isDisabled={meta.current_page <= 1 || loading}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              intent="outline"
              isDisabled={meta.current_page >= meta.last_page || loading}
              onPress={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </footer>
      )}
    </section>
  )
}
