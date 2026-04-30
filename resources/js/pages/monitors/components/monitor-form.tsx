import { useForm } from "@inertiajs/react"
import { Form } from "react-aria-components"
import { TextField } from "@/components/ui/text-field"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { NumberField, NumberInput } from "@/components/ui/number-field"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { Monitor, MonitorGroup, Tag, NotificationChannel } from "@/types/monitor"

interface MonitorFormProps {
  monitor?: Monitor
  tags: Tag[]
  notificationChannels: NotificationChannel[]
  groups?: MonitorGroup[]
}

const monitorTypes = [
  { id: "http", name: "HTTP(s)" },
  { id: "tcp", name: "TCP Port" },
  { id: "ping", name: "Ping" },
  { id: "dns", name: "DNS" },
  { id: "push", name: "Push" },
]

const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]

const dnsRecordTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"]

function getSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

export default function MonitorForm({
  monitor,
  tags,
  notificationChannels,
  groups = [],
}: MonitorFormProps) {
  const isEditing = !!monitor
  const params = !isEditing ? getSearchParams() : null

  const { data, setData, post, put, errors, processing } = useForm({
    name: monitor?.name ?? params?.get("name") ?? "",
    type: monitor?.type ?? params?.get("type") ?? "http",
    url: monitor?.url ?? params?.get("url") ?? "",
    host: monitor?.host ?? params?.get("host") ?? "",
    port: monitor?.port ?? (params?.get("port") ? Number(params.get("port")) : 443),
    dns_record_type: monitor?.dns_record_type ?? "A",
    method: monitor?.method ?? "GET",
    body: monitor?.body ?? "",
    headers: monitor?.headers ?? null,
    accepted_status_codes: monitor?.accepted_status_codes ?? [200, 201, 301],
    interval: monitor?.interval ?? 60,
    timeout: monitor?.timeout ?? 30,
    retry_count: monitor?.retry_count ?? 3,
    tag_ids: monitor?.tags?.map((t) => t.id) ?? [],
    notification_channel_ids: monitor?.notification_channels?.map((c) => c.id) ?? [],
    monitor_group_id: monitor?.monitor_group_id ?? null,
    ssl_monitoring_enabled: monitor?.ssl_monitoring_enabled ?? false,
    ssl_expiry_notification_days: monitor?.ssl_expiry_notification_days ?? [30, 14, 7],
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      put(`/monitors/${monitor.id}`, { preserveScroll: true })
    } else {
      post("/monitors")
    }
  }

  return (
    <Form validationErrors={errors} onSubmit={submit} className="max-w-2xl space-y-6">
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
        <>
          <TextField value={data.url} onChange={(v) => setData("url", v)}>
            <Label>URL</Label>
            <Input placeholder="https://example.com" />
            <FieldError>{errors.url}</FieldError>
          </TextField>

          <Select
            selectedKey={data.method}
            onSelectionChange={(v) => setData("method", v as string)}
          >
            <Label>HTTP Method</Label>
            <SelectTrigger />
            <SelectContent items={httpMethods.map((m) => ({ id: m, name: m }))}>
              {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
            </SelectContent>
          </Select>

          <Checkbox
            isSelected={data.ssl_monitoring_enabled}
            onChange={(checked) => setData("ssl_monitoring_enabled", checked)}
          >
            Enable SSL certificate monitoring
          </Checkbox>

          {data.ssl_monitoring_enabled && (
            <fieldset>
              <legend className="mb-2 font-medium text-sm">
                Notify when SSL expires within (days)
              </legend>
              <div className="flex flex-wrap gap-3">
                {[30, 14, 7, 3, 1].map((days) => (
                  <Checkbox
                    key={days}
                    isSelected={data.ssl_expiry_notification_days.includes(days)}
                    onChange={(checked) => {
                      setData(
                        "ssl_expiry_notification_days",
                        checked
                          ? [...data.ssl_expiry_notification_days, days].sort((a, b) => b - a)
                          : data.ssl_expiry_notification_days.filter((d) => d !== days),
                      )
                    }}
                  >
                    {days} {days === 1 ? "day" : "days"}
                  </Checkbox>
                ))}
              </div>
            </fieldset>
          )}

          {(data.method === "POST" || data.method === "PUT" || data.method === "PATCH") && (
            <TextField value={data.body ?? ""} onChange={(v) => setData("body", v)}>
              <Label>Request Body</Label>
              <Textarea placeholder='{"key": "value"}' />
              <FieldError>{errors.body}</FieldError>
            </TextField>
          )}
        </>
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
          value={data.port ?? 443}
          onChange={(v) => setData("port", v)}
          minValue={1}
          maxValue={65535}
        >
          <Label>Port</Label>
          <NumberInput />
          <FieldError>{errors.port}</FieldError>
        </NumberField>
      )}

      {data.type === "dns" && (
        <Select
          selectedKey={data.dns_record_type ?? "A"}
          onSelectionChange={(v) => setData("dns_record_type", v as string)}
        >
          <Label>DNS Record Type</Label>
          <SelectTrigger />
          <SelectContent items={dnsRecordTypes.map((t) => ({ id: t, name: t }))}>
            {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        <NumberField
          value={data.interval}
          onChange={(v) => setData("interval", v)}
          minValue={10}
          maxValue={3600}
        >
          <Label>Check Interval (s)</Label>
          <NumberInput />
          <FieldError>{errors.interval}</FieldError>
        </NumberField>

        <NumberField
          value={data.timeout}
          onChange={(v) => setData("timeout", v)}
          minValue={1}
          maxValue={120}
        >
          <Label>Timeout (s)</Label>
          <NumberInput />
          <FieldError>{errors.timeout}</FieldError>
        </NumberField>

        <NumberField
          value={data.retry_count}
          onChange={(v) => setData("retry_count", v)}
          minValue={0}
          maxValue={10}
        >
          <Label>Retries</Label>
          <NumberInput />
          <FieldError>{errors.retry_count}</FieldError>
        </NumberField>
      </div>

      {groups.length > 0 && (
        <Select
          selectedKey={data.monitor_group_id ? String(data.monitor_group_id) : ""}
          onSelectionChange={(v) => setData("monitor_group_id", v ? Number(v) : null)}
        >
          <Label>Group (optional)</Label>
          <SelectTrigger />
          <SelectContent
            items={[
              { id: "", name: "No Group" },
              ...groups.map((g) => ({ id: String(g.id), name: g.name })),
            ]}
          >
            {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      )}

      {tags.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-medium text-sm">Tags</legend>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Checkbox
                key={tag.id}
                isSelected={data.tag_ids.includes(tag.id)}
                onChange={(checked) => {
                  setData(
                    "tag_ids",
                    checked
                      ? [...data.tag_ids, tag.id]
                      : data.tag_ids.filter((id) => id !== tag.id),
                  )
                }}
              >
                <span
                  className="mr-1 inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </Checkbox>
            ))}
          </div>
        </fieldset>
      )}

      {notificationChannels.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-medium text-sm">Notification Channels</legend>
          <div className="flex flex-wrap gap-3">
            {notificationChannels.map((channel) => (
              <Checkbox
                key={channel.id}
                isSelected={data.notification_channel_ids.includes(channel.id)}
                onChange={(checked) => {
                  setData(
                    "notification_channel_ids",
                    checked
                      ? [...data.notification_channel_ids, channel.id]
                      : data.notification_channel_ids.filter((id) => id !== channel.id),
                  )
                }}
              >
                {channel.name}
              </Checkbox>
            ))}
          </div>
        </fieldset>
      )}

      <Button type="submit" isDisabled={processing}>
        {isEditing ? "Update Monitor" : "Create Monitor"}
      </Button>
    </Form>
  )
}
