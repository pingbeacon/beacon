import { Form, Head } from "@inertiajs/react"
import type React from "react"
import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Link } from "@/components/ui/link"
import { Loader } from "@/components/ui/loader"
import { TextField } from "@/components/ui/text-field"
import GuestLayout from "@/layouts/guest-layout"

export default function Register() {
  return (
    <>
      <Head title="Register" />

      <Form
        method="post"
        action="/register"
        resetOnSuccess={["password", "password_confirmation"]}
        disableWhileProcessing
        className="flex flex-col gap-y-4"
      >
        {({ processing, errors }) => (
          <>
            <TextField name="name" autoComplete="name" autoFocus>
              <Label>Name</Label>
              <Input type="text" placeholder="Your name" />
              <FieldError>{errors.name}</FieldError>
            </TextField>

            <TextField name="email" autoComplete="username">
              <Label>Email</Label>
              <Input type="email" placeholder="you@domain.com" />
              <FieldError>{errors.email}</FieldError>
            </TextField>
            <TextField name="password" autoComplete="new-password">
              <Label>Password</Label>
              <PasswordInput autoComplete="new-password" />
              <FieldError>{errors.password}</FieldError>
            </TextField>

            <TextField name="password_confirmation">
              <Label>Confirm password</Label>
              <PasswordInput autoComplete="new-password" />
              <FieldError>{errors.password_confirmation}</FieldError>
            </TextField>
            <Button type="submit" className="w-full" isPending={processing}>
              {processing && <Loader />}
              Register
            </Button>
            <div className="text-center">
              <Link
                href="/login"
                className="text-base/6 text-primary-subtle-fg hover:underline sm:text-sm/6"
              >
                Already registered?
              </Link>
            </div>
          </>
        )}
      </Form>
    </>
  )
}

Register.layout = (page: React.ReactNode) => (
  <GuestLayout header="Register" description="Create an account to get started." children={page} />
)
