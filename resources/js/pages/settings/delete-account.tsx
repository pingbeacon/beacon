import { useState } from "react"
import { Head, useForm } from "@inertiajs/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TextField } from "@/components/ui/text-field"
import { Button } from "@/components/ui/button"
import AppLayout from "@/layouts/app-layout"
import SettingsLayout from "@/layouts/settings-layout"
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal"
import DeleteAccountController from "@/actions/App/Http/Controllers/Settings/DeleteAccountController"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const title = "Delete Account"
export default function DeleteAccount() {
  const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false)
  const {
    data,
    setData,
    delete: destroy,
    processing,
    reset,
    errors,
  } = useForm({
    password: "",
  })

  const deleteUser = () => {
    destroy(DeleteAccountController.destroy().url, {
      preserveScroll: true,
      onSuccess: () => closeModal(),
      onFinish: () => reset(),
    })
  }

  const closeModal = () => {
    setConfirmingUserDeletion(false)
    reset()
  }

  return (
    <>
      <Head title={title} />
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="max-w-lg">
            Once your account is deleted, all of its resources and data will be permanently deleted.
            Before deleting your account, please download any data or information that you wish to
            retain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Modal onOpenChange={setConfirmingUserDeletion} isOpen={confirmingUserDeletion}>
            <Button onPress={() => setConfirmingUserDeletion(true)} intent="danger">
              Delete Account
            </Button>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Delete Account</ModalTitle>
                <ModalDescription>
                  Are you sure you want to delete your account? Once your account is deleted, all of
                  its resources and data will be permanently deleted. Please enter your password to
                  confirm you would like to permanently delete your account.
                </ModalDescription>
              </ModalHeader>

              <ModalBody>
                <TextField
                  value={data.password}
                  onChange={(v) => setData("password", v)}
                  isRequired
                >
                  <Label className="sr-only">Password</Label>
                  <Input type="password" placeholder="Password" />
                  <FieldError>{errors.password}</FieldError>
                </TextField>
              </ModalBody>
              <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                <Button intent="danger" type="submit" onPress={deleteUser} isDisabled={processing}>
                  Continue
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </CardContent>
      </Card>
    </>
  )
}

DeleteAccount.layout = (page: React.ReactNode) => (
  <AppLayout>
    <SettingsLayout>{page}</SettingsLayout>
  </AppLayout>
)
