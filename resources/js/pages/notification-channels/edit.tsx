import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import ChannelForm from "./components/channel-form"
import type { NotificationChannel } from "@/types/monitor"

interface Props {
  channel: NotificationChannel & { configuration: Record<string, string> }
}

export default function NotificationChannelsEdit({ channel }: Props) {
  return (
    <>
      <Head title="Edit Notification Channel" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader
            title="Edit Notification Channel"
            description="Update your notification channel settings."
          />
          <CardContent>
            <ChannelForm channel={channel} />
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

NotificationChannelsEdit.layout = (page: React.ReactNode) => <AppLayout children={page} />
