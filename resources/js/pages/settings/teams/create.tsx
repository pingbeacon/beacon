import { Head, useForm } from "@inertiajs/react"
import { Form } from "react-aria-components"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FieldError, Label } from "@/components/ui/field"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { TextField } from "@/components/ui/text-field"
import AppLayout from "@/layouts/app-layout"
import SettingsLayout from "@/layouts/settings-layout"

export default function TeamsCreate() {
  const { data, setData, post, errors, processing } = useForm({
    name: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/settings/teams")
  }

  return (
    <>
      <Head title="Create Team" />
      <Heading level={2} className="mb-6">
        Create Team
      </Heading>
      <Card>
        <CardContent className="pt-6">
          <Form validationErrors={errors} onSubmit={submit} className="max-w-lg space-y-6">
            <TextField value={data.name} onChange={(v) => setData("name", v)} autoFocus>
              <Label>Team Name</Label>
              <Input placeholder="My Team" />
              <FieldError>{errors.name}</FieldError>
            </TextField>
            <Button type="submit" isDisabled={processing}>
              Create Team
            </Button>
          </Form>
        </CardContent>
      </Card>
    </>
  )
}

TeamsCreate.layout = (page: React.ReactNode) => (
  <AppLayout>
    <SettingsLayout>{page}</SettingsLayout>
  </AppLayout>
)
