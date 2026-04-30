import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MaintenanceWindowForm from "./components/maintenance-window-form"
import type { Monitor, MonitorGroup } from "@/types/monitor"

interface Props {
  monitors: Pick<Monitor, "id" | "name" | "type">[]
  groups: Pick<MonitorGroup, "id" | "name">[]
}

export default function MaintenanceWindowsCreate({ monitors, groups }: Props) {
  return (
    <>
      <Head title="Create Maintenance Window" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader
            title="Create Maintenance Window"
            description="Schedule maintenance to suppress notifications."
          />
          <CardContent>
            <MaintenanceWindowForm monitors={monitors} groups={groups} />
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

MaintenanceWindowsCreate.layout = (page: React.ReactNode) => <AppLayout children={page} />
