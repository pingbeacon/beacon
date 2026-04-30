import {
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/20/solid"
import { router, useForm } from "@inertiajs/react"
import { useEffect, useState } from "react"
import { Form } from "react-aria-components"
import NotificationRouteController from "@/actions/App/Http/Controllers/NotificationRouteController"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import type {
  NotificationChannel,
  NotificationRoute,
  RouteSeverity,
  RouteStatusFilter,
} from "@/types/monitor"

const SEVERITIES: RouteSeverity[] = ["critical", "warning", "info"]
const STATUSES: RouteStatusFilter[] = ["up", "down", "paused", "resolved"]

interface Props {
  monitorId: number
  rules: NotificationRoute[]
  channels: NotificationChannel[]
}

function describeWhen(rule: NotificationRoute): string {
  const parts: string[] = []
  const sev = rule.conditions?.severity_filter
  const stat = rule.conditions?.status_filter
  if (Array.isArray(sev) && sev.length > 0) {
    parts.push(`severity ∈ {${sev.join(", ")}}`)
  }
  if (Array.isArray(stat) && stat.length > 0) {
    parts.push(`status ∈ {${stat.join(", ")}}`)
  }
  return parts.length > 0 ? parts.join(" && ") : "any event"
}

function channelChip(channel: NotificationChannel): string {
  return channel.name || channel.type
}

export function RoutingRulesTable({ monitorId, rules, channels }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<NotificationRoute | null>(null)
  const channelById = new Map(channels.map((c) => [c.id, c]))

  const handleDelete = (rule: NotificationRoute) => {
    router.delete(NotificationRouteController.destroy.url([monitorId, rule.id]), {
      preserveScroll: true,
    })
  }

  const moveRule = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= rules.length) return
    const order = rules.map((r) => r.id)
    const [moved] = order.splice(index, 1)
    order.splice(next, 0, moved)
    router.post(
      NotificationRouteController.reorder.url(monitorId),
      { order },
      { preserveScroll: true },
    )
  }

  const openAdd = () => {
    setEditingRule(null)
    setIsOpen(true)
  }

  const openEdit = (rule: NotificationRoute) => {
    setEditingRule(rule)
    setIsOpen(true)
  }

  return (
    <div data-testid="routing-rules-table" className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <div>
          <p className="font-semibold text-foreground text-sm">Routing rules</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Evaluated top-down · first match wins per channel
          </p>
        </div>
        <Button onPress={openAdd} size="sm">
          <PlusIcon data-slot="icon" />
          Add rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <p data-testid="routing-rules-empty" className="px-4 py-6 text-muted-foreground text-sm">
          No routing rules. Notifications fall back to channels attached to the monitor.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rules.map((rule, index) => (
            <li
              key={rule.id}
              data-testid={`routing-rule-${rule.id}`}
              className={`grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 ${rule.is_active ? "" : "opacity-60"}`}
            >
              <span className="font-mono text-muted-foreground text-xs">#{index + 1}</span>

              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    when
                  </span>
                  <span className="truncate font-mono text-foreground text-xs">
                    {describeWhen(rule)}
                  </span>
                </div>
                {rule.name && <p className="mt-1 text-muted-foreground text-xs">{rule.name}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(rule.channel_ids ?? []).map((id) => {
                    const channel = channelById.get(id)
                    return (
                      <span
                        key={id}
                        className="rounded-sm border border-border bg-primary-subtle px-2 py-0.5 text-foreground text-xs"
                      >
                        {channel ? channelChip(channel) : `#${id}`}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  intent="plain"
                  size="sm"
                  aria-label="Move rule up"
                  isDisabled={index === 0}
                  onPress={() => moveRule(index, -1)}
                >
                  <ChevronUpIcon data-slot="icon" />
                </Button>
                <Button
                  intent="plain"
                  size="sm"
                  aria-label="Move rule down"
                  isDisabled={index === rules.length - 1}
                  onPress={() => moveRule(index, 1)}
                >
                  <ChevronDownIcon data-slot="icon" />
                </Button>
              </div>

              <Button
                intent="plain"
                size="sm"
                aria-label="Edit rule"
                onPress={() => openEdit(rule)}
              >
                <PencilIcon data-slot="icon" />
              </Button>

              <Button
                intent="plain"
                size="sm"
                aria-label="Delete rule"
                onPress={() => handleDelete(rule)}
              >
                <TrashIcon data-slot="icon" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <RuleModal
        monitorId={monitorId}
        channels={channels}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        nextPriority={(rules.at(-1)?.priority ?? 0) + 10}
        editingRule={editingRule}
      />
    </div>
  )
}

interface RuleModalProps {
  monitorId: number
  channels: NotificationChannel[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  nextPriority: number
  editingRule: NotificationRoute | null
}

function buildInitial(editingRule: NotificationRoute | null, nextPriority: number) {
  if (editingRule) {
    return {
      name: editingRule.name ?? "",
      priority: editingRule.priority,
      is_active: editingRule.is_active,
      conditions: {
        severity_filter: (editingRule.conditions?.severity_filter ?? []) as RouteSeverity[],
        status_filter: (editingRule.conditions?.status_filter ?? []) as RouteStatusFilter[],
      },
      channel_ids: editingRule.channel_ids ?? [],
    }
  }

  return {
    name: "",
    priority: nextPriority,
    is_active: true,
    conditions: {
      severity_filter: [] as RouteSeverity[],
      status_filter: [] as RouteStatusFilter[],
    },
    channel_ids: [] as number[],
  }
}

function RuleModal({
  monitorId,
  channels,
  isOpen,
  onOpenChange,
  nextPriority,
  editingRule,
}: RuleModalProps) {
  const { data, setData, post, patch, errors, processing, reset } = useForm(
    buildInitial(editingRule, nextPriority),
  )

  useEffect(() => {
    if (!isOpen) return
    const initial = buildInitial(editingRule, nextPriority)
    setData(initial)
  }, [isOpen, editingRule, nextPriority, setData])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const onSuccess = () => {
      onOpenChange(false)
      reset()
    }
    if (editingRule) {
      patch(NotificationRouteController.update.url([monitorId, editingRule.id]), {
        preserveScroll: true,
        onSuccess,
      })
    } else {
      post(NotificationRouteController.store.url(monitorId), {
        preserveScroll: true,
        onSuccess,
      })
    }
  }

  const toggleSeverity = (sev: RouteSeverity) => {
    setData("conditions", {
      ...data.conditions,
      severity_filter: data.conditions.severity_filter.includes(sev)
        ? data.conditions.severity_filter.filter((s) => s !== sev)
        : [...data.conditions.severity_filter, sev],
    })
  }

  const toggleStatus = (status: RouteStatusFilter) => {
    setData("conditions", {
      ...data.conditions,
      status_filter: data.conditions.status_filter.includes(status)
        ? data.conditions.status_filter.filter((s) => s !== status)
        : [...data.conditions.status_filter, status],
    })
  }

  const toggleChannel = (id: number) => {
    setData(
      "channel_ids",
      data.channel_ids.includes(id)
        ? data.channel_ids.filter((cid) => cid !== id)
        : [...data.channel_ids, id],
    )
  }

  const formId = editingRule ? "edit-routing-rule-form" : "add-routing-rule-form"

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{editingRule ? "Edit routing rule" : "Add routing rule"}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form id={formId} onSubmit={submit} validationErrors={errors} className="space-y-4">
            <TextField value={data.name} onChange={(v) => setData("name", v)}>
              <Label>Name (optional)</Label>
              <Input placeholder="Critical → PagerDuty" />
              <FieldError>{errors.name}</FieldError>
            </TextField>

            <div>
              <p className="text-foreground text-sm">When severity matches</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {SEVERITIES.map((sev) => (
                  <Checkbox
                    key={sev}
                    isSelected={data.conditions.severity_filter.includes(sev)}
                    onChange={() => toggleSeverity(sev)}
                  >
                    {sev}
                  </Checkbox>
                ))}
              </div>
              <p className="mt-1 text-muted-foreground text-xs">
                Leave empty to match any severity.
              </p>
            </div>

            <div>
              <p className="text-foreground text-sm">When status matches</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {STATUSES.map((status) => (
                  <Checkbox
                    key={status}
                    isSelected={data.conditions.status_filter.includes(status)}
                    onChange={() => toggleStatus(status)}
                  >
                    {status}
                  </Checkbox>
                ))}
              </div>
              <p className="mt-1 text-muted-foreground text-xs">Leave empty to match any status.</p>
            </div>

            <div>
              <p className="text-foreground text-sm">Send to channels</p>
              <div className="mt-2 flex flex-col gap-2">
                {channels.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No notification channels exist for this team yet.
                  </p>
                ) : (
                  channels.map((channel) => (
                    <Checkbox
                      key={channel.id}
                      isSelected={data.channel_ids.includes(channel.id)}
                      onChange={() => toggleChannel(channel.id)}
                    >
                      {channelChip(channel)}
                      <span className="ml-2 text-muted-foreground text-xs">{channel.type}</span>
                    </Checkbox>
                  ))
                )}
              </div>
              <FieldError>{errors.channel_ids}</FieldError>
            </div>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button intent="outline" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            isDisabled={processing || data.channel_ids.length === 0}
          >
            {editingRule ? "Save changes" : "Add rule"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
