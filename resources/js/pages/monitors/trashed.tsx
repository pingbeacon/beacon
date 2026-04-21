import AppLayout from "@/layouts/app-layout"
import { Head, router } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/components/ui/link"
import type { Monitor } from "@/types/monitor"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"

interface TrashedMonitor extends Monitor {
  deleted_at: string
}

interface Props {
  monitors: TrashedMonitor[]
}

export default function MonitorsTrashed({ monitors }: Props) {
  return (
    <>
      <Head title="Trashed Monitors" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader
            title="Trashed Monitors"
            description="Deleted monitors that can be restored."
          >
            <div data-slot="card-action">
              <Button intent="outline" onPress={() => router.visit("/monitors")}>
                Back to Monitors
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {monitors.length > 0 ? (
              <div className="space-y-2">
                {monitors.map((monitor) => (
                  <div
                    key={monitor.id}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <Badge intent="secondary">Deleted</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{monitor.name}</p>
                      <p className="text-muted-fg text-xs">
                        {monitor.type.toUpperCase()} - {monitor.url || monitor.host}
                      </p>
                      <p className="text-muted-fg text-xs">
                        Deleted {new Date(monitor.deleted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ButtonGroup>
                      <Button
                        intent="outline"
                        size="sm"
                        onPress={() =>
                          router.post(`/monitors/${monitor.id}/restore`, {}, { preserveScroll: true })
                        }
                      >
                        Restore
                      </Button>
                      <ConfirmDeleteModal
                        title="Permanently Delete Monitor"
                        description="Are you sure you want to permanently delete this monitor? This action cannot be undone and all associated data will be lost."
                        deleteUrl={`/monitors/${monitor.id}/force-delete`}
                      >
                        <Button intent="danger" size="sm">
                          Delete Forever
                        </Button>
                      </ConfirmDeleteModal>
                    </ButtonGroup>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-fg">
                <p className="font-medium text-lg">No trashed monitors</p>
                <p className="mt-1 text-sm">
                  Deleted monitors will appear here and can be restored.
                </p>
                <Link href="/monitors" className="mt-4 inline-block text-primary text-sm">
                  Back to Monitors
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

MonitorsTrashed.layout = (page: React.ReactNode) => <AppLayout children={page} />
