import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import MonitorWizard from "./components/monitor-wizard"
import type { MonitorGroup, Tag, NotificationChannel } from "@/types/monitor"

interface Props {
  tags: Tag[]
  notificationChannels: NotificationChannel[]
  groups: MonitorGroup[]
}

export default function MonitorsCreate({ tags, notificationChannels, groups }: Props) {
  return (
    <>
      <Head title="New Monitor" />
      <MonitorWizard tags={tags} notificationChannels={notificationChannels} groups={groups} />
    </>
  )
}

MonitorsCreate.layout = (page: React.ReactNode) => <AppLayout children={page} />
