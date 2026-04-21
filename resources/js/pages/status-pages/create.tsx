import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import StatusPageForm from "./components/status-page-form"
import type { Monitor } from "@/types/monitor"

interface Props {
  monitors: Monitor[]
}

export default function StatusPagesCreate({ monitors }: Props) {
  return (
    <>
      <Head title="Create Status Page" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader
            title="Create Status Page"
            description="Set up a public status page for your services."
          />
          <CardContent>
            <StatusPageForm monitors={monitors} />
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

StatusPagesCreate.layout = (page: React.ReactNode) => <AppLayout children={page} />
