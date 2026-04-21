import AppLayout from "@/layouts/app-layout"
import { Head, router } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/components/ui/link"
import type { StatusPage } from "@/types/monitor"
import { PlusIcon } from "@heroicons/react/20/solid"
import CreateStatusPageModal from "./components/create-status-page-modal"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"

interface StatusPageWithCount extends StatusPage {
  monitors_count: number
}

interface Props {
  statusPages: StatusPageWithCount[]
}

export default function StatusPagesIndex({ statusPages }: Props) {
  return (
    <>
      <Head title="Status Pages" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader title="Status Pages" description="Share public status pages with your users.">
            <div data-slot="card-action">
              <CreateStatusPageModal />
            </div>
          </CardHeader>
          <CardContent>
            {statusPages.length > 0 ? (
              <div className="space-y-2">
                {statusPages.map((statusPage) => (
                  <div
                    key={statusPage.id}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{statusPage.title}</span>
                        <Badge intent={statusPage.is_published ? "success" : "secondary"}>
                          {statusPage.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-muted-fg text-xs">
                        <span>
                          {statusPage.monitors_count} monitor
                          {statusPage.monitors_count !== 1 ? "s" : ""}
                        </span>
                        <span>/status/{statusPage.slug}</span>
                      </div>
                    </div>
                    <ButtonGroup>
                      <Button
                        intent="outline"
                        size="sm"
                        onPress={() => window.open(`/status/${statusPage.slug}`, "_blank")}
                      >
                        View
                      </Button>
                      <Button
                        intent="outline"
                        size="sm"
                        onPress={() => router.visit(`/status-pages/${statusPage.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <ConfirmDeleteModal
                        title="Delete Status Page"
                        description="Are you sure you want to delete this status page? This action cannot be undone."
                        deleteUrl={`/status-pages/${statusPage.id}`}
                      >
                        <Button intent="danger" size="sm">
                          Delete
                        </Button>
                      </ConfirmDeleteModal>
                    </ButtonGroup>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-fg">
                <p className="font-medium text-lg">No status pages yet</p>
                <p className="mt-1 text-sm">
                  Create a public status page to share uptime with your users.
                </p>
                <CreateStatusPageModal>
                  <Button className="mt-4">
                    <PlusIcon data-slot="icon" />
                    New Status Page
                  </Button>
                </CreateStatusPageModal>
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

StatusPagesIndex.layout = (page: React.ReactNode) => <AppLayout children={page} />
