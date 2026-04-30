import { useForm } from "@inertiajs/react"
import { Form } from "react-aria-components"
import { getLocalTimeZone, now, parseAbsoluteToLocal, ZonedDateTime } from "@internationalized/date"
import { TextField } from "@/components/ui/text-field"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DateField, DateInput } from "@/components/ui/date-field"
import type { MaintenanceWindow, Monitor, MonitorGroup } from "@/types/monitor"

interface Props {
  maintenanceWindow?: MaintenanceWindow
  monitors: Pick<Monitor, "id" | "name" | "type">[]
  groups: Pick<MonitorGroup, "id" | "name">[]
}

function parseToZoned(dateStr: string | undefined | null): ZonedDateTime | null {
  if (!dateStr) return null
  try {
    return parseAbsoluteToLocal(new Date(dateStr).toISOString())
  } catch {
    return null
  }
}

function zonedToIso(value: ZonedDateTime | null): string {
  if (!value) return ""
  return value.toDate().toISOString()
}

export default function MaintenanceWindowForm({ maintenanceWindow, monitors, groups }: Props) {
  const isEditing = !!maintenanceWindow
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const defaultStart = now(getLocalTimeZone()).add({ hours: 1 })
  const defaultEnd = now(getLocalTimeZone()).add({ hours: 3 })

  const { data, setData, post, put, errors, processing } = useForm({
    title: maintenanceWindow?.title ?? "",
    description: maintenanceWindow?.description ?? "",
    start_time: maintenanceWindow?.start_time
      ? new Date(maintenanceWindow.start_time).toISOString()
      : zonedToIso(defaultStart),
    end_time: maintenanceWindow?.end_time
      ? new Date(maintenanceWindow.end_time).toISOString()
      : zonedToIso(defaultEnd),
    timezone: maintenanceWindow?.timezone ?? localTz,
    is_recurring: maintenanceWindow?.is_recurring ?? false,
    recurrence_type: maintenanceWindow?.recurrence_type ?? "daily",
    recurrence_days: maintenanceWindow?.recurrence_days ?? [],
    is_active: maintenanceWindow?.is_active ?? true,
    monitor_ids: maintenanceWindow?.monitors?.map((m) => m.id) ?? [],
    monitor_group_ids: maintenanceWindow?.monitor_groups?.map((g) => g.id) ?? [],
  })

  const startValue = parseToZoned(data.start_time) ?? defaultStart
  const endValue = parseToZoned(data.end_time) ?? defaultEnd

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      put(`/maintenance-windows/${maintenanceWindow.id}`)
    } else {
      post("/maintenance-windows")
    }
  }

  return (
    <Form validationErrors={errors} onSubmit={submit} className="max-w-2xl space-y-6">
      <TextField value={data.title} onChange={(v) => setData("title", v)} autoFocus>
        <Label>Title</Label>
        <Input placeholder="Scheduled Maintenance" />
        <FieldError>{errors.title}</FieldError>
      </TextField>

      <TextField value={data.description ?? ""} onChange={(v) => setData("description", v)}>
        <Label>Description (optional)</Label>
        <Textarea placeholder="Describe the maintenance..." />
        <FieldError>{errors.description}</FieldError>
      </TextField>

      <div className="grid gap-6 sm:grid-cols-2">
        <DateField
          hideTimeZone
          hourCycle={24}
          granularity="minute"
          value={startValue}
          onChange={(v) => {
            if (v) setData("start_time", zonedToIso(v as ZonedDateTime))
          }}
        >
          <Label>Start Time</Label>
          <DateInput />
          <FieldError>{errors.start_time}</FieldError>
        </DateField>

        <DateField
          hideTimeZone
          hourCycle={24}
          granularity="minute"
          value={endValue}
          onChange={(v) => {
            if (v) setData("end_time", zonedToIso(v as ZonedDateTime))
          }}
        >
          <Label>End Time</Label>
          <DateInput />
          <FieldError>{errors.end_time}</FieldError>
        </DateField>
      </div>

      <Select
        selectedKey={data.timezone}
        onSelectionChange={(v) => setData("timezone", v as string)}
      >
        <Label>Timezone</Label>
        <SelectTrigger />
        <SelectContent
          items={Intl.supportedValuesOf("timeZone").map((tz) => ({ id: tz, name: tz }))}
        >
          {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
        </SelectContent>
      </Select>

      <Checkbox
        isSelected={data.is_recurring}
        onChange={(checked) => setData("is_recurring", checked)}
      >
        Recurring maintenance window
      </Checkbox>

      {data.is_recurring && (
        <Select
          selectedKey={data.recurrence_type ?? "daily"}
          onSelectionChange={(v) => setData("recurrence_type", v as string)}
        >
          <Label>Recurrence</Label>
          <SelectTrigger />
          <SelectContent
            items={[
              { id: "daily", name: "Daily" },
              { id: "weekly", name: "Weekly" },
              { id: "monthly", name: "Monthly" },
            ]}
          >
            {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      )}

      {monitors.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-medium text-sm">Affected Monitors</legend>
          <div className="flex flex-wrap gap-3">
            {monitors.map((monitor) => (
              <Checkbox
                key={monitor.id}
                isSelected={data.monitor_ids.includes(monitor.id)}
                onChange={(checked) => {
                  setData(
                    "monitor_ids",
                    checked
                      ? [...data.monitor_ids, monitor.id]
                      : data.monitor_ids.filter((id) => id !== monitor.id),
                  )
                }}
              >
                {monitor.name}
              </Checkbox>
            ))}
          </div>
        </fieldset>
      )}

      {groups.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-medium text-sm">Affected Groups</legend>
          <div className="flex flex-wrap gap-3">
            {groups.map((group) => (
              <Checkbox
                key={group.id}
                isSelected={data.monitor_group_ids.includes(group.id)}
                onChange={(checked) => {
                  setData(
                    "monitor_group_ids",
                    checked
                      ? [...data.monitor_group_ids, group.id]
                      : data.monitor_group_ids.filter((id) => id !== group.id),
                  )
                }}
              >
                {group.name}
              </Checkbox>
            ))}
          </div>
        </fieldset>
      )}

      <Button type="submit" isDisabled={processing}>
        {isEditing ? "Update" : "Create"} Maintenance Window
      </Button>
    </Form>
  )
}
