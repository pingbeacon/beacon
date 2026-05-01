import { router, useForm } from "@inertiajs/react"
import { useEffect, useState } from "react"
import { Form } from "react-aria-components"
import AssertionController from "@/actions/App/Http/Controllers/AssertionController"
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { TextField } from "@/components/ui/text-field"

export type AssertionType = "status" | "latency" | "body" | "header" | "content_type"
export type AssertionSeverity = "critical" | "warning" | "info"
export type AssertionOnFail = "open_incident" | "log_only"
export type AssertionState = "pass" | "fail" | "warn" | "mute"

export interface AssertionRowPayload {
  id: number
  type: AssertionType
  expression: string
  name: string | null
  severity: AssertionSeverity
  on_fail: AssertionOnFail
  muted: boolean
  tolerance: number
  pass_rate: number | null
  fail_count_24h: number
  total_24h: number
  last_fail_at: string | null
  last_fail_actual: string | null
  state: AssertionState
  buckets: number[]
}

interface Props {
  monitorId: number
  assertions: AssertionRowPayload[] | null | undefined
  canUpdate?: boolean
}

const FILTERS: Array<{ key: "all" | "failing" | "passing" | "muted"; label: string }> = [
  { key: "all", label: "All" },
  { key: "failing", label: "Failing" },
  { key: "passing", label: "Passing" },
  { key: "muted", label: "Muted" },
]

const ASSERTION_TYPE_OPTIONS: Array<{ id: AssertionType; name: string }> = [
  { id: "status", name: "status" },
  { id: "latency", name: "latency" },
  { id: "body", name: "body" },
  { id: "header", name: "header" },
  { id: "content_type", name: "content_type" },
]

const ASSERTION_SEVERITY_OPTIONS: Array<{ id: AssertionSeverity; name: string }> = [
  { id: "critical", name: "critical" },
  { id: "warning", name: "warning" },
  { id: "info", name: "info" },
]

const ASSERTION_ON_FAIL_OPTIONS: Array<{ id: AssertionOnFail; name: string }> = [
  { id: "open_incident", name: "open incident" },
  { id: "log_only", name: "log only" },
]

