import { Head } from "@inertiajs/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Container } from "@/components/ui/container"
import AppLayout from "@/layouts/app-layout"
import type { Monitor, MonitorGroup } from "@/types/monitor"
import MaintenanceWindowForm from "./components/maintenance-window-form"

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
