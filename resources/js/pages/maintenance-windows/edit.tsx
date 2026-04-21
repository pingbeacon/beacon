import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MaintenanceWindowForm from "./components/maintenance-window-form"
import type { MaintenanceWindow, Monitor, MonitorGroup } from "@/types/monitor"

interface Props {
  maintenanceWindow: MaintenanceWindow
  monitors: Pick<Monitor, "id" | "name" | "type">[]
  groups: Pick<MonitorGroup, "id" | "name">[]
}

export default function MaintenanceWindowsEdit({ maintenanceWindow, monitors, groups }: Props) {
  return (
    <>
      <Head title={`Edit ${maintenanceWindow.title}`} />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader title={`Edit ${maintenanceWindow.title}`} description="Update maintenance window settings." />
          <CardContent>
            <MaintenanceWindowForm
              maintenanceWindow={maintenanceWindow}
              monitors={monitors}
              groups={groups}
            />
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

MaintenanceWindowsEdit.layout = (page: React.ReactNode) => <AppLayout children={page} />
