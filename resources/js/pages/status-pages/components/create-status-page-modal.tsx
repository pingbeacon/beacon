import { PlusIcon } from "@heroicons/react/20/solid"
import { router, useForm } from "@inertiajs/react"
import { useState } from "react"
import { Form } from "react-aria-components"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal"
import { TextField } from "@/components/ui/text-field"
import { Textarea } from "@/components/ui/textarea"

interface CreateStatusPageModalProps {
  children?: React.ReactNode
}

export default function CreateStatusPageModal({ children }: CreateStatusPageModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, errors, processing, reset } = useForm({
    title: "",
    slug: "",
    description: "",
    is_published: true,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/status-pages", {
      onSuccess: () => {
        setIsOpen(false)
        reset()
      },
    })
  }

  const handleTitleChange = (value: string) => {
    setData("title", value)
    setData(
      "slug",
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    )
  }

  const moreSettings = () => {
    const params = new URLSearchParams()
    if (data.title) params.set("title", data.title)
    if (data.slug) params.set("slug", data.slug)
    if (data.description) params.set("description", data.description)
    const query = params.toString()
    router.visit(`/status-pages/create${query ? `?${query}` : ""}`)
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
      {children ?? (
        <Button onPress={() => setIsOpen(true)}>
          <PlusIcon data-slot="icon" />
          New Status Page
        </Button>
      )}
      <ModalContent>
        <ModalHeader>
          <ModalTitle>New Status Page</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form
            validationErrors={errors}
            onSubmit={submit}
            className="space-y-4"
            id="create-status-page-form"
          >
            <TextField value={data.title} onChange={handleTitleChange} autoFocus>
              <Label>Title</Label>
              <Input placeholder="My Service Status" />
              <FieldError>{errors.title}</FieldError>
            </TextField>

            <TextField value={data.slug} onChange={(v) => setData("slug", v)}>
              <Label>Slug</Label>
              <Input placeholder="my-service-status" />
              <FieldError>{errors.slug}</FieldError>
            </TextField>

            <TextField value={data.description} onChange={(v) => setData("description", v)}>
              <Label>Description</Label>
              <Textarea placeholder="Current status of our services..." />
              <FieldError>{errors.description}</FieldError>
            </TextField>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button intent="outline" onPress={moreSettings}>
            More Settings
          </Button>
          <Button type="submit" form="create-status-page-form" isDisabled={processing}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
