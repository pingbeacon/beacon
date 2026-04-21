import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MonitorForm from "./components/monitor-form"
import type { Monitor, MonitorGroup, Tag, NotificationChannel } from "@/types/monitor"

interface Props {
  monitor: Monitor
  tags: Tag[]
  notificationChannels: NotificationChannel[]
  groups: MonitorGroup[]
}

export default function MonitorsEdit({ monitor, tags, notificationChannels, groups }: Props) {
  return (
    <>
      <Head title={`Edit ${monitor.name}`} />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader title={`Edit ${monitor.name}`} description="Update monitor configuration." />
          <CardContent>
            <MonitorForm
              monitor={monitor}
              tags={tags}
              notificationChannels={notificationChannels}
              groups={groups}
            />
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

MonitorsEdit.layout = (page: React.ReactNode) => <AppLayout children={page} />
