import { useEffect, useState } from "react"
import MonitorDryRunController from "@/actions/App/Http/Controllers/MonitorDryRunController"
import { SegmentedToggle } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TextField } from "@/components/ui/text-field"

export type DryRunAssertionType = "status" | "latency" | "body" | "header" | "content_type"
export type DryRunSource = "heartbeat" | "pasted"

export interface DryRunVerdict {
  verdict: "pass" | "fail" | "parse_error"
  type: string
  expression: string
  actual_value: string | null
  parse_error: string | null
  evaluation_ms: number
  expected_value: string | null
  diff: string | null
  mismatch_part: "body" | "header" | "content_type" | null
}

export interface DryRunHeartbeat {
  id: number
  status_code: number | null
  response_time: number | null
  created_at: string
}

interface Props {
  monitorId: number
  recentHeartbeats: DryRunHeartbeat[]
}

const TYPE_OPTIONS: Array<{ id: DryRunAssertionType; name: string }> = [
  { id: "status", name: "status" },
  { id: "latency", name: "latency" },
  { id: "body", name: "body" },
  { id: "header", name: "header" },
  { id: "content_type", name: "content_type" },
]

const SOURCE_OPTIONS = [
  { value: "heartbeat" as const, label: "heartbeat" },
  { value: "pasted" as const, label: "pasted" },
]

const DEFAULT_EXPRESSIONS: Record<DryRunAssertionType, string> = {
  status: "status == 200",
  latency: "response_time_ms < 2000",
  body: '$.status == "ok"',
  header: "content-type ~ application/json",
  content_type: "content-type ~ application/json",
}

function csrfHeader(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1] ?? "") : ""
}

function verdictLabel(v: DryRunVerdict["verdict"]): string {
  if (v === "pass") return "PASS"
  if (v === "fail") return "FAIL"
  return "PARSE ERROR"
}

function verdictClass(v: DryRunVerdict["verdict"]): string {
  if (v === "pass") return "text-success"
  if (v === "fail") return "text-destructive"
  return "text-warning"
}

function dotClass(v: DryRunVerdict["verdict"]): string {
  if (v === "pass") return "bg-success"
  if (v === "fail") return "bg-destructive"
  return "bg-warning"
}

