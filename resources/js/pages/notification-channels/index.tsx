import AppLayout from "@/layouts/app-layout"
import { Head, router } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusIcon } from "@heroicons/react/20/solid"
import CreateChannelModal from "./components/create-channel-modal"

interface NotificationChannel {
  id: number
  name: string
  type: string
  is_enabled: boolean
}

interface Props {
  channels: NotificationChannel[]
}

const typeLabels: Record<string, string> = {
  email: "Email",
  slack: "Slack",
  discord: "Discord",
  telegram: "Telegram",
}

export default function NotificationChannelsIndex({ channels }: Props) {
  return (
    <>
      <Head title="Notification Channels" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader
            title="Notification Channels"
            description="Manage how you receive alerts for your monitors."
          >
            <div data-slot="card-action">
              <CreateChannelModal />
            </div>
          </CardHeader>
          <CardContent>
            {channels.length > 0 ? (
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center gap-4 rounded-lg border p-4">
                    <Badge intent={channel.is_enabled ? "success" : "secondary"}>
                      {channel.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{channel.name}</p>
                      <p className="text-muted-fg text-xs">
                        {typeLabels[channel.type] ?? channel.type}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        intent="secondary"
                        size="sm"
                        onPress={() => router.visit(`/notification-channels/${channel.id}/edit`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-fg">
                <p className="font-medium text-lg">No notification channels yet</p>
                <p className="mt-1 text-sm">
                  Add a channel to receive alerts when your monitors go down.
                </p>
                <CreateChannelModal>
                  <Button className="mt-4">
                    <PlusIcon data-slot="icon" />
                    Add Channel
                  </Button>
                </CreateChannelModal>
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

NotificationChannelsIndex.layout = (page: React.ReactNode) => <AppLayout children={page} />
