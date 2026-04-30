import AppLayout from "@/layouts/app-layout"
import SettingsLayout from "@/layouts/settings-layout"
import { Head, useForm, router } from "@inertiajs/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import { Form } from "react-aria-components"
import { TextField } from "@/components/ui/text-field"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"
import type { Team, TeamMember } from "@/types/monitor"

interface Props {
  team: Team & { users: TeamMember[] }
}

export default function TeamsEdit({ team }: Props) {
  const teamForm = useForm({
    name: team.name,
  })

  const memberForm = useForm({
    email: "",
    role: "member" as string,
  })

  const submitTeam = (e: React.FormEvent) => {
    e.preventDefault()
    teamForm.patch(`/settings/teams/${team.id}`)
  }

  const submitMember = (e: React.FormEvent) => {
    e.preventDefault()
    memberForm.post(`/settings/teams/${team.id}/members`, {
      preserveScroll: true,
      onSuccess: () => memberForm.reset(),
    })
  }

  const updateRole = (userId: number, role: string) => {
    router.patch(
      `/settings/teams/${team.id}/members/${userId}`,
      { role },
      {
        preserveScroll: true,
      },
    )
  }

  const removeMember = (userId: number) => {
    router.delete(`/settings/teams/${team.id}/members/${userId}`, {
      preserveScroll: true,
    })
  }

  return (
    <>
      <Head title="Edit Team" />
      <Heading level={2} className="mb-6">
        Edit Team
      </Heading>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Form
              validationErrors={teamForm.errors}
              onSubmit={submitTeam}
              className="max-w-lg space-y-6"
            >
              <TextField value={teamForm.data.name} onChange={(v) => teamForm.setData("name", v)}>
                <Label>Team Name</Label>
                <Input />
                <FieldError>{teamForm.errors.name}</FieldError>
              </TextField>
              <div className="flex gap-2">
                <Button type="submit" isDisabled={teamForm.processing}>
                  Save Changes
                </Button>
                {!team.personal_team && (
                  <ConfirmDeleteModal
                    title="Delete Team"
                    description="Are you sure? All team data will be permanently deleted."
                    deleteUrl={`/settings/teams/${team.id}`}
                  >
                    <Button intent="danger">Delete Team</Button>
                  </ConfirmDeleteModal>
                )}
              </div>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Manage who has access to this team.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-3">
              {team.users.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-muted-foreground text-xs">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.pivot.role === "owner" ? (
                      <Badge>Owner</Badge>
                    ) : (
                      <>
                        <Select
                          selectedKey={member.pivot.role}
                          onSelectionChange={(role) => updateRole(member.id, role as string)}
                        >
                          <SelectTrigger className="w-28" />
                          <SelectContent
                            items={[
                              { id: "admin", name: "Admin" },
                              { id: "member", name: "Member" },
                              { id: "viewer", name: "Viewer" },
                            ]}
                          >
                            {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
                          </SelectContent>
                        </Select>
                        <Button intent="danger" size="sm" onPress={() => removeMember(member.id)}>
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Form
              validationErrors={memberForm.errors}
              onSubmit={submitMember}
              className="flex max-w-lg items-end gap-3"
            >
              <TextField
                value={memberForm.data.email}
                onChange={(v) => memberForm.setData("email", v)}
                className="flex-1"
              >
                <Label>Add Member</Label>
                <Input type="email" placeholder="user@example.com" />
                <FieldError>{memberForm.errors.email}</FieldError>
              </TextField>
              <Select
                selectedKey={memberForm.data.role}
                onSelectionChange={(v) => memberForm.setData("role", v as string)}
              >
                <Label>Role</Label>
                <SelectTrigger className="w-28" />
                <SelectContent
                  items={[
                    { id: "admin", name: "Admin" },
                    { id: "member", name: "Member" },
                    { id: "viewer", name: "Viewer" },
                  ]}
                >
                  {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
                </SelectContent>
              </Select>
              <Button type="submit" isDisabled={memberForm.processing}>
                Add
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

TeamsEdit.layout = (page: React.ReactNode) => (
  <AppLayout>
    <SettingsLayout>{page}</SettingsLayout>
  </AppLayout>
)
