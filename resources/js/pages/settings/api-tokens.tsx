import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline"
import { Head, router, useForm, usePage } from "@inertiajs/react"
import { useState } from "react"
import { Form } from "react-aria-components"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox, CheckboxGroup } from "@/components/ui/checkbox"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { TextField } from "@/components/ui/text-field"
import AppLayout from "@/layouts/app-layout"
import SettingsLayout from "@/layouts/settings-layout"
import type { SharedData } from "@/types/shared"

interface ApiToken {
  id: number
  name: string
  scopes: string[]
  team_id: number | null
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

interface Props {
  tokens: ApiToken[]
}

const SCOPE_LABELS: Record<string, string> = {
  "monitors:read": "Read Monitors",
  "monitors:write": "Write Monitors",
  "heartbeats:read": "Read Heartbeats",
  "status-pages:read": "Read Status Pages",
  "status-pages:write": "Write Status Pages",
  "incidents:read": "Read Incidents",
  "tags:read": "Read Tags",
}

const ALL_SCOPES = Object.keys(SCOPE_LABELS)

const EXPIRY_OPTIONS = [
  { id: "", label: "No expiration" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "1y", label: "1 year" },
]

function formatDate(iso: string | null): string {
  if (!iso) return "Never"
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export default function ApiTokensPage({ tokens }: Props) {
  const { teams, flash } = usePage<
    SharedData & { flash: { type: string; data?: { token?: string } } }
  >().props

  const newToken = flash?.data?.token ?? null

  const [createOpen, setCreateOpen] = useState(false)
  const [revokeAllOpen, setRevokeAllOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToken = () => {
    if (!newToken) return
    navigator.clipboard.writeText(newToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const { data, setData, post, errors, processing, reset } = useForm({
    name: "",
    team_id: teams[0]?.id?.toString() ?? "",
    scopes: [] as string[],
    expires_at: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/settings/api-tokens", {
      onSuccess: () => {
        reset()
        setCreateOpen(false)
      },
    })
  }

  const revokeToken = (id: number) => {
    router.delete(`/settings/api-tokens/${id}`, { preserveScroll: true })
  }

  const revokeAll = () => {
    router.delete("/settings/api-tokens/all", {
      preserveScroll: true,
      onSuccess: () => setRevokeAllOpen(false),
    })
  }

  return (
    <>
      <Head title="API Tokens" />

      {newToken && (
        <Card className="mb-6 border-success/40 bg-success-subtle">
          <CardHeader>
            <CardTitle className="text-success-subtle-fg">Token Created</CardTitle>
            <CardDescription className="text-success-subtle-fg/80">
              Copy your token now — it will not be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <code className="block select-all break-all rounded-lg border border-success/30 bg-bg p-3 font-mono text-sm">
              {newToken}
            </code>
            <Button intent="outline" size="sm" onPress={copyToken} className="gap-1.5">
              {copied ? (
                <>
                  <ClipboardDocumentCheckIcon className="size-4 text-success" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="size-4" />
                  Copy to clipboard
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>API Tokens</CardTitle>
            <CardDescription>
              Personal access tokens for authenticating with the Beacon API.
            </CardDescription>
          </div>
          <Modal isOpen={createOpen} onOpenChange={setCreateOpen}>
            <Button size="sm" onPress={() => setCreateOpen(true)}>
              New Token
            </Button>
            <ModalContent size="md">
              <ModalHeader>
                <ModalTitle>Create API Token</ModalTitle>
                <ModalDescription>
                  Token secret is shown once after creation — save it immediately.
                </ModalDescription>
              </ModalHeader>
              <Form validationErrors={errors} onSubmit={submit}>
                <ModalBody className="space-y-5">
                  <TextField value={data.name} onChange={(v) => setData("name", v)} autoFocus>
                    <Label>Token name</Label>
                    <Input placeholder="e.g. CI Deploy" />
                    <FieldError>{errors.name}</FieldError>
                  </TextField>

                  <div className="space-y-1.5">
                    <Label>Team</Label>
                    <Select
                      selectedKey={data.team_id}
                      onSelectionChange={(k) => setData("team_id", String(k))}
                    >
                      <SelectTrigger />
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem
                            key={String(team.id)}
                            id={String(team.id)}
                            textValue={team.name}
                          >
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.team_id && <p className="text-danger text-sm">{errors.team_id}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Expiration</Label>
                    <Select
                      selectedKey={data.expires_at}
                      onSelectionChange={(k) => setData("expires_at", k === null ? "" : String(k))}
                    >
                      <SelectTrigger />
                      <SelectContent>
                        {EXPIRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} id={opt.id} textValue={opt.label}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.expires_at && (
                      <p className="text-danger text-sm">{errors.expires_at}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Scopes</Label>
                    <CheckboxGroup value={data.scopes} onChange={(v) => setData("scopes", v)}>
                      {ALL_SCOPES.map((scope) => (
                        <Checkbox key={scope} value={scope}>
                          {SCOPE_LABELS[scope]}
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                    {(errors.scopes ?? errors["scopes.0"]) && (
                      <p className="text-danger text-sm">{errors.scopes ?? errors["scopes.0"]}</p>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <ModalClose>Cancel</ModalClose>
                  <Button type="submit" isDisabled={processing}>
                    {processing ? "Creating…" : "Create Token"}
                  </Button>
                </ModalFooter>
              </Form>
            </ModalContent>
          </Modal>
        </CardHeader>

        <CardContent className="p-0">
          {tokens.length === 0 ? (
            <p className="px-6 pb-6 text-center text-muted-fg text-sm">No tokens yet.</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {tokens.map((token) => (
                  <div key={token.id} className="flex items-start justify-between gap-4 px-6 py-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-sm">{token.name}</span>
                        {isExpired(token.expires_at) && (
                          <Badge intent="danger" isCircle={false}>
                            Expired
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {token.scopes.map((scope) => (
                          <Badge key={scope} intent="secondary" isCircle={false}>
                            {scope}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-muted-fg text-xs">
                        Created {formatDate(token.created_at)}
                        {token.expires_at && ` · Expires ${formatDate(token.expires_at)}`}
                        {token.last_used_at
                          ? ` · Last used ${formatDate(token.last_used_at)}`
                          : " · Never used"}
                      </p>
                    </div>
                    <Button intent="danger" size="sm" onPress={() => revokeToken(token.id)}>
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />
              <div className="flex justify-end px-6 py-4">
                <Modal isOpen={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
                  <Button intent="danger" size="sm" onPress={() => setRevokeAllOpen(true)}>
                    Revoke All Tokens
                  </Button>
                  <ModalContent role="alertdialog" size="sm">
                    <ModalHeader>
                      <ModalTitle>Revoke All Tokens</ModalTitle>
                      <ModalDescription>
                        All API tokens will be immediately invalidated. This cannot be undone.
                      </ModalDescription>
                    </ModalHeader>
                    <ModalFooter>
                      <ModalClose>Cancel</ModalClose>
                      <Button intent="danger" onPress={revokeAll}>
                        Revoke All
                      </Button>
                    </ModalFooter>
                  </ModalContent>
                </Modal>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}

ApiTokensPage.layout = (page: React.ReactNode) => (
  <AppLayout>
    <SettingsLayout>{page}</SettingsLayout>
  </AppLayout>
)
