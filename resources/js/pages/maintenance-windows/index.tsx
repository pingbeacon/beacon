import { PlusIcon, TrashIcon } from "@heroicons/react/20/solid"
import { Head, router } from "@inertiajs/react"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Container } from "@/components/ui/container"
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs"
import AppLayout from "@/layouts/app-layout"
import type { MaintenanceWindow } from "@/types/monitor"

interface Props {
  maintenanceWindows: MaintenanceWindow[]
}

function WindowCard({ window }: { window: MaintenanceWindow }) {
  const isActive =
    new Date(window.start_time) <= new Date() && new Date(window.end_time) >= new Date()
  const isPast = new Date(window.end_time) < new Date()

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{window.title}</span>
          <Badge intent={window.is_active ? (isActive ? "warning" : "success") : "secondary"}>
            {!window.is_active ? "Disabled" : isActive ? "Active" : isPast ? "Past" : "Upcoming"}
          </Badge>
          {window.is_recurring && <Badge intent="info">{window.recurrence_type}</Badge>}
        </div>
        {window.description && (
          <p className="mt-1 text-muted-foreground text-xs">{window.description}</p>
        )}
        <p className="mt-1 text-muted-foreground text-xs">
          {new Date(window.start_time).toLocaleString()} —{" "}
          {new Date(window.end_time).toLocaleString()}
        </p>
        <p className="text-muted-foreground text-xs">
          {window.monitors?.length ?? 0} monitors, {window.monitor_groups?.length ?? 0} groups
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          intent="outline"
          size="sm"
          onPress={() => router.visit(`/maintenance-windows/${window.id}/edit`)}
        >
          Edit
        </Button>
        <ConfirmDeleteModal
          title="Delete Maintenance Window"
          description="Are you sure you want to delete this maintenance window?"
          deleteUrl={`/maintenance-windows/${window.id}`}
        >
          <Button intent="danger" size="sm">
            <TrashIcon data-slot="icon" />
          </Button>
        </ConfirmDeleteModal>
      </div>
    </div>
  )
}

export default function MaintenanceWindowsIndex({ maintenanceWindows }: Props) {
  const now = new Date()
  const active = maintenanceWindows.filter(
    (w) => w.is_active && new Date(w.start_time) <= now && new Date(w.end_time) >= now,
  )
  const upcoming = maintenanceWindows.filter((w) => w.is_active && new Date(w.start_time) > now)
  const past = maintenanceWindows.filter((w) => new Date(w.end_time) < now || !w.is_active)

  return (
    <>
      <Head title="Maintenance Windows" />
      <Container className="pt-2 pb-8">
        <Card>
          <CardHeader
            title="Maintenance Windows"
            description="Schedule maintenance to suppress notifications."
          >
            <div data-slot="card-action">
              <Button onPress={() => router.visit("/maintenance-windows/create")}>
                <PlusIcon data-slot="icon" />
                Add Window
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {maintenanceWindows.length > 0 ? (
              <Tabs>
                <TabList>
                  <Tab id="active">Active ({active.length})</Tab>
                  <Tab id="upcoming">Upcoming ({upcoming.length})</Tab>
                  <Tab id="past">Past ({past.length})</Tab>
                </TabList>
                <TabPanel id="active" className="space-y-2 pt-4">
                  {active.length > 0 ? (
                    active.map((w) => <WindowCard key={w.id} window={w} />)
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No active maintenance windows.
                    </p>
                  )}
                </TabPanel>
                <TabPanel id="upcoming" className="space-y-2 pt-4">
                  {upcoming.length > 0 ? (
                    upcoming.map((w) => <WindowCard key={w.id} window={w} />)
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No upcoming maintenance windows.
                    </p>
                  )}
                </TabPanel>
                <TabPanel id="past" className="space-y-2 pt-4">
                  {past.length > 0 ? (
                    past.map((w) => <WindowCard key={w.id} window={w} />)
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No past maintenance windows.
                    </p>
                  )}
                </TabPanel>
              </Tabs>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <p className="font-medium text-lg">No maintenance windows</p>
                <p className="mt-1 text-sm">
                  Schedule maintenance to suppress notifications during planned downtime.
                </p>
                <Button
                  className="mt-4"
                  onPress={() => router.visit("/maintenance-windows/create")}
                >
                  <PlusIcon data-slot="icon" />
                  Add Window
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

MaintenanceWindowsIndex.layout = (page: React.ReactNode) => <AppLayout children={page} />
