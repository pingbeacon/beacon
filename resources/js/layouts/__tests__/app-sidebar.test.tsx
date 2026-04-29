import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  router: { post: vi.fn(), visit: vi.fn() },
  usePage: () => ({
    url: "/dashboard",
    props: {
      auth: {
        user: {
          id: 1,
          name: "John Doe",
          email: "john@acme.io",
          gravatar: "",
          email_verified_at: null,
        },
      },
      currentTeam: { id: 1, name: "Acme Team" },
      teams: [{ id: 1, name: "Acme Team" }],
      sidebarMonitors: [],
    },
  }),
}))

vi.mock("@/stores/monitor-realtime", () => ({
  useMonitors: () => [],
}))

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar, secondaryNav } from "@/layouts/app-sidebar"

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar collapsible="none" />
    </SidebarProvider>,
  )
}

describe("AppSidebar nav config", () => {
  it("ships exactly the five preserved nav items in order", () => {
    expect(secondaryNav.map((i) => i.name)).toEqual([
      "Dashboard",
      "Status Pages",
      "Maintenance",
      "Notifications",
      "Settings",
    ])
  })

  it("does not include global Incidents, Audit Log, or Team items", () => {
    const names = secondaryNav.map((i) => i.name)
    expect(names).not.toContain("Incidents")
    expect(names).not.toContain("Audit Log")
    expect(names).not.toContain("Team")
  })
})

describe("AppSidebar render", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders the brand mark", () => {
    renderSidebar()
    expect(screen.getAllByText(/beacon/i).length).toBeGreaterThan(0)
  })

  it("renders the search ⌘K trigger", () => {
    renderSidebar()
    expect(screen.getByText(/search/i)).toBeInTheDocument()
    expect(screen.getByText(/⌘K|Ctrl K/)).toBeInTheDocument()
  })

  it("renders all five preserved nav items", () => {
    renderSidebar()
    for (const item of secondaryNav) {
      expect(screen.getAllByText(item.name).length).toBeGreaterThan(0)
    }
  })

  it("renders the user footer with the authenticated user's name and email", () => {
    renderSidebar()
    expect(screen.getAllByText(/john doe/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/john@acme.io/i).length).toBeGreaterThan(0)
  })
})
