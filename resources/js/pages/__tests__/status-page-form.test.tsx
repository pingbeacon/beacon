import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@inertiajs/react", () => ({
  useForm: () => ({
    data: {
      title: "",
      slug: "",
      description: "",
      is_published: true,
      monitor_ids: [] as number[],
      primary_color: "#3b82f6",
      background_color: "",
      text_color: "",
      custom_css: "",
      header_text: "",
      footer_text: "",
      custom_domain: "",
      show_powered_by: true,
      logo: null,
      favicon: null,
    },
    setData: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    errors: {},
    processing: false,
  }),
  router: { delete: vi.fn(), visit: vi.fn() },
}))

import StatusPageForm from "@/pages/status-pages/components/status-page-form"

describe("StatusPageForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("labels the powered-by checkbox with the Beacon brand, not UptimeRadar", () => {
    render(<StatusPageForm monitors={[]} />)
    expect(screen.getByText(/Powered by Beacon/)).toBeInTheDocument()
    expect(screen.queryByText(/UptimeRadar/)).toBeNull()
  })
})
