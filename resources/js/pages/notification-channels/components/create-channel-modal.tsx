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
import { PlusIcon } from "@heroicons/react/20/solid"

type ChannelType = "email" | "slack" | "discord" | "telegram"

const defaultConfigs: Record<ChannelType, Record<string, string>> = {
  email: { email: "" },
  slack: { webhook_url: "" },
  discord: { webhook_url: "" },
  telegram: { bot_token: "", chat_id: "" },
}

interface CreateChannelModalProps {
  children?: React.ReactNode
}

export default function CreateChannelModal({ children }: CreateChannelModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, errors, processing, reset } = useForm({
    name: "",
    type: "email" as ChannelType,
    is_enabled: true,
    configuration: { email: "" } as Record<string, string>,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/notification-channels", {
      onSuccess: () => {
        setIsOpen(false)
        reset()
      },
    })
  }

  const handleTypeChange = (type: string) => {
    const channelType = type as ChannelType
    setData({
      ...data,
      type: channelType,
      configuration: defaultConfigs[channelType],
    })
  }

  const moreSettings = () => {
    const params = new URLSearchParams()
    if (data.name) params.set("name", data.name)
    if (data.type) params.set("type", data.type)
    for (const [key, value] of Object.entries(data.configuration)) {
      if (value) params.set(`configuration.${key}`, value)
    }
    const query = params.toString()
    router.visit(`/notification-channels/create${query ? `?${query}` : ""}`)
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
      {children ?? (
        <Button onPress={() => setIsOpen(true)}>
          <PlusIcon data-slot="icon" />
          Add Channel
        </Button>
      )}
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Add Channel</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form validationErrors={errors} onSubmit={submit} className="space-y-4" id="create-channel-form">
            <TextField value={data.name} onChange={(v) => setData("name", v)} autoFocus>
              <Label>Name</Label>
              <Input placeholder="My Email Alert" />
              <FieldError>{errors.name}</FieldError>
            </TextField>

            <Select selectedKey={data.type} onSelectionChange={handleTypeChange}>
              <Label>Type</Label>
              <SelectTrigger />
              <SelectContent
                items={[
                  { id: "email", name: "Email" },
                  { id: "slack", name: "Slack" },
                  { id: "discord", name: "Discord" },
                  { id: "telegram", name: "Telegram" },
                ]}
              >
                {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
              </SelectContent>
            </Select>

            {data.type === "email" && (
              <TextField
                value={data.configuration.email ?? ""}
                onChange={(v) => setData("configuration", { ...data.configuration, email: v })}
              >
                <Label>Email Address</Label>
                <Input type="email" placeholder="alerts@example.com" />
                <FieldError>{errors["configuration.email"]}</FieldError>
              </TextField>
            )}

            {(data.type === "slack" || data.type === "discord") && (
              <TextField
                value={data.configuration.webhook_url ?? ""}
                onChange={(v) => setData("configuration", { ...data.configuration, webhook_url: v })}
              >
                <Label>Webhook URL</Label>
                <Input type="url" placeholder="https://hooks.slack.com/services/..." />
                <FieldError>{errors["configuration.webhook_url"]}</FieldError>
              </TextField>
            )}

            {data.type === "telegram" && (
              <>
                <TextField
                  value={data.configuration.bot_token ?? ""}
                  onChange={(v) => setData("configuration", { ...data.configuration, bot_token: v })}
                >
                  <Label>Bot Token</Label>
                  <Input placeholder="123456:ABC-DEF..." />
                  <FieldError>{errors["configuration.bot_token"]}</FieldError>
                </TextField>
                <TextField
                  value={data.configuration.chat_id ?? ""}
                  onChange={(v) => setData("configuration", { ...data.configuration, chat_id: v })}
                >
                  <Label>Chat ID</Label>
                  <Input placeholder="-1001234567890" />
                  <FieldError>{errors["configuration.chat_id"]}</FieldError>
                </TextField>
              </>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button intent="outline" onPress={moreSettings}>
            More Settings
          </Button>
          <Button type="submit" form="create-channel-form" isDisabled={processing}>
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
