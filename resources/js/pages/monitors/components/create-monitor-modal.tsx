import { useState } from "react"
import { useForm, router } from "@inertiajs/react"
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { NumberField, NumberInput } from "@/components/ui/number-field"
import { PlusIcon } from "@heroicons/react/20/solid"

const monitorTypes = [
  { id: "http", name: "HTTP(s)" },
  { id: "tcp", name: "TCP Port" },
  { id: "ping", name: "Ping" },
  { id: "dns", name: "DNS" },
  { id: "push", name: "Push" },
]

interface CreateMonitorModalProps {
  children?: React.ReactNode
}

export default function CreateMonitorModal({ children }: CreateMonitorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, errors, processing, reset } = useForm({
    name: "",
    type: "http",
    url: "",
    host: "",
    port: 443,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/monitors", {
      onSuccess: () => {
        setIsOpen(false)
        reset()
      },
    })
  }

  const moreSettings = () => {
    const params = new URLSearchParams()
    if (data.name) params.set("name", data.name)
    if (data.type) params.set("type", data.type)
    if (data.type === "http" && data.url) params.set("url", data.url)
    if ((data.type === "tcp" || data.type === "ping" || data.type === "dns") && data.host) {
      params.set("host", data.host)
    }
    if (data.type === "tcp" && data.port) params.set("port", String(data.port))
    const query = params.toString()
    router.visit(`/monitors/create${query ? `?${query}` : ""}`)
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
      {children ?? (
        <Button onPress={() => setIsOpen(true)}>
          <PlusIcon data-slot="icon" />
          Add Monitor
        </Button>
      )}
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Add Monitor</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form validationErrors={errors} onSubmit={submit} className="space-y-4" id="create-monitor-form">
            <TextField value={data.name} onChange={(v) => setData("name", v)} autoFocus>
              <Label>Name</Label>
              <Input placeholder="My Website" />
              <FieldError>{errors.name}</FieldError>
            </TextField>

            <Select selectedKey={data.type} onSelectionChange={(v) => setData("type", v as string)}>
              <Label>Monitor Type</Label>
              <SelectTrigger />
              <SelectContent items={monitorTypes}>
                {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
              </SelectContent>
              {errors.type && <FieldError>{errors.type}</FieldError>}
            </Select>

            {data.type === "http" && (
              <TextField value={data.url} onChange={(v) => setData("url", v)}>
                <Label>URL</Label>
                <Input placeholder="https://example.com" />
                <FieldError>{errors.url}</FieldError>
              </TextField>
            )}

            {(data.type === "tcp" || data.type === "ping" || data.type === "dns") && (
              <TextField value={data.host} onChange={(v) => setData("host", v)}>
                <Label>Host</Label>
                <Input placeholder="example.com" />
                <FieldError>{errors.host}</FieldError>
              </TextField>
            )}

            {data.type === "tcp" && (
              <NumberField
                value={data.port}
                onChange={(v) => setData("port", v)}
                minValue={1}
                maxValue={65535}
              >
                <Label>Port</Label>
                <NumberInput />
                <FieldError>{errors.port}</FieldError>
              </NumberField>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button intent="outline" onPress={moreSettings}>
            More Settings
          </Button>
          <Button type="submit" form="create-monitor-form" isDisabled={processing}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