function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86_400)}d ago`
}

function stateColor(state: AssertionState): string {
  switch (state) {
    case "fail":
      return "text-destructive"
    case "warn":
      return "text-warning"
    case "mute":
      return "text-muted-foreground"
    default:
      return "text-success"
  }
}

function stateLabel(state: AssertionState): string {
  switch (state) {
    case "fail":
      return "FAILING"
    case "warn":
      return "WARNING"
    case "mute":
      return "MUTED"
    default:
      return "PASSING"
  }
}

function isFailingState(state: AssertionState): boolean {
  return state === "fail" || state === "warn"
}

function bucketColor(value: number): string {
  if (value === 2) return "bg-destructive"
  if (value === 1) return "bg-warning"
  if (value === 0) return "bg-success/45"
  return "bg-muted/40"
}

function AssertionsSummary({ assertions }: { assertions: AssertionRowPayload[] }) {
  const total = assertions.length
  const muted = assertions.filter((a) => a.muted).length
  const active = total - muted
  const failing = assertions.filter((a) => isFailingState(a.state)).length
  const totalChecks = assertions.reduce((acc, a) => acc + a.total_24h, 0)
  const passes = assertions.reduce((acc, a) => acc + (a.total_24h - a.fail_count_24h), 0)
  const passRate = totalChecks > 0 ? ((passes / totalChecks) * 100).toFixed(2) : "—"
  const failingTypes = assertions
    .filter((a) => isFailingState(a.state))
    .map((a) => a.type)
    .join(" · ")

  const items = [
    {
      label: "assertions",
      value: String(total),
      sub: `${active} active · ${muted} muted`,
      intent: "default" as const,
    },
    {
      label: "pass rate · 24h",
      value: passRate === "—" ? "—" : `${passRate}%`,
      sub: `${passes.toLocaleString()} of ${totalChecks.toLocaleString()}`,
      intent: "primary" as const,
    },
    {
      label: "failing now",
      value: String(failing),
      sub: failingTypes || "none",
      intent: failing > 0 ? "danger" : ("default" as const),
    },
    {
      label: "checks · 24h",
      value: totalChecks.toLocaleString(),
      sub: "across all rules",
      intent: "default" as const,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-slot="assertions-summary">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {it.label}
          </div>
          <div
            className={`mt-1 font-medium text-2xl tracking-tight ${
              it.intent === "danger"
                ? "text-destructive"
                : it.intent === "primary"
                  ? "text-primary"
                  : "text-foreground"
            }`}
          >
            {it.value}
          </div>
          <div className="mt-1 text-muted-foreground text-xs">{it.sub}</div>
        </div>
      ))}
    </div>
  )
}

function AssertionsToolbar({
  filter,
  setFilter,
  counts,
  onCreate,
  canUpdate,
}: {
  filter: string
  setFilter: (f: "all" | "failing" | "passing" | "muted") => void
  counts: Record<string, number>
  onCreate: () => void
  canUpdate: boolean
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      data-slot="assertions-toolbar"
    >
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                isActive
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{f.label}</span>
              <span className={isActive ? "opacity-70" : "opacity-100"}>{counts[f.key] ?? 0}</span>
            </button>
          )
        })}
      </div>
      {canUpdate && (
        <Button intent="primary" size="sm" onPress={onCreate} data-slot="new-assertion-trigger">
          + New assertion
        </Button>
      )}
    </div>
  )
}

function Timeline({ buckets }: { buckets: number[] }) {
  return (
    <div className="flex h-5 items-stretch gap-px" data-slot="assertion-timeline">
      {buckets.map((b, i) => (
        <div key={i} className={`flex-1 rounded-[1px] ${bucketColor(b)}`} />
      ))}
    </div>
  )
}

function AssertionRow({
  assertion,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onMuteToggle,
  canUpdate,
}: {
  assertion: AssertionRowPayload
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onMuteToggle: () => void
  canUpdate: boolean
}) {
  return (
    <div
      className="border-border border-t"
      data-slot="assertion-row"
      data-assertion-id={assertion.id}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`grid w-full items-center gap-x-4 px-4 py-3 text-left ${
          expanded ? "bg-primary/5" : "bg-transparent"
        } ${assertion.muted ? "opacity-60" : ""}`}
        style={{ gridTemplateColumns: "10px 88px minmax(0, 1fr) 220px 78px 92px 16px" }}
      >
        <span
          className={`h-2 w-2 rounded-full ${stateColor(assertion.state).replace("text-", "bg-")}`}
        />
        <span className={`font-bold text-[10px] tracking-wider ${stateColor(assertion.state)}`}>
          {stateLabel(assertion.state)}
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {assertion.type}
            </span>
            <span className="truncate font-medium font-mono text-foreground text-sm">
              {assertion.expression}
            </span>
          </div>
          {assertion.name && (
            <div className="mt-1 truncate text-muted-foreground text-xs">{assertion.name}</div>
          )}
        </div>
        <Timeline buckets={assertion.buckets} />
        <div className="text-right">
          <div className={`font-medium text-sm ${stateColor(assertion.state)}`}>
            {assertion.pass_rate !== null ? `${assertion.pass_rate}%` : "—"}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {assertion.fail_count_24h} fails
          </div>
        </div>
        <div className="text-right text-muted-foreground text-xs">
          {timeAgo(assertion.last_fail_at)}
        </div>
        <div className="text-center text-muted-foreground text-xs">{expanded ? "▾" : "▸"}</div>
      </button>
      {expanded && (
        <div
          className="grid gap-4 bg-primary/[0.02] px-5 pb-5 md:grid-cols-[1.2fr_1fr]"
          data-slot="assertion-detail"
        >
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">Definition</span>
                {canUpdate && (
                  <div className="flex gap-2 text-xs">
                    <Button intent="outline" size="sm" onPress={onEdit}>
                      Edit
                    </Button>
                    <Button intent="outline" size="sm" onPress={onMuteToggle}>
                      {assertion.muted ? "Unmute" : "Mute"}
                    </Button>
                    <Button intent="danger" size="sm" onPress={onDelete}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              <pre className="rounded border border-border bg-primary/5 px-3 py-3 font-mono text-foreground text-sm">
                {assertion.expression}
              </pre>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <Meta
                  label="Severity"
                  value={assertion.severity}
                  accent={
                    assertion.severity === "critical"
                      ? "danger"
                      : assertion.severity === "warning"
                        ? "warn"
                        : "muted"
                  }
                />
                <Meta label="On fail" value={assertion.on_fail.replace("_", " ")} />
                <Meta label="Tolerance" value={`${assertion.tolerance} in a row`} />
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-semibold text-foreground text-sm">Last failing check</span>
                <span className="text-[10px] text-muted-foreground">
                  {timeAgo(assertion.last_fail_at)}
                </span>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                <span className="text-muted-foreground">expected</span>
                <span className="text-success">{assertion.expression}</span>
                <span className="text-muted-foreground">actual</span>
                <span className="text-destructive">{assertion.last_fail_actual ?? "—"}</span>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-3 font-semibold text-foreground text-sm">Failure pattern · 24h</div>
            <div className="text-muted-foreground text-xs">
              {assertion.fail_count_24h} fail{assertion.fail_count_24h === 1 ? "" : "s"} of{" "}
              {assertion.total_24h} checks
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Meta({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "danger" | "warn" | "muted"
}) {
  const accentClass =
    accent === "danger"
      ? "text-destructive"
      : accent === "warn"
        ? "text-warning"
        : "text-foreground"
  return (
    <div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`mt-0.5 font-mono text-sm ${accent ? accentClass : "text-foreground"}`}>
        {value}
      </div>
    </div>
  )
}

interface ModalState {
  open: boolean
  editing: AssertionRowPayload | null
}

function AssertionFormModal({
  monitorId,
  state,
  onClose,
}: {
  monitorId: number
  state: ModalState
  onClose: () => void
}) {
  const initial = state.editing
  const { data, setData, post, patch, errors, processing, reset } = useForm({
    type: initial?.type ?? "status",
    expression: initial?.expression ?? "status == 200",
    name: initial?.name ?? "",
    severity: initial?.severity ?? "warning",
    on_fail: initial?.on_fail ?? "log_only",
    tolerance: initial?.tolerance ?? 1,
    muted: initial?.muted ?? false,
  })

  // useForm only initialises on mount; re-seed when the modal opens with a different
  // assertion (or transitions between create/edit) so the form mirrors the row clicked.
  useEffect(() => {
    if (!state.open) return
    setData({
      type: initial?.type ?? "status",
      expression: initial?.expression ?? "status == 200",
      name: initial?.name ?? "",
      severity: initial?.severity ?? "warning",
      on_fail: initial?.on_fail ?? "log_only",
      tolerance: initial?.tolerance ?? 1,
      muted: initial?.muted ?? false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, initial?.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const onSuccess = () => {
      reset()
      onClose()
    }
    if (initial) {
      patch(AssertionController.update.url({ monitor: monitorId, assertion: initial.id }), {
        onSuccess,
      })
    } else {
      post(AssertionController.store.url({ monitor: monitorId }), { onSuccess })
    }
  }

  return (
    <Modal isOpen={state.open} onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <Form onSubmit={handleSubmit} data-slot="assertion-form">
          <ModalHeader>
            <ModalTitle>{initial ? "Edit assertion" : "New assertion"}</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Select
              selectedKey={data.type}
              onSelectionChange={(k) => setData("type", k as AssertionType)}
            >
              <Label>Type</Label>
              <SelectTrigger />
              <SelectContent items={ASSERTION_TYPE_OPTIONS}>
                {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
              </SelectContent>
            </Select>
            <TextField
              value={data.expression}
              onChange={(v) => setData("expression", v)}
              isInvalid={!!errors.expression}
            >
              <Label>Expression</Label>
              <Input />
              {errors.expression && <FieldError>{errors.expression}</FieldError>}
            </TextField>
            <TextField value={data.name ?? ""} onChange={(v) => setData("name", v)}>
              <Label>Name (optional)</Label>
              <Input />
            </TextField>
            <div className="grid grid-cols-2 gap-3">
              <Select
                selectedKey={data.severity}
                onSelectionChange={(k) => setData("severity", k as AssertionSeverity)}
              >
                <Label>Severity</Label>
                <SelectTrigger />
                <SelectContent items={ASSERTION_SEVERITY_OPTIONS}>
                  {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
                </SelectContent>
              </Select>
              <Select
                selectedKey={data.on_fail}
                onSelectionChange={(k) => setData("on_fail", k as AssertionOnFail)}
              >
                <Label>On fail</Label>
                <SelectTrigger />
                <SelectContent items={ASSERTION_ON_FAIL_OPTIONS}>
                  {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <TextField
                value={String(data.tolerance)}
                onChange={(v) => setData("tolerance", Number(v) || 0)}
              >
                <Label>Tolerance (consecutive fails)</Label>
                <Input type="number" min={0} max={60} />
              </TextField>
              <Checkbox isSelected={data.muted} onChange={(v) => setData("muted", v)}>
                Muted
              </Checkbox>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button intent="outline" onPress={onClose} type="button">
              Cancel
            </Button>
            <Button intent="primary" type="submit" isPending={processing}>
              {initial ? "Save" : "Create"}
            </Button>
          </ModalFooter>
        </Form>
      </ModalContent>
    </Modal>
  )
}

export function AssertionsTab({ monitorId, assertions, canUpdate = false }: Props) {
  const [filter, setFilter] = useState<"all" | "failing" | "passing" | "muted">("all")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null })

  if (assertions == null) {
    return (
      <div className="flex flex-col gap-4" data-slot="assertions-loading">
        <AssertionsToolbar
          filter={filter}
          setFilter={setFilter}
          counts={{ all: 0, failing: 0, passing: 0, muted: 0 }}
          onCreate={() => setModal({ open: true, editing: null })}
          canUpdate={canUpdate}
        />
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="h-4 w-48 animate-pulse rounded bg-muted/50" />
        </div>
        {canUpdate && (
          <AssertionFormModal
            monitorId={monitorId}
            state={modal}
            onClose={() => setModal({ open: false, editing: null })}
          />
        )}
      </div>
    )
  }

  const list = assertions
  const counts = {
    all: list.length,
    failing: list.filter((a) => isFailingState(a.state)).length,
    passing: list.filter((a) => a.state === "pass").length,
    muted: list.filter((a) => a.muted).length,
  }
  const filtered = list.filter((a) => {
    if (filter === "all") return true
    if (filter === "failing") return isFailingState(a.state)
    if (filter === "passing") return a.state === "pass"
    if (filter === "muted") return a.muted
    return true
  })

  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <AssertionsToolbar
          filter={filter}
          setFilter={setFilter}
          counts={counts}
          onCreate={() => setModal({ open: true, editing: null })}
          canUpdate={canUpdate}
        />
        <div
          className="rounded-lg border border-border bg-card p-8 text-center"
          data-slot="assertions-empty"
        >
          <p className="text-muted-foreground text-sm">
            No assertions yet — add one to start checking response shape.
          </p>
        </div>
        {canUpdate && (
          <AssertionFormModal
            monitorId={monitorId}
            state={modal}
            onClose={() => setModal({ open: false, editing: null })}
          />
        )}
      </div>
    )
  }

  const handleDelete = (a: AssertionRowPayload) => {
    if (!confirm(`Delete assertion "${a.expression}"?`)) return
    router.delete(AssertionController.destroy.url({ monitor: monitorId, assertion: a.id }), {
      preserveScroll: true,
    })
  }

  const handleMuteToggle = (a: AssertionRowPayload) => {
    router.patch(
      AssertionController.update.url({ monitor: monitorId, assertion: a.id }),
      { muted: !a.muted },
      { preserveScroll: true },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AssertionsSummary assertions={list} />
      <AssertionsToolbar
        filter={filter}
        setFilter={setFilter}
        counts={counts}
        onCreate={() => setModal({ open: true, editing: null })}
        canUpdate={canUpdate}
      />
      <div className="rounded-lg border border-border bg-card">
        <div
          className="grid gap-x-4 border-border border-b bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider"
          style={{ gridTemplateColumns: "10px 88px minmax(0, 1fr) 220px 78px 92px 16px" }}
        >
          <div />
          <div>State</div>
          <div>Type · expression</div>
          <div>Pass / fail · 24h</div>
          <div className="text-right">Pass rate</div>
          <div className="text-right">Last fail</div>
          <div />
        </div>
        {filtered.map((a) => (
          <AssertionRow
            key={a.id}
            assertion={a}
            expanded={expandedId === a.id}
            onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
            onEdit={() => setModal({ open: true, editing: a })}
            onDelete={() => handleDelete(a)}
            onMuteToggle={() => handleMuteToggle(a)}
            canUpdate={canUpdate}
          />
        ))}
        <div className="flex items-center justify-between border-border border-t px-4 py-3 text-muted-foreground text-xs">
          <span>
            showing {filtered.length} of {list.length}
          </span>
          {canUpdate && (
            <button
              type="button"
              className="text-primary"
              onClick={() => setModal({ open: true, editing: null })}
            >
              + add another assertion
            </button>
          )}
        </div>
      </div>
      {canUpdate && (
        <AssertionFormModal
          monitorId={monitorId}
          state={modal}
          onClose={() => setModal({ open: false, editing: null })}
        />
      )}
    </div>
  )
}
