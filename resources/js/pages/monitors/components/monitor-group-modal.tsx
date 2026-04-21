import { useState } from "react"
import { useForm } from "@inertiajs/react"
import { Form } from "react-aria-components"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal"
import { TextField } from "@/components/ui/text-field"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { MonitorGroup } from "@/types/monitor"

interface MonitorGroupModalProps {
  group?: MonitorGroup
  children: React.ReactNode
}

export default function MonitorGroupModal({ group, children }: MonitorGroupModalProps) {
  const isEditing = !!group
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, patch, errors, processing, reset } = useForm({
    name: group?.name ?? "",
    description: group?.description ?? "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      patch(`/monitor-groups/${group.id}`, {
        onSuccess: () => setIsOpen(false),
      })
    } else {
      post("/monitor-groups", {
        onSuccess: () => {
          setIsOpen(false)
          reset()
        },
      })
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
      {children}
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{isEditing ? "Edit Group" : "Create Group"}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form validationErrors={errors} onSubmit={submit} className="space-y-4" id="group-form">
            <TextField value={data.name} onChange={(v) => setData("name", v)} autoFocus>
              <Label>Name</Label>
              <Input placeholder="Production Servers" />
              <FieldError>{errors.name}</FieldError>
            </TextField>

            <TextField value={data.description ?? ""} onChange={(v) => setData("description", v)}>
              <Label>Description (optional)</Label>
              <Textarea placeholder="Group description..." />
              <FieldError>{errors.description}</FieldError>
            </TextField>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button intent="outline" onPress={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="group-form" isDisabled={processing}>
            {isEditing ? "Update" : "Create"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
