import { Form, Head } from "@inertiajs/react"
import ConfirmablePasswordController from "@/actions/App/Http/Controllers/Auth/ConfirmablePasswordController"
import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Loader } from "@/components/ui/loader"
import { TextField } from "@/components/ui/text-field"
import GuestLayout from "@/layouts/guest-layout"

export default function ConfirmPassword() {
  return (
    <>
      <Head title="Confirm Password" />

      <div className="mb-4 text-muted-foreground text-sm">
        This is a secure area of the application. Please confirm your password before continuing.
      </div>

      <Form {...ConfirmablePasswordController.store.form()} resetOnSuccess={["password"]}>
        {({ processing, errors }) => (
          <>
            <TextField id="password" name="password" autoFocus>
              <Label>Password</Label>
              <PasswordInput autoComplete="current-password" />
              <FieldError>{errors.password}</FieldError>
            </TextField>

            <div className="mt-4 flex items-center justify-end">
              <Button isPending={processing}>
                {processing && <Loader />}
                Confirm
              </Button>
            </div>
          </>
        )}
      </Form>
    </>
  )
}

ConfirmPassword.layout = (page: React.ReactNode) => (
  <GuestLayout header="Confirm password" children={page} />
)
