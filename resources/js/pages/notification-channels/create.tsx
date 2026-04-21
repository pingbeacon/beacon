import AppLayout from "@/layouts/app-layout"
import { Head } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import ChannelForm from "./components/channel-form"

export default function NotificationChannelsCreate() {
  return (
    <>
      <Head title="Add Notification Channel" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader
            title="Add Notification Channel"
            description="Configure a new channel to receive uptime alerts."
          />
          <CardContent>
            <ChannelForm />
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

NotificationChannelsCreate.layout = (page: React.ReactNode) => <AppLayout children={page} />
