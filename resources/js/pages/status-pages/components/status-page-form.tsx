import { useForm } from "@inertiajs/react"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"
import { Form } from "react-aria-components"
import { TextField } from "@/components/ui/text-field"
import { Button } from "@/components/ui/button"
import { FieldError, Label } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { Monitor, StatusPage } from "@/types/monitor"

interface StatusPageFormProps {
  statusPage?: StatusPage
  monitors: Monitor[]
}

function getSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

export default function StatusPageForm({ statusPage, monitors }: StatusPageFormProps) {
  const isEditing = !!statusPage
  const params = !isEditing ? getSearchParams() : null

  const { data, setData, post, put, errors, processing } = useForm({
    title: statusPage?.title ?? params?.get("title") ?? "",
    slug: statusPage?.slug ?? params?.get("slug") ?? "",
    description: statusPage?.description ?? params?.get("description") ?? "",
    is_published: statusPage?.is_published ?? true,
    monitor_ids: statusPage?.monitors?.map((m) => m.id) ?? ([] as number[]),
    primary_color: statusPage?.primary_color ?? "#3b82f6",
    background_color: statusPage?.background_color ?? "",
    text_color: statusPage?.text_color ?? "",
    custom_css: statusPage?.custom_css ?? "",
    header_text: statusPage?.header_text ?? "",
    footer_text: statusPage?.footer_text ?? "",
    custom_domain: statusPage?.custom_domain ?? "",
    show_powered_by: statusPage?.show_powered_by ?? true,
    logo: null as File | null,
    favicon: null as File | null,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      post(`/status-pages/${statusPage.id}`, {
        preserveScroll: true,
        forceFormData: true,
        headers: { "X-HTTP-Method-Override": "PUT" },
      })
    } else {
      post("/status-pages", { forceFormData: true })
    }
  }

  const handleTitleChange = (value: string) => {
    setData("title", value)
    if (!isEditing) {
      setData(
        "slug",
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      )
    }
  }

  return (
    <Form validationErrors={errors} onSubmit={submit} className="max-w-2xl space-y-6">
      <TextField value={data.title} onChange={handleTitleChange} autoFocus>
        <Label>Title</Label>
        <Input placeholder="My Service Status" />
        <FieldError>{errors.title}</FieldError>
      </TextField>

      <TextField value={data.slug} onChange={(v) => setData("slug", v)}>
        <Label>Slug</Label>
        <Input placeholder="my-service-status" />
        <FieldError>{errors.slug}</FieldError>
      </TextField>

      <TextField value={data.description ?? ""} onChange={(v) => setData("description", v)}>
        <Label>Description</Label>
        <Textarea placeholder="Current status of our services..." />
        <FieldError>{errors.description}</FieldError>
      </TextField>

      <Checkbox
        isSelected={data.is_published}
        onChange={(checked) => setData("is_published", checked)}
      >
        Published (publicly visible)
      </Checkbox>

      {monitors.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-medium text-sm">Monitors</legend>
          <p className="mb-3 text-muted-foreground text-xs">
            Select which monitors to display on this status page.
          </p>
          <div className="space-y-2">
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
                <span className="font-medium">{monitor.name}</span>
                <span className="ml-1 text-muted-foreground text-xs">({monitor.type.toUpperCase()})</span>
              </Checkbox>
            ))}
          </div>
          {errors.monitor_ids && <FieldError>{errors.monitor_ids}</FieldError>}
        </fieldset>
      )}

      {/* Branding Section */}
      <fieldset className="space-y-4 rounded-lg border p-4">
        <legend className="px-2 font-medium text-sm">Branding</legend>

        <div>
          <label className="mb-1 block font-medium text-sm">Logo</label>
          {statusPage?.logo_path && (
            <p className="mb-1 text-muted-foreground text-xs">Current: {statusPage.logo_path}</p>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setData("logo", e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {errors.logo && <p className="mt-1 text-destructive text-sm">{errors.logo}</p>}
        </div>

        <div>
          <label className="mb-1 block font-medium text-sm">Favicon</label>
          {statusPage?.favicon_path && (
            <p className="mb-1 text-muted-foreground text-xs">Current: {statusPage.favicon_path}</p>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setData("favicon", e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {errors.favicon && <p className="mt-1 text-destructive text-sm">{errors.favicon}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <TextField value={data.primary_color} onChange={(v) => setData("primary_color", v)}>
            <Label>Primary Color</Label>
            <Input type="color" />
            <FieldError>{errors.primary_color}</FieldError>
          </TextField>
          <TextField value={data.background_color} onChange={(v) => setData("background_color", v)}>
            <Label>Background</Label>
            <Input type="color" />
            <FieldError>{errors.background_color}</FieldError>
          </TextField>
          <TextField value={data.text_color} onChange={(v) => setData("text_color", v)}>
            <Label>Text Color</Label>
            <Input type="color" />
            <FieldError>{errors.text_color}</FieldError>
          </TextField>
        </div>

        <TextField value={data.header_text ?? ""} onChange={(v) => setData("header_text", v)}>
          <Label>Header Text</Label>
          <Textarea placeholder="Optional header announcement..." />
          <FieldError>{errors.header_text}</FieldError>
        </TextField>

        <TextField value={data.footer_text ?? ""} onChange={(v) => setData("footer_text", v)}>
          <Label>Footer Text</Label>
          <Textarea placeholder="Optional footer text..." />
          <FieldError>{errors.footer_text}</FieldError>
        </TextField>

        <TextField value={data.custom_css ?? ""} onChange={(v) => setData("custom_css", v)}>
          <Label>Custom CSS</Label>
          <Textarea placeholder=".status-page { ... }" className="font-mono text-xs" />
          <FieldError>{errors.custom_css}</FieldError>
        </TextField>

        <TextField value={data.custom_domain ?? ""} onChange={(v) => setData("custom_domain", v)}>
          <Label>Custom Domain</Label>
          <Input placeholder="status.example.com" />
          <FieldError>{errors.custom_domain}</FieldError>
        </TextField>

        <Checkbox
          isSelected={data.show_powered_by}
          onChange={(checked) => setData("show_powered_by", checked)}
        >
          Show "Powered by UptimeRadar"
        </Checkbox>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" isDisabled={processing}>
          {isEditing ? "Update Status Page" : "Create Status Page"}
        </Button>
        {isEditing && statusPage && (
          <ConfirmDeleteModal
            title="Delete Status Page"
            description="Are you sure you want to delete this status page? This action cannot be undone."
            deleteUrl={`/status-pages/${statusPage.id}`}
          >
            <Button intent="danger">Delete</Button>
          </ConfirmDeleteModal>
        )}
      </div>
    </Form>
  )
}
