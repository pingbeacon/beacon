import { useForm } from "@inertiajs/react"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"
import { Form } from "react-aria-components"
import { TextField } from "@/components/ui/text-field"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import type { NotificationChannel } from "@/types/monitor"

type ChannelType = "email" | "slack" | "discord" | "telegram" | "webhook"

interface ChannelFormProps {
  channel?: NotificationChannel & { configuration: Record<string, string> }
}

const defaultConfigs: Record<ChannelType, Record<string, string>> = {
  email: { email: "" },
  slack: { webhook_url: "" },
  discord: { webhook_url: "" },
  telegram: { bot_token: "", chat_id: "" },
  webhook: { url: "", secret: "", custom_headers: "" },
}

function getSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

function getInitialConfig(
  params: URLSearchParams | null,
  type: ChannelType,
): Record<string, string> {
  const base = defaultConfigs[type]
  if (!params) return base
  const config = { ...base }
  for (const key of Object.keys(config)) {
    const value = params.get(`configuration.${key}`)
    if (value) config[key] = value
  }
  return config
}

export default function ChannelForm({ channel }: ChannelFormProps) {
  const isEditing = !!channel
  const params = !isEditing ? getSearchParams() : null
  const initialType = (channel?.type ?? params?.get("type") ?? "email") as ChannelType

  const { data, setData, post, patch, errors, processing } = useForm({
    name: channel?.name ?? params?.get("name") ?? "",
    type: initialType,
    is_enabled: channel?.is_enabled ?? true,
    configuration: channel?.configuration ?? getInitialConfig(params, initialType),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      patch(`/notification-channels/${channel.id}`)
    } else {
      post("/notification-channels")
    }
  }

  const handleTypeChange = (type: string) => {
    const channelType = type as ChannelType
    setData({
      ...data,
      type: channelType,
      configuration: defaultConfigs[channelType],
    })
  }

  return (
    <Form validationErrors={errors} onSubmit={submit} className="max-w-lg space-y-6">
      <TextField value={data.name} onChange={(v) => setData("name", v)} autoFocus>
        <Label>Name</Label>
        <Input placeholder="My Email Alert" />
        <FieldError>{errors.name}</FieldError>
      </TextField>

      {isEditing ? (
        <div>
          <p className="mb-1 font-medium text-sm">Type</p>
          <p className="text-muted-foreground text-sm capitalize">{data.type}</p>
        </div>
      ) : (
        <Select selectedKey={data.type} onSelectionChange={handleTypeChange}>
          <Label>Type</Label>
          <SelectTrigger />
          <SelectContent
            items={[
              { id: "email", name: "Email" },
              { id: "slack", name: "Slack" },
              { id: "discord", name: "Discord" },
              { id: "telegram", name: "Telegram" },
              { id: "webhook", name: "Webhook" },
            ]}
          >
            {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      )}

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

      {data.type === "webhook" && (
        <>
          <TextField
            value={data.configuration.url ?? ""}
            onChange={(v) => setData("configuration", { ...data.configuration, url: v })}
          >
            <Label>Webhook URL</Label>
            <Input type="url" placeholder="https://example.com/webhook" />
            <FieldError>{errors["configuration.url"]}</FieldError>
          </TextField>
          <TextField
            value={data.configuration.secret ?? ""}
            onChange={(v) => setData("configuration", { ...data.configuration, secret: v })}
          >
            <Label>Secret (optional)</Label>
            <Input placeholder="HMAC signing secret" />
            <FieldError>{errors["configuration.secret"]}</FieldError>
          </TextField>
          <TextField
            value={data.configuration.custom_headers ?? ""}
            onChange={(v) => setData("configuration", { ...data.configuration, custom_headers: v })}
          >
            <Label>Custom Headers (optional, JSON)</Label>
            <Textarea placeholder='{"Authorization": "Bearer token"}' />
            <FieldError>{errors["configuration.custom_headers"]}</FieldError>
          </TextField>
        </>
      )}

      <div className="flex gap-2">
        <Button type="submit" isDisabled={processing}>
          {isEditing ? "Save Changes" : "Create Channel"}
        </Button>
        {isEditing && (
          <ConfirmDeleteModal
            title="Delete Notification Channel"
            description="Are you sure you want to delete this notification channel? This action cannot be undone."
            deleteUrl={`/notification-channels/${channel.id}`}
          >
            <Button intent="danger">Delete</Button>
          </ConfirmDeleteModal>
        )}
      </div>
    </Form>
  )
}
