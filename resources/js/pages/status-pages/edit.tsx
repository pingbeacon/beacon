import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import StatusPageForm from "./components/status-page-form"
import type { Monitor, StatusPage } from "@/types/monitor"

interface Props {
  statusPage: StatusPage
  monitors: Monitor[]
}

export default function StatusPagesEdit({ statusPage, monitors }: Props) {
  return (
    <>
      <Head title={`Edit ${statusPage.title}`} />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader
            title={`Edit ${statusPage.title}`}
            description="Update your public status page configuration."
          />
          <CardContent>
            <StatusPageForm statusPage={statusPage} monitors={monitors} />
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

StatusPagesEdit.layout = (page: React.ReactNode) => <AppLayout children={page} />
