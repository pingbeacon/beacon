import { Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import type { Monitor, MonitorGroup, NotificationChannel, Tag } from "@/types/monitor"
import MonitorWizard from "./components/monitor-wizard"

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
      <MonitorWizard
        monitor={monitor}
        tags={tags}
        notificationChannels={notificationChannels}
        groups={groups}
      />
    </>
  )
}

MonitorsEdit.layout = (page: React.ReactNode) => <AppLayout children={page} />
