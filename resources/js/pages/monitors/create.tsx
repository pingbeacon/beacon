import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MonitorForm from "./components/monitor-form"
import type { MonitorGroup, Tag, NotificationChannel } from "@/types/monitor"

interface Props {
  tags: Tag[]
  notificationChannels: NotificationChannel[]
  groups: MonitorGroup[]
}

export default function MonitorsCreate({ tags, notificationChannels, groups }: Props) {
  return (
    <>
      <Head title="Create Monitor" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader title="Create Monitor" description="Add a new monitor to track uptime." />
          <CardContent>
            <MonitorForm tags={tags} notificationChannels={notificationChannels} groups={groups} />
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

MonitorsCreate.layout = (page: React.ReactNode) => <AppLayout children={page} />