export function DryRunPanel({ monitorId, recentHeartbeats }: Props) {
  const [type, setType] = useState<DryRunAssertionType>("latency")
  const [expression, setExpression] = useState<string>(DEFAULT_EXPRESSIONS.latency)
  const [source, setSource] = useState<DryRunSource>("heartbeat")
  const [heartbeatId, setHeartbeatId] = useState<number | null>(recentHeartbeats[0]?.id ?? null)
  const [pastedStatus, setPastedStatus] = useState<string>("200")
  const [pastedLatency, setPastedLatency] = useState<string>("4218")
  const [pastedBody, setPastedBody] = useState<string>('{"status":"ok"}')
  const [pastedContentType, setPastedContentType] = useState<string>("application/json")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DryRunVerdict | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  useEffect(() => {
    const isStillPresent = recentHeartbeats.some((hb) => hb.id === heartbeatId)
    if (heartbeatId === null || !isStillPresent) {
      setHeartbeatId(recentHeartbeats[0]?.id ?? null)
    }
  }, [recentHeartbeats, heartbeatId])

  const handleTypeChange = (next: DryRunAssertionType) => {
    setType(next)
    setExpression(DEFAULT_EXPRESSIONS[next])
  }

  const buildBody = () => {
    if (source === "heartbeat") {
      return { type, expression, source, heartbeat_id: heartbeatId }
    }
    return {
      type,
      expression,
      source,
      response: {
        status_code: pastedStatus === "" ? null : Number(pastedStatus),
        latency_ms: pastedLatency === "" ? null : Number(pastedLatency),
        body: pastedBody || null,
        content_type: pastedContentType || null,
        headers: pastedContentType ? { "content-type": pastedContentType } : {},
      },
    }
  }

  const run = async () => {
    setRunning(true)
    setRequestError(null)
    setResult(null)
    try {
      const action = MonitorDryRunController(monitorId)
      const response = await fetch(action.url, {
        method: action.method.toUpperCase(),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": csrfHeader(),
        },
        body: JSON.stringify(buildBody()),
      })
      if (!response.ok) {
        const message = await response.text()
        setRequestError(`Request failed (${response.status}): ${message.slice(0, 200)}`)
        return
      }
      const json = (await response.json()) as DryRunVerdict
      setResult(json)
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setRunning(false)
    }
  }

  const noHeartbeats = recentHeartbeats.length === 0

  return (
    <div className="rounded-lg border border-border bg-card font-mono" data-slot="dry-run-panel">
      <div className="flex items-baseline justify-between border-border border-b px-5 py-4">
        <div>
          <div className="font-semibold text-foreground text-sm">Dry run</div>
          <div className="mt-1 text-muted-foreground text-xs">
            replay any assertion against a recent response — no notifications sent
          </div>
        </div>
        <Button
          intent="primary"
          size="sm"
          onPress={run}
          isPending={running}
          isDisabled={source === "heartbeat" && noHeartbeats}
          data-slot="dry-run-run"
        >
          ▸ Run
        </Button>
      </div>
      <div className="grid border-border border-b md:grid-cols-2">
        <div
          className="flex flex-col gap-3 border-border p-5 md:border-r"
          data-slot="dry-run-rule-editor"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rule</span>
          </div>
          <Select
            selectedKey={type}
            onSelectionChange={(k) => handleTypeChange(k as DryRunAssertionType)}
          >
            <Label>Type</Label>
            <SelectTrigger />
            <SelectContent items={TYPE_OPTIONS}>
              {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
            </SelectContent>
          </Select>
          <TextField value={expression} onChange={setExpression}>
            <Label>Expression</Label>
            <Input data-slot="dry-run-expression" />
          </TextField>
        </div>
        <div className="flex flex-col gap-3 p-5" data-slot="dry-run-source-picker">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Source
            </span>
            <SegmentedToggle
              size="sm"
              value={source}
              onChange={(v) => setSource(v)}
              options={SOURCE_OPTIONS}
            />
          </div>
          {source === "heartbeat" ? (
            noHeartbeats ? (
              <div
                className="rounded border border-border border-dashed bg-muted/20 p-3 text-muted-foreground text-xs"
                data-slot="dry-run-no-heartbeats"
              >
                No recent heartbeats yet. Switch to <strong>pasted</strong> to dry-run against a
                literal response.
              </div>
            ) : (
              <div className="flex flex-col gap-2" data-slot="dry-run-heartbeat-form">
                <Select
                  selectedKey={heartbeatId ?? undefined}
                  onSelectionChange={(k) => setHeartbeatId(Number(k))}
                >
                  <Label>Recent heartbeat</Label>
                  <SelectTrigger />
                  <SelectContent items={recentHeartbeats}>
                    {(hb) => {
                      const label = `#${hb.id} · status=${hb.status_code ?? "—"} · ${hb.response_time ?? "—"}ms`
                      return <SelectItem id={hb.id}>{label}</SelectItem>
                    }}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2" data-slot="dry-run-pasted-form">
              <div className="grid grid-cols-2 gap-3">
                <TextField value={pastedStatus} onChange={setPastedStatus}>
                  <Label>status_code</Label>
                  <Input type="number" />
                </TextField>
                <TextField value={pastedLatency} onChange={setPastedLatency}>
                  <Label>latency_ms</Label>
                  <Input type="number" />
                </TextField>
              </div>
              <TextField value={pastedContentType} onChange={setPastedContentType}>
                <Label>content-type</Label>
                <Input />
              </TextField>
              <TextField value={pastedBody} onChange={setPastedBody}>
                <Label>body</Label>
                <Textarea rows={5} data-slot="dry-run-pasted-body" />
              </TextField>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-4">
        {requestError && (
          <div
            className="mb-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs"
            data-slot="dry-run-request-error"
          >
            {requestError}
          </div>
        )}
        {result ? (
          <div className="flex flex-col gap-3" data-slot="dry-run-verdict">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dotClass(result.verdict)}`} />
                <span className={`font-bold tracking-wider ${verdictClass(result.verdict)}`}>
                  {verdictLabel(result.verdict)}
                </span>
              </span>
              {result.parse_error ? (
                <span className="text-warning">{result.parse_error}</span>
              ) : (
                <span className="text-muted-foreground">
                  actual ={" "}
                  <span className={verdictClass(result.verdict)}>{result.actual_value ?? "—"}</span> ·
                  expression <span className="text-foreground">{result.expression}</span>
                </span>
              )}
              <span className="ml-auto text-muted-foreground">
                evaluation {result.evaluation_ms.toFixed(2)}ms
              </span>
            </div>
            {result.diff && (
              <div className="rounded border border-border bg-muted/20 p-3 text-xs">
                <div className="mb-2 text-muted-foreground">
                  {result.mismatch_part && (
                    <span className="font-semibold">
                      {result.mismatch_part} mismatch
                    </span>
                  )}
                </div>
                <pre className="overflow-x-auto text-foreground">{result.diff}</pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-xs" data-slot="dry-run-idle">
            Configure a rule + source, then press Run. Verdicts never persist.
          </div>
        )}
      </div>
    </div>
  )
}
