import { Head, router } from "@inertiajs/react"
import { useState } from "react"
import { Eyebrow } from "@/components/primitives/eyebrow"
import { StatusDot, type StatusDotStatus } from "@/components/primitives/status-dot"
import { Button } from "@/components/ui/button"
import { Link } from "@/components/ui/link"
import GuestLayout from "@/layouts/guest-layout"

type AckMode = "preview" | "confirmed"
type AckStatus = "acked" | "already_acked" | "resolved" | "invalid_token" | "pending"

interface AckResultProps {
  mode: AckMode
  status: AckStatus
  monitor_name: string | null
  started_at: string | null
  acked_at: string | null
  confirm_url?: string | null
}

const copy: Record<
  AckStatus,
  {
    eyebrow: string
    title: string
    description: string
    dot: StatusDotStatus
  }
> = {
  pending: {
    eyebrow: "// confirm acknowledgement",
    title: "Acknowledge incident?",
    description:
      "On-call paging will stop. The incident stays open until the monitor reports a recovery.",
    dot: "down",
  },
  acked: {
    eyebrow: "// incident acknowledged",
    title: "Acknowledged",
    description:
      "On-call paging stopped. The incident stays open until the monitor reports a recovery.",
    dot: "degraded",
  },
  already_acked: {
    eyebrow: "// incident already acknowledged",
    title: "Already acknowledged",
    description: "Someone on the team already acked this incident. No further action is needed.",
    dot: "degraded",
  },
  resolved: {
    eyebrow: "// incident resolved",
    title: "Already resolved",
    description: "The monitor recovered. There is nothing to acknowledge.",
    dot: "up",
  },
  invalid_token: {
    eyebrow: "// invalid link",
    title: "Invalid acknowledgement link",
    description:
      "The link is no longer valid. Open the dashboard and acknowledge the active incident there.",
    dot: "unknown",
  },
}

export default function AckResultPage({
  mode,
  status,
  monitor_name: monitorName,
  acked_at: ackedAt,
  confirm_url: confirmUrl,
}: AckResultProps) {
  const c = copy[status]
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = () => {
    if (!confirmUrl || submitting) return
    setSubmitting(true)
    router.post(
      confirmUrl,
      {},
      {
        onFinish: () => setSubmitting(false),
      },
    )
  }

  const showConfirm = mode === "preview" && status === "pending" && confirmUrl

  return (
    <>
      <Head title="Acknowledge incident" />
      <div className="space-y-5">
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <div className="flex items-center gap-3">
          <StatusDot status={c.dot} label={c.title} />
          <h1 className="font-semibold text-foreground text-xl">{c.title}</h1>
        </div>
        <p className="text-muted-foreground text-sm">{c.description}</p>

        {monitorName && (
          <dl className="space-y-2 rounded-lg border border-border bg-popover px-4 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Monitor</dt>
              <dd className="font-medium text-foreground">{monitorName}</dd>
            </div>
            {ackedAt && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Acknowledged at</dt>
                <dd className="font-mono text-foreground tabular-nums">
                  {new Date(ackedAt).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        )}

        {showConfirm ? (
          <Button
            intent="warning"
            onPress={handleConfirm}
            isPending={submitting}
            data-testid="confirm-ack"
          >
            Confirm acknowledge
          </Button>
        ) : (
          <Link href="/dashboard" className="text-primary text-sm">
            Open dashboard
          </Link>
        )}
      </div>
    </>
  )
}

AckResultPage.layout = (page: React.ReactNode) => (
  <GuestLayout header="Incident acknowledgement">{page}</GuestLayout>
)
