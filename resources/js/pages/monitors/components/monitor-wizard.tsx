import { CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid"
import { Link, router, useForm } from "@inertiajs/react"
import { useMemo, useState } from "react"
import TestNowMonitorController from "@/actions/App/Http/Controllers/TestNowMonitorController"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberField, NumberInput } from "@/components/ui/number-field"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { TextField } from "@/components/ui/text-field"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Monitor, MonitorGroup, NotificationChannel, Tag } from "@/types/monitor"

interface TestNowResult {
  status: "up" | "down"
  responseTime: number
  statusCode: number | null
  message: string | null
  startedAt: string
  type: string
}

const STEP_FIELDS: Record<string, string[]> = {
  type: ["type"],
  target: ["name", "url", "host", "port", "dns_record_type", "method", "body", "headers"],
  schedule: [
    "interval",
    "timeout",
    "retry_count",
    "ssl_monitoring_enabled",
    "ssl_expiry_notification_days",
  ],
  assertions: ["accepted_status_codes"],
  alerts: ["notification_channel_ids", "tag_ids"],
}

interface MonitorWizardProps {
  monitor?: Monitor
  tags: Tag[]
  notificationChannels: NotificationChannel[]
  groups?: MonitorGroup[]
}

const monitorTypes = [
  {
    id: "http",
    label: "HTTP(S)",
    desc: "GET / POST / custom methods. Assert status codes, response bodies, latency.",
  },
  {
    id: "tcp",
    label: "TCP",
    desc: "Open-socket check for databases, queues, anything with an open port.",
  },
  {
    id: "ping",
    label: "PING",
    desc: "TCP reachability. Tries 443/80/53 (or your chosen port) — no ICMP required.",
  },
  {
    id: "dns",
    label: "DNS",
    desc: "Resolve A / AAAA / CNAME / MX / TXT and assert expected values.",
  },
  {
    id: "push",
    label: "PUSH",
    desc: "Cron or worker posts to Beacon. Alert if no ping within window.",
  },
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

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function formatTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function nowStamp() {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export default function MonitorWizard({
  monitor,
  tags,
  notificationChannels,
  groups = [],
}: MonitorWizardProps) {
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

  const stepHasErrors = (stepKey: string) => {
    const fields = STEP_FIELDS[stepKey] ?? []
    return fields.some((f) => Boolean((errors as Record<string, string | undefined>)[f]))
  }

  const requiredFilled = (stepKey: string): boolean => {
    if (stepKey === "type") return Boolean(data.type)
    if (stepKey === "target") {
      if (!data.name) return false
      if (data.type === "http") return Boolean(data.url)
      if (data.type === "tcp") return Boolean(data.host) && Boolean(data.port)
      if (data.type === "ping" || data.type === "dns") return Boolean(data.host)
      return true
    }
    return true
  }

  const goNext = () => {
    if (stepHasErrors(activeKey) || !requiredFilled(activeKey)) return
    const next = visibleKeys[activeIndex + 1]
    if (next) setActiveKey(next)
  }

  const goPrev = () => {
    const prev = visibleKeys[activeIndex - 1]
    if (prev) setActiveKey(prev)
  }

  const isFirst = activeIndex === 0
  const isLast = activeIndex === visibleKeys.length - 1
  const continueDisabled = stepHasErrors(activeKey) || !requiredFilled(activeKey)

  const handleSubmit = () => {
    if (isEditing) {
      put(`/monitors/${monitor.id}`, { preserveScroll: true })
    } else {
      post("/monitors")
    }
  }

  // — Schedule preview math (frontend-only) —
  const schedulePreview = useMemo(() => {
    const interval = Math.max(1, data.interval || 1)
    const timeout = Math.max(0, data.timeout || 0)
    const retries = Math.max(0, data.retry_count || 0)
    const checksPerDay = Math.floor(86400 / interval)
    const worstCaseAlertSec = (retries + 1) * timeout + interval
    const bytesPerHeartbeat = 200
    const storageBytesPerMonth = bytesPerHeartbeat * checksPerDay * 30
    const storageMb = storageBytesPerMonth / 1024 / 1024
    return {
      checksPerDay,
      worstCaseAlertSec,
      storageMb,
    }
  }, [data.interval, data.timeout, data.retry_count])

  // — Test Now state —
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<TestNowResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const runTestNow = async () => {
    setTestRunning(true)
    setTestError(null)
    try {
      const action = TestNowMonitorController()
      const response = await fetch(action.url, {
        method: action.method.toUpperCase(),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": decodeURIComponent(
            (document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [, ""])[1] ?? "",
          ),
        },
        body: JSON.stringify({
          type: data.type,
          name: data.name || "Test",
          url: data.url || null,
          host: data.host || null,
          port: data.type === "tcp" ? data.port : null,
          dns_record_type: data.type === "dns" ? data.dns_record_type : null,
          method: data.method,
          body: data.body || null,
          headers: data.headers,
          accepted_status_codes: data.accepted_status_codes,
          timeout: data.timeout,
          retry_count: data.retry_count,
          interval: data.interval,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        setTestError(payload?.message ?? `HTTP ${response.status}`)
        setTestResult(null)
      } else {
        const payload = (await response.json()) as { result: TestNowResult }
        setTestResult(payload.result)
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Request failed")
      setTestResult(null)
    } finally {
      setTestRunning(false)
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
      <div className="sticky top-0 z-10 flex items-center justify-between border-border border-b bg-background px-6 py-4">
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Link href="/monitors" className="transition-colors hover:text-foreground">
              monitors
            </Link>
            <span>/</span>
            <span className="text-foreground">{isEditing ? monitor.name : "new"}</span>
          </div>
          <h1 className="mt-0.5 font-semibold text-xl tracking-tight">
            {isEditing ? `Edit ${monitor.name}` : "New monitor"}
          </h1>
        </div>
        <Button type="button" intent="outline" onPress={() => router.visit("/monitors")}>
          Cancel
        </Button>
      </div>

      {/* wizard body */}
      <div className="flex gap-0">
        {/* step rail */}
        <aside className="sticky top-[73px] h-[calc(100dvh-73px)] w-64 shrink-0 overflow-y-auto border-border border-r p-5">
          <p className="mb-3 text-[11px] text-muted-foreground uppercase tracking-widest">
            {"// setup"}
          </p>
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
                      ? "border-primary bg-primary/12"
                      : state === "done"
                        ? "border-primary/30 hover:bg-sidebar"
                        : "border-transparent hover:bg-sidebar",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-semibold text-[10px]",
                      state === "active"
                        ? "border-primary bg-primary text-primary-foreground"
                        : state === "done"
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground",
                    ].join(" ")}
                  >
                    {state === "done" ? <CheckIcon className="size-2.5" /> : s.n}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={[
                        "font-medium text-sm",
                        state === "active" ? "text-foreground" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                      {s.blurb}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* summary */}
          <div className="mt-5 rounded-lg rounded-lg border border-border bg-sidebar p-3.5">
            <p className="mb-2 font-medium text-foreground text-xs">Summary</p>
            <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
              <p>
                <span className="font-mono text-primary uppercase">{data.type}</span>
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
                {intervalOptions.find((o) => o.value === data.interval)?.label ??
                  `${data.interval}s`}
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
        <div className="min-h-[calc(100dvh-73px)] flex-1 px-10 py-8">
          <div className="mx-auto max-w-2xl">
            {/* step header */}
            <div className="mb-8">
              <p className="mb-2 font-mono text-[11px] text-primary uppercase tracking-widest">
                step {currentStep.n} / {String(visibleSteps.length).padStart(2, "0")}
              </p>
              <h2 className="font-semibold text-2xl tracking-tight">{currentStep.title}</h2>
              <p className="mt-1 text-muted-foreground text-sm">{currentStep.blurb}</p>
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
                        ? "border-primary bg-primary/12"
                        : "border-border bg-sidebar hover:border-primary/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={[
                          "font-mono font-semibold text-sm tracking-wide",
                          data.type === t.id ? "text-primary" : "text-foreground",
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
                        {data.type === t.id && (
                          <div className="size-1.5 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                      {t.desc}
                    </p>
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
                      <div className="mt-2 overflow-hidden rounded-lg rounded-lg border border-border">
                        {headerRows.length > 0 && (
                          <div className="grid grid-cols-[1fr_1fr_36px] bg-sidebar text-[11px] text-muted-foreground uppercase tracking-wider">
                            <div className="border-border border-b px-3 py-2">Key</div>
                            <div className="border-border border-b border-l px-3 py-2">Value</div>
                            <div className="border-border border-b border-l" />
                          </div>
                        )}
                        {headerRows.map((row, i) => (
                          <div key={i} className="grid grid-cols-[1fr_1fr_36px]">
                            <input
                              className="border-border border-b bg-transparent px-3 py-2.5 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:bg-sidebar"
                              placeholder="Authorization"
                              value={row.key}
                              onChange={(e) => {
                                const next = [...headerRows]
                                next[i] = { ...next[i], key: e.target.value }
                                updateHeaderRows(next)
                              }}
                            />
                            <input
                              className="border-border border-b border-l bg-transparent px-3 py-2.5 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:bg-sidebar"
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
                              onClick={() =>
                                updateHeaderRows(headerRows.filter((_, idx) => idx !== i))
                              }
                              className="flex items-center justify-center border-border border-b border-l text-muted-foreground hover:text-destructive"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateHeaderRows([...headerRows, { key: "", value: "" }])}
                          className="flex w-full items-center gap-1.5 px-3 py-2.5 text-muted-foreground text-xs hover:text-foreground"
                        >
                          <PlusIcon className="size-3.5" />
                          Add header
                        </button>
                      </div>
                    </div>

                    {(data.method === "POST" ||
                      data.method === "PUT" ||
                      data.method === "PATCH") && (
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
                  <div className="rounded-lg rounded-lg border border-border bg-sidebar p-4">
                    <p className="text-muted-foreground text-sm">
                      After creating this monitor, you'll receive a unique push URL. Your cron job
                      or worker should POST to it on each successful run. If no ping is received
                      within the check interval, Beacon will fire an alert.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* — Step: schedule — */}
            {activeKey === "schedule" && (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
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
                          <legend className="mb-3 font-medium text-foreground text-sm">
                            Alert when SSL expires within
                          </legend>
                          <div className="flex flex-wrap gap-3">
                            {sslExpiryDays.map((days) => (
                              <Checkbox
                                key={days}
                                isSelected={data.ssl_expiry_notification_days.includes(days)}
                                onChange={(checked) => {
                                  setData(
                                    "ssl_expiry_notification_days",
                                    checked
                                      ? [...data.ssl_expiry_notification_days, days].sort(
                                          (a, b) => b - a,
                                        )
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

                {/* schedule preview card */}
                <aside
                  data-slot="schedule-preview"
                  className="self-start rounded-lg border border-border bg-sidebar p-4"
                >
                  <p className="mb-3 font-medium text-foreground text-xs">Schedule preview</p>
                  <dl className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                    <div className="flex items-baseline justify-between gap-2">
                      <dt>
                        <span className="text-primary">every</span>{" "}
                        {intervalOptions.find((o) => o.value === data.interval)?.label ??
                          `${data.interval}s`}
                      </dt>
                      <dd
                        className="font-mono text-foreground"
                        data-testid="schedule-checks-per-day"
                      >
                        {schedulePreview.checksPerDay.toLocaleString()} checks/day
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <dt>
                        <span className="text-primary">timeout</span> after {data.timeout}s
                      </dt>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <dt>
                        <span className="text-primary">retry</span> {data.retry_count}× on fail
                      </dt>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <dt>
                        <span className="text-primary">worst-case</span> alert latency
                      </dt>
                      <dd className="font-mono text-foreground" data-testid="schedule-worst-case">
                        {schedulePreview.worstCaseAlertSec}s
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 border-border border-t pt-2">
                      <dt>storage</dt>
                      <dd className="font-mono text-foreground" data-testid="schedule-storage">
                        ~{schedulePreview.storageMb.toFixed(1)} MB/month
                      </dd>
                    </div>
                  </dl>
                </aside>
              </div>
            )}

            {/* — Step: assertions — */}
            {activeKey === "assertions" && (
              <div className="space-y-5">
                <div>
                  <p className="mb-1 font-medium text-foreground text-sm">Accepted status codes</p>
                  <p className="mb-4 text-muted-foreground text-xs">
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
                            ? "border-primary bg-primary/12 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        ].join(" ")}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg rounded-lg border border-border bg-sidebar p-4">
                  <p className="font-mono text-muted-foreground text-xs">
                    {
                      "// monitor is DOWN when status code is not in the accepted list, or when the request times out"
                    }
                  </p>
                </div>

                {/* test now panel */}
                <div
                  data-slot="test-now"
                  className="rounded-lg border border-primary/30 bg-background p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Test run</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Dry-run your config. No notifications fire, nothing is saved.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onPress={runTestNow}
                      isDisabled={testRunning || !requiredFilled("target")}
                      data-testid="test-now-button"
                    >
                      {testRunning ? "Testing…" : "./test →"}
                    </Button>
                  </div>

                  {(testResult || testError) && (
                    <div
                      data-testid="test-now-output"
                      className="mt-4 border-border border-t pt-3 font-mono text-[11px] leading-relaxed"
                    >
                      {testError && (
                        <p className="text-destructive">
                          <span className="text-muted-foreground">{nowStamp()}</span>
                          {"  "}✗ {testError}
                        </p>
                      )}
                      {testResult && (
                        <div className="space-y-0.5">
                          <p
                            className={
                              testResult.status === "up" ? "text-success" : "text-destructive"
                            }
                          >
                            <span className="text-muted-foreground">
                              {formatTime(testResult.startedAt)}
                            </span>
                            {"  "}
                            {testResult.status === "up" ? "←" : "✗"}{" "}
                            {testResult.statusCode != null ? `${testResult.statusCode} ` : ""}·{" "}
                            {testResult.responseTime}ms
                          </p>
                          <p
                            className={
                              testResult.status === "up" ? "text-success" : "text-destructive"
                            }
                          >
                            <span className="text-muted-foreground">
                              {formatTime(testResult.startedAt)}
                            </span>
                            {"  "}
                            {testResult.status === "up"
                              ? "✓ UP · check passed"
                              : `✗ DOWN · ${testResult.message ?? "check failed"}`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* — Step: alerts — */}
            {activeKey === "alerts" && (
              <div className="space-y-6">
                {notificationChannels.length > 0 ? (
                  <fieldset>
                    <legend className="mb-3 font-medium text-foreground text-sm">
                      Notification channels
                    </legend>
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
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                e.currentTarget.click()
                              }
                            }}
                            className={[
                              "flex cursor-pointer items-center gap-4 rounded-lg border p-3.5 transition-colors",
                              on
                                ? "border-primary/50 bg-primary/12"
                                : "border-border hover:border-primary/30",
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
                              <p className="font-medium text-foreground text-sm">{channel.name}</p>
                              <p className="text-muted-foreground text-xs capitalize">
                                {channel.type}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </fieldset>
                ) : (
                  <div className="rounded-lg rounded-lg border border-border bg-sidebar p-5 text-center">
                    <p className="text-muted-foreground text-sm">
                      No notification channels configured.
                    </p>
                    <Link
                      href="/notification-channels/create"
                      className="mt-2 block text-primary text-xs hover:underline"
                    >
                      Set one up →
                    </Link>
                  </div>
                )}

                {tags.length > 0 && (
                  <fieldset>
                    <legend className="mb-3 font-medium text-foreground text-sm">Tags</legend>
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
            <div className="mt-12 flex items-center justify-between border-border border-t pt-6">
              <Button type="button" intent="outline" onPress={goPrev} isDisabled={isFirst}>
                ← Back
              </Button>

              {/* progress dots */}
              <div className="flex items-center gap-1.5">
                {visibleSteps.map((s, i) => (
                  <div
                    key={s.key}
                    className={[
                      "h-1 rounded-full transition-all duration-200",
                      s.key === activeKey
                        ? "w-6 bg-primary"
                        : i < activeIndex
                          ? "w-4 bg-primary/40"
                          : "w-4 bg-border",
                    ].join(" ")}
                  />
                ))}
              </div>

              {isLast ? (
                <Button key="submit" type="button" onPress={handleSubmit} isDisabled={processing}>
                  {isEditing ? "Save changes" : "Create monitor"}
                </Button>
              ) : (
                <Button key="continue" type="button" onPress={goNext} isDisabled={continueDisabled}>
                  Continue →
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
