import { useState } from "react"
import { useForm, router, Link } from "@inertiajs/react"
import { Form } from "react-aria-components"
import { TextField } from "@/components/ui/text-field"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { NumberField, NumberInput } from "@/components/ui/number-field"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid"
import type { Monitor, MonitorGroup, Tag, NotificationChannel } from "@/types/monitor"

interface MonitorWizardProps {
  monitor?: Monitor
  tags: Tag[]
  notificationChannels: NotificationChannel[]
  groups?: MonitorGroup[]
}

const monitorTypes = [
  { id: "http", label: "HTTP(S)", desc: "GET / POST / custom methods. Assert status codes, response bodies, latency." },
  { id: "tcp", label: "TCP", desc: "Open-socket check for databases, queues, anything with an open port." },
  { id: "ping", label: "PING", desc: "Raw network reachability. Measures packet loss & round-trip time." },
  { id: "dns", label: "DNS", desc: "Resolve A / AAAA / CNAME / MX / TXT and assert expected values." },
  { id: "push", label: "PUSH", desc: "Cron or worker posts to Beacon. Alert if no ping within window." },
]

const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]
const dnsRecordTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"]

const intervalOptions = [
  { value: 10, label: "10s" },
  { value: 20, label: "20s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: 300, label: "5m" },
  { value: 900, label: "15m" },
]

const commonStatusCodes = [200, 201, 204, 301, 302, 400, 401, 403, 404, 500]
const sslExpiryDays = [30, 14, 7, 3, 1]

const ALL_STEPS = [
  { n: "01", key: "type", title: "Type", blurb: "What are we watching?" },
  { n: "02", key: "target", title: "Target", blurb: "Where to check & how it's called." },
  { n: "03", key: "schedule", title: "Schedule", blurb: "Interval, timeout, retries." },
  { n: "04", key: "assertions", title: "Assertions", blurb: "What counts as healthy." },
  { n: "05", key: "alerts", title: "Alerts", blurb: "Who hears about it." },
]

function stepsForType(type: string) {
  if (type === "push") return ["type", "target", "alerts"]
  if (type === "http") return ["type", "target", "schedule", "assertions", "alerts"]
  return ["type", "target", "schedule", "alerts"]
}

function getSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

export default function MonitorWizard({ monitor, tags, notificationChannels, groups = [] }: MonitorWizardProps) {
  const isEditing = !!monitor
  const params = !isEditing ? getSearchParams() : null

  const { data, setData, post, put, errors, processing } = useForm({
    name: monitor?.name ?? params?.get("name") ?? "",
    type: (monitor?.type ?? params?.get("type") ?? "http") as string,
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

  const [headerRows, setHeaderRows] = useState<{ key: string; value: string }[]>(
    monitor?.headers ? Object.entries(monitor.headers).map(([key, value]) => ({ key, value })) : [],
  )

  const updateHeaderRows = (rows: { key: string; value: string }[]) => {
    setHeaderRows(rows)
    const record = rows.reduce<Record<string, string>>((acc, row) => {
      if (row.key.trim()) acc[row.key.trim()] = row.value
      return acc
    }, {})
    setData("headers", Object.keys(record).length > 0 ? record : null)
  }

  const visibleKeys = stepsForType(data.type)
  const visibleSteps = ALL_STEPS.filter((s) => visibleKeys.includes(s.key))

  const [activeKey, setActiveKey] = useState(visibleKeys[0])

  const activeIndex = visibleKeys.indexOf(activeKey)
  const currentStep = ALL_STEPS.find((s) => s.key === activeKey)!

  const goNext = () => {
    const next = visibleKeys[activeIndex + 1]
    if (next) setActiveKey(next)
  }

  const goPrev = () => {
    const prev = visibleKeys[activeIndex - 1]
    if (prev) setActiveKey(prev)
  }

  const isFirst = activeIndex === 0
  const isLast = activeIndex === visibleKeys.length - 1

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      put(`/monitors/${monitor.id}`, { preserveScroll: true })
    } else {
      post("/monitors")
    }
  }

  const stepState = (key: string) => {
    const idx = visibleKeys.indexOf(key)
    if (idx < activeIndex) return "done"
    if (key === activeKey) return "active"
    return "todo"
  }

  return (
    <div className="flex flex-col">
      {/* page header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg px-6 py-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-fg">
            <Link href="/monitors" className="hover:text-fg transition-colors">monitors</Link>
            <span>/</span>
            <span className="text-fg">{isEditing ? monitor.name : "new"}</span>
          </div>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight">
            {isEditing ? `Edit ${monitor.name}` : "New monitor"}
          </h1>
        </div>
        <Button intent="outline" onPress={() => router.visit("/monitors")}>
          Cancel
        </Button>
      </div>

      {/* wizard body */}
      <div className="flex gap-0">
        {/* step rail */}
        <aside className="sticky top-[73px] h-[calc(100dvh-73px)] w-64 shrink-0 overflow-y-auto border-r border-border p-5">
          <p className="mb-3 text-[11px] uppercase tracking-widest text-muted-fg">// setup</p>
          <div className="flex flex-col gap-0.5">
            {visibleSteps.map((s) => {
              const state = stepState(s.key)
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveKey(s.key)}
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-lg border-l-2 px-3 py-3 text-left transition-colors",
                    state === "active"
                      ? "border-primary bg-primary-subtle"
                      : state === "done"
                      ? "border-primary/30 hover:bg-sidebar"
                      : "border-transparent hover:bg-sidebar",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                      state === "active"
                        ? "border-primary bg-primary text-primary-fg"
                        : state === "done"
                        ? "border-primary text-primary"
                        : "border-border text-muted-fg",
                    ].join(" ")}
                  >
                    {state === "done" ? <CheckIcon className="size-2.5" /> : s.n}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={[
                        "text-sm font-medium",
                        state === "active" ? "text-fg" : "text-muted-fg",
                      ].join(" ")}
                    >
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-fg">{s.blurb}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* summary */}
          <div className="mt-5 rounded-lg border border-border bg-sidebar p-3.5">
            <p className="mb-2 text-xs font-medium text-fg">Summary</p>
            <div className="space-y-1 text-[11px] leading-relaxed text-muted-fg">
              <p>
                <span className="font-mono uppercase text-primary">{data.type}</span>
                {data.name && <span> · {data.name}</span>}
              </p>
              {data.url && <p className="truncate">{data.url}</p>}
              {data.host && (
                <p className="truncate">
                  {data.host}
                  {data.port ? `:${data.port}` : ""}
                </p>
              )}
              <p>
                every{" "}
                {intervalOptions.find((o) => o.value === data.interval)?.label ?? `${data.interval}s`}
                {" · "}
                {data.retry_count} {data.retry_count === 1 ? "retry" : "retries"}
              </p>
              {data.notification_channel_ids.length > 0 && (
                <p>
                  {data.notification_channel_ids.length} channel
                  {data.notification_channel_ids.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* step content */}
        <Form validationErrors={errors} onSubmit={submit} className="min-h-[calc(100dvh-73px)] flex-1 px-10 py-8">
          <div className="mx-auto max-w-2xl">
            {/* step header */}
            <div className="mb-8">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-primary">
                step {currentStep.n} / {String(visibleSteps.length).padStart(2, "0")}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">{currentStep.title}</h2>
              <p className="mt-1 text-sm text-muted-fg">{currentStep.blurb}</p>
            </div>

            {/* — Step: type — */}
            {activeKey === "type" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {monitorTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setData("type", t.id)
                      const keys = stepsForType(t.id)
                      setActiveKey(keys[0])
                    }}
                    className={[
                      "rounded-lg border p-4 text-left transition-colors",
                      data.type === t.id
                        ? "border-primary bg-primary-subtle"
                        : "border-border bg-sidebar hover:border-primary/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={[
                          "font-mono text-sm font-semibold tracking-wide",
                          data.type === t.id ? "text-primary" : "text-fg",
                        ].join(" ")}
                      >
                        {t.label}
                      </span>
                      <div
                        className={[
                          "flex size-3.5 items-center justify-center rounded-full border",
                          data.type === t.id ? "border-primary bg-primary" : "border-border",
                        ].join(" ")}
                      >
                        {data.type === t.id && <div className="size-1.5 rounded-full bg-primary-fg" />}
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-fg">{t.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {/* — Step: target — */}
            {activeKey === "target" && (
              <div className="space-y-5">
                <div className={groups.length > 0 ? "grid grid-cols-2 gap-4" : ""}>
                  <TextField value={data.name} onChange={(v) => setData("name", v)} autoFocus>
                    <Label>Name</Label>
                    <Input placeholder="My Website" />
                    <FieldError>{errors.name}</FieldError>
                  </TextField>

                  {groups.length > 0 && (
                    <Select
                      selectedKey={data.monitor_group_id ? String(data.monitor_group_id) : ""}
                      onSelectionChange={(v) => setData("monitor_group_id", v ? Number(v) : null)}
                    >
                      <Label>Group</Label>
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
                </div>

                {data.type === "http" && (
                  <>
                    <TextField value={data.url} onChange={(v) => setData("url", v)}>
                      <Label>URL</Label>
                      <Input placeholder="https://example.com" />
                      <FieldError>{errors.url}</FieldError>
                    </TextField>

                    <div>
                      <Label>Method</Label>
                      <div className="mt-2">
                        <ToggleGroup
                          selectionMode="single"
                          size="sm"
                          selectedKeys={new Set([data.method])}
                          onSelectionChange={(keys) => {
                            const val = Array.from(keys)[0]
                            if (val) setData("method", val as string)
                          }}
                        >
                          {httpMethods.map((m) => (
                            <ToggleGroupItem key={m} id={m}>
                              {m}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>
                    </div>

                    {/* headers table */}
                    <div>
                      <Label>Headers</Label>
                      <div className="mt-2 overflow-hidden rounded-lg border border-border">
                        {headerRows.length > 0 && (
                          <div className="grid grid-cols-[1fr_1fr_36px] bg-sidebar text-[11px] uppercase tracking-wider text-muted-fg">
                            <div className="border-b border-border px-3 py-2">Key</div>
                            <div className="border-b border-l border-border px-3 py-2">Value</div>
                            <div className="border-b border-l border-border" />
                          </div>
                        )}
                        {headerRows.map((row, i) => (
                          <div key={i} className="grid grid-cols-[1fr_1fr_36px]">
                            <input
                              className="border-b border-border bg-transparent px-3 py-2.5 text-sm text-fg outline-none placeholder:text-muted-fg focus:bg-sidebar"
                              placeholder="Authorization"
                              value={row.key}
                              onChange={(e) => {
                                const next = [...headerRows]
                                next[i] = { ...next[i], key: e.target.value }
                                updateHeaderRows(next)
                              }}
                            />
                            <input
                              className="border-b border-l border-border bg-transparent px-3 py-2.5 text-sm text-fg outline-none placeholder:text-muted-fg focus:bg-sidebar"
                              placeholder="Bearer …"
                              value={row.value}
                              onChange={(e) => {
                                const next = [...headerRows]
                                next[i] = { ...next[i], value: e.target.value }
                                updateHeaderRows(next)
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => updateHeaderRows(headerRows.filter((_, idx) => idx !== i))}
                              className="flex items-center justify-center border-b border-l border-border text-muted-fg hover:text-danger"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateHeaderRows([...headerRows, { key: "", value: "" }])}
                          className="flex w-full items-center gap-1.5 px-3 py-2.5 text-xs text-muted-fg hover:text-fg"
                        >
                          <PlusIcon className="size-3.5" />
                          Add header
                        </button>
                      </div>
                    </div>

                    {(data.method === "POST" || data.method === "PUT" || data.method === "PATCH") && (
                      <TextField value={data.body ?? ""} onChange={(v) => setData("body", v)}>
                        <Label>Request body</Label>
                        <Textarea placeholder='{"key": "value"}' rows={4} />
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

                {data.type === "push" && (
                  <div className="rounded-lg border border-border bg-sidebar p-4">
                    <p className="text-sm text-muted-fg">
                      After creating this monitor, you'll receive a unique push URL. Your cron job or worker should POST
                      to it on each successful run. If no ping is received within the check interval, Beacon will fire
                      an alert.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* — Step: schedule — */}
            {activeKey === "schedule" && (
              <div className="space-y-6">
                <div>
                  <Label>Check interval</Label>
                  <div className="mt-2">
                    <ToggleGroup
                      selectionMode="single"
                      size="sm"
                      selectedKeys={new Set([String(data.interval)])}
                      onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0]
                        if (val) setData("interval", Number(val))
                      }}
                    >
                      {intervalOptions.map((o) => (
                        <ToggleGroupItem key={String(o.value)} id={String(o.value)}>
                          {o.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

                {data.type === "http" && (
                  <div className="space-y-4">
                    <Checkbox
                      isSelected={data.ssl_monitoring_enabled}
                      onChange={(checked) => setData("ssl_monitoring_enabled", checked)}
                    >
                      Monitor SSL certificate
                    </Checkbox>

                    {data.ssl_monitoring_enabled && (
                      <fieldset className="pl-6">
                        <legend className="mb-3 text-sm font-medium text-fg">Alert when SSL expires within</legend>
                        <div className="flex flex-wrap gap-3">
                          {sslExpiryDays.map((days) => (
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
                  </div>
                )}
              </div>
            )}

            {/* — Step: assertions — */}
            {activeKey === "assertions" && (
              <div className="space-y-5">
                <div>
                  <p className="mb-1 text-sm font-medium text-fg">Accepted status codes</p>
                  <p className="mb-4 text-xs text-muted-fg">
                    Monitor is UP when the response matches any selected code.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {commonStatusCodes.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          const current = data.accepted_status_codes ?? []
                          setData(
                            "accepted_status_codes",
                            current.includes(code)
                              ? current.filter((c) => c !== code)
                              : [...current, code].sort((a, b) => a - b),
                          )
                        }}
                        className={[
                          "rounded-md border px-3 py-1.5 font-mono text-sm transition-colors",
                          (data.accepted_status_codes ?? []).includes(code)
                            ? "border-primary bg-primary-subtle text-primary"
                            : "border-border text-muted-fg hover:border-primary/40 hover:text-fg",
                        ].join(" ")}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-sidebar p-4">
                  <p className="font-mono text-xs text-muted-fg">
                    // monitor is DOWN when status code is not in the accepted list, or when the request times out
                  </p>
                </div>
              </div>
            )}

            {/* — Step: alerts — */}
            {activeKey === "alerts" && (
              <div className="space-y-6">
                {notificationChannels.length > 0 ? (
                  <fieldset>
                    <legend className="mb-3 text-sm font-medium text-fg">Notification channels</legend>
                    <div className="space-y-2">
                      {notificationChannels.map((channel) => {
                        const on = data.notification_channel_ids.includes(channel.id)
                        return (
                          <div
                            key={channel.id}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setData(
                                "notification_channel_ids",
                                on
                                  ? data.notification_channel_ids.filter((id) => id !== channel.id)
                                  : [...data.notification_channel_ids, channel.id],
                              )
                            }
                            onKeyDown={(e) => e.key === "Enter" || e.key === " " ? e.currentTarget.click() : undefined}
                            className={[
                              "flex cursor-pointer items-center gap-4 rounded-lg border p-3.5 transition-colors",
                              on ? "border-primary/50 bg-primary-subtle" : "border-border hover:border-primary/30",
                            ].join(" ")}
                          >
                            {/* toggle knob */}
                            <div
                              className={[
                                "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
                                on ? "border-primary bg-primary" : "border-border bg-sidebar",
                              ].join(" ")}
                            >
                              <div
                                className={[
                                  "absolute top-0.5 size-3.5 rounded-full bg-white transition-[left]",
                                  on ? "left-[18px]" : "left-0.5",
                                ].join(" ")}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-fg">{channel.name}</p>
                              <p className="text-xs capitalize text-muted-fg">{channel.type}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </fieldset>
                ) : (
                  <div className="rounded-lg border border-border bg-sidebar p-5 text-center">
                    <p className="text-sm text-muted-fg">No notification channels configured.</p>
                    <Link
                      href="/notification-channels/create"
                      className="mt-2 block text-xs text-primary hover:underline"
                    >
                      Set one up →
                    </Link>
                  </div>
                )}

                {tags.length > 0 && (
                  <fieldset>
                    <legend className="mb-3 text-sm font-medium text-fg">Tags</legend>
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
                            className="mr-1 inline-block size-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </Checkbox>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            )}

            {/* footer nav */}
            <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
              <Button intent="outline" onPress={goPrev} isDisabled={isFirst}>
                ← Back
              </Button>

              {/* progress dots */}
              <div className="flex items-center gap-1.5">
                {visibleSteps.map((s, i) => (
                  <div
                    key={s.key}
                    className={[
                      "h-1 rounded-full transition-all duration-200",
                      s.key === activeKey ? "w-6 bg-primary" : i < activeIndex ? "w-4 bg-primary/40" : "w-4 bg-border",
                    ].join(" ")}
                  />
                ))}
              </div>

              {isLast ? (
                <Button type="submit" isDisabled={processing}>
                  {isEditing ? "Save changes" : "Create monitor"}
                </Button>
              ) : (
                <Button onPress={goNext}>Continue →</Button>
              )}
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}
