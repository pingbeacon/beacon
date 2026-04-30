import { Head, Link } from "@inertiajs/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import AppLayout from "@/layouts/app-layout"
import SettingsLayout from "@/layouts/settings-layout"
import type { Team } from "@/types/monitor"

interface Props {
  teams: (Team & { pivot: { role: string } })[]
}

export default function TeamsIndex({ teams }: Props) {
  return (
    <>
      <Head title="Teams" />
      <div className="mb-6 flex items-center justify-between">
        <Heading level={2}>Teams</Heading>
        <Link href="/settings/teams/create">
          <Button>Create Team</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span className="font-medium">{team.name}</span>
                {team.personal_team && <Badge intent="secondary">Personal</Badge>}
                <Badge>{team.pivot.role}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  {team.users_count ?? 0} members
                </span>
                <Link href={`/settings/teams/${team.id}/edit`}>
                  <Button intent="secondary" size="sm">
                    Manage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

TeamsIndex.layout = (page: React.ReactNode) => (
  <AppLayout>
    <SettingsLayout>{page}</SettingsLayout>
  </AppLayout>
)
