import { router, usePage } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { useCallback, useEffect, useState } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"
import type { SharedData, SidebarMonitor } from "@/types/shared"
import { Link } from "@/components/ui/link"
import { MonitorCommandPalette } from "@/components/monitor-command-palette"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "@/components/ui/sidebar"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSection,
  MenuSeparator,
  MenuHeader,
} from "@/components/ui/menu"
import { Button } from "@/components/ui/button"
import {
  ArrowRightEndOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  BellAlertIcon,
  ChartBarIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  UserPlusIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline"

const statusDot: Record<string, string> = {
  up: "bg-success",
  down: "bg-danger",
  pending: "bg-warning",
  paused: "bg-muted-fg",
}

const secondaryNav = [
  { name: "Dashboard", href: "/dashboard", icon: ChartBarIcon },
  { name: "Status Pages", href: "/status-pages", icon: GlobeAltIcon },
  { name: "Maintenance", href: "/maintenance-windows", icon: WrenchScrewdriverIcon },
  { name: "Notifications", href: "/notification-channels", icon: BellAlertIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
]

interface HeartbeatPayload {
  monitorId: number
  monitorStatus: string
}

interface StatusChangedPayload {
  monitorId: number
  newStatus: string
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const page = usePage()
  const { auth, currentTeam, teams, sidebarMonitors: initialMonitors } = usePage<SharedData>().props

  const [monitors, setMonitors] = useState<SidebarMonitor[]>(initialMonitors ?? [])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const handleHeartbeat = useCallback((payload: HeartbeatPayload) => {
    setMonitors((prev) =>
      prev.map((m) =>
        m.id === payload.monitorId
          ? { ...m, status: payload.monitorStatus as SidebarMonitor["status"] }
          : m,
      ),
    )
  }, [])

  const handleStatusChanged = useCallback((payload: StatusChangedPayload) => {
    setMonitors((prev) =>
      prev.map((m) =>
        m.id === payload.monitorId
          ? { ...m, status: payload.newStatus as SidebarMonitor["status"] }
          : m,
      ),
    )
  }, [])

  useEcho(`monitors.${auth.user?.id}`, ".HeartbeatRecorded", handleHeartbeat)
  useEcho(`monitors.${auth.user?.id}`, ".MonitorStatusChanged", handleStatusChanged)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Goto homepage" className="flex items-center gap-2">
            <Logo />
            <SidebarLabel className="font-semibold">Beacon</SidebarLabel>
          </Link>
        </div>

        {/* Search */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded border border-border bg-transparent px-3 py-2 text-xs text-muted-fg transition-colors hover:border-primary/40 hover:text-fg"
        >
          <span className="text-sm leading-none">⌕</span>
          <span className="flex-1 text-left">Search monitors…</span>
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-fg">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent className="flex flex-col overflow-hidden">
        {/* Monitor list */}
        <div className="flex shrink-0 items-center justify-between px-4 pb-1.5 pt-0.5">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-fg">
            Monitors · {monitors.length}
          </span>
          <Link
            href="/monitors/create"
            className="text-[11px] font-medium text-primary transition-colors hover:text-primary/70"
          >
            + new
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {monitors.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-fg">No monitors yet.</p>
          )}
          {monitors.map((monitor) => {
            const isActive =
              page.url === `/monitors/${monitor.id}` ||
              page.url.startsWith(`/monitors/${monitor.id}?`)
            const dot = statusDot[monitor.status] ?? "bg-muted-fg"
            const subtitle = monitor.url
              ? monitor.url.replace(/^https?:\/\//, "")
              : monitor.host
                ? `${monitor.host}${monitor.port ? `:${monitor.port}` : ""}`
                : monitor.type

            return (
              <Link
                key={monitor.id}
                href={`/monitors/${monitor.id}`}
                className={[
                  "mb-0.5 flex items-center gap-2.5 rounded px-3 py-2.5 transition-colors",
                  "border-l-2",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-primary/5",
                ].join(" ")}
              >
                <span className={`size-2 shrink-0 rounded-full ${dot}`} />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[13px] leading-tight ${
                      isActive ? "font-medium text-primary" : "text-fg"
                    }`}
                  >
                    {monitor.name}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-muted-fg">
                    {monitor.type} · {subtitle}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Secondary nav */}
        <SidebarSection className="shrink-0 border-t border-border px-2 pb-1 pt-2">
          {secondaryNav.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              isCurrent={page.url.startsWith(item.href)}
              tooltip={item.name}
            >
              <item.icon data-slot="icon" />
              <SidebarLabel>{item.name}</SidebarLabel>
            </SidebarItem>
          ))}
        </SidebarSection>

        {/* Team switcher */}
        {auth.user && currentTeam && teams.length > 1 && (
          <div className="shrink-0 border-t border-border px-3 py-2">
            <Menu>
              <Button intent="plain" className="w-full justify-start gap-2 text-xs text-muted-fg">
                <span className="truncate">{currentTeam.name}</span>
                <span className="ml-auto text-[10px] text-muted-fg/60">switch</span>
              </Button>
              <MenuContent placement="top start" className="sm:min-w-48">
                <MenuHeader separator>Switch Team</MenuHeader>
                {teams.map((team) => (
                  <MenuItem
                    key={team.id}
                    onAction={() => router.post(`/switch-team/${team.id}`)}
                  >
                    <MenuLabel>{team.name}</MenuLabel>
                    {team.id === currentTeam.id && <CheckCircleIcon className="size-4" />}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        {auth.user ? (
          <UserMenu />
        ) : (
          <div className="flex w-full gap-2">
            <SidebarItem href="/login" tooltip="Login">
              <ArrowRightStartOnRectangleIcon data-slot="icon" />
              <SidebarLabel>Login</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/register" tooltip="Register">
              <UserPlusIcon data-slot="icon" />
              <SidebarLabel>Register</SidebarLabel>
            </SidebarItem>
          </div>
        )}
      </SidebarFooter>

      <MonitorCommandPalette
        isOpen={paletteOpen}
        onOpenChange={setPaletteOpen}
        monitors={monitors}
      />
    </Sidebar>
  )
}

function UserMenu() {
  const { auth } = usePage<SharedData>().props
  return (
    <Menu>
      <Button intent="plain" className="w-full justify-start gap-2">
        <Avatar src={auth.user.gravatar} size="sm" />
        <span className="flex min-w-0 flex-col text-start">
          <span className="truncate text-sm font-medium">{auth.user.name}</span>
          <span className="truncate text-xs text-muted-fg">{auth.user.email}</span>
        </span>
      </Button>
      <MenuContent placement="top start" className="sm:min-w-56">
        <MenuSection>
          <MenuHeader separator className="relative">
            <div>{auth.user.name}</div>
            <div className="truncate whitespace-nowrap pr-6 text-sm font-normal text-muted-fg">
              {auth.user.email}
            </div>
          </MenuHeader>
        </MenuSection>
        <MenuItem href="/settings">
          <MenuLabel>Settings</MenuLabel>
        </MenuItem>
        <MenuSeparator />
        <MenuItem routerOptions={{ method: "post" }} href="/logout">
          <MenuLabel>Logout</MenuLabel>
          <ArrowRightEndOnRectangleIcon />
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
