import { Form, Head } from "@inertiajs/react"
import type React from "react"
import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Link } from "@/components/ui/link"
import { Loader } from "@/components/ui/loader"
import { TextField } from "@/components/ui/text-field"
import GuestLayout from "@/layouts/guest-layout"

interface LoginProps {
  status: string
  canResetPassword: boolean
}

export default function Login(args: LoginProps) {
  const { status, canResetPassword } = args
  return (
    <>
      <Head title="Log in" />

      {status && <div className="mb-4 font-medium text-success">{status}</div>}

      <Form
        method="post"
        action="/login"
        resetOnSuccess={["password"]}
        className="flex flex-col gap-y-4"
      >
        {({ processing, errors }) => (
          <>
            <TextField name="email" autoComplete="username" autoFocus>
              <Label>Email</Label>
              <Input type="email" />
              <FieldError>{errors.email}</FieldError>
            </TextField>
            <TextField name="password" autoComplete="current-password">
              <Label>Password</Label>
              <PasswordInput autoComplete="current-password" />
              <FieldError>{errors.password}</FieldError>
            </TextField>
            <div className="flex items-center justify-between">
              <Checkbox name="remember">Remember me</Checkbox>
              {canResetPassword && (
                <Link
                  href="/forgot-password"
                  className="text-base/6 text-primary hover:underline sm:text-sm/6"
                >
                  Forgot your password?
                </Link>
              )}
            </div>
            <Button isPending={processing} type="submit">
              {processing && <Loader />}
              Log in
            </Button>
            <div className="text-center">
              <Link
                href="/register"
                className="text-base/6 text-primary hover:underline sm:text-sm/6"
              >
                Don't have an account? Register
              </Link>
            </div>
          </>
        )}
      </Form>
    </>
  )
}

Login.layout = (page: React.ReactNode) => (
  <GuestLayout header="Welcome back" description="Sign in to your account." children={page} />
)
