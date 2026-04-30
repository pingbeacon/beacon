import { Head, Link, router } from "@inertiajs/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/field"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import AppLayout from "@/layouts/app-layout"
import SettingsLayout from "@/layouts/settings-layout"
import type { AuditLog } from "@/types/monitor"

interface PaginatedData<T> {
  data: T[]
  current_page: number
  last_page: number
  next_page_url: string | null
  prev_page_url: string | null
}

interface Props {
  logs: PaginatedData<AuditLog>
  filters: {
    action?: string
    auditable_type?: string
  }
}

const actionColors: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  created: "success",
  updated: "warning",
  deleted: "danger",
  paused: "secondary",
  resumed: "success",
  restored: "success",
}

function formatType(type: string): string {
  const parts = type.split("\\")
  return parts[parts.length - 1] ?? type
}

export default function AuditLogIndex({ logs, filters }: Props) {
  const handleFilter = (key: string, value: string | null) => {
    router.get(
      "/settings/audit-log",
      {
        ...filters,
        [key]: value || undefined,
      },
      { preserveState: true },
    )
  }

  return (
    <>
      <Head title="Audit Log" />
      <Heading level={2} className="mb-6">
        Audit Log
      </Heading>

      <div className="mb-4 flex gap-3">
        <Select
          selectedKey={filters.action ?? ""}
          onSelectionChange={(v) => handleFilter("action", v as string)}
        >
          <Label className="sr-only">Action</Label>
          <SelectTrigger className="w-36" placeholder="All Actions" />
          <SelectContent
            items={[
              { id: "", name: "All Actions" },
              { id: "created", name: "Created" },
              { id: "updated", name: "Updated" },
              { id: "deleted", name: "Deleted" },
              { id: "paused", name: "Paused" },
              { id: "resumed", name: "Resumed" },
              { id: "restored", name: "Restored" },
            ]}
          >
            {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.data.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No audit logs found.</div>
          ) : (
            <div className="divide-y">
              {logs.data.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge intent={actionColors[log.action] ?? "secondary"}>{log.action}</Badge>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{log.user?.name ?? "System"}</span>{" "}
                        {log.action}{" "}
                        <span className="text-muted-foreground">
                          {formatType(log.auditable_type)}
                        </span>{" "}
                        #{log.auditable_id}
                      </p>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {logs.last_page > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {logs.prev_page_url && (
            <Link href={logs.prev_page_url}>
              <Button intent="outline" size="sm">
                Previous
              </Button>
            </Link>
          )}
          <span className="flex items-center px-3 text-muted-foreground text-sm">
            Page {logs.current_page} of {logs.last_page}
          </span>
          {logs.next_page_url && (
            <Link href={logs.next_page_url}>
              <Button intent="outline" size="sm">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </>
  )
}

AuditLogIndex.layout = (page: React.ReactNode) => (
  <AppLayout>
    <SettingsLayout>{page}</SettingsLayout>
  </AppLayout>
)
