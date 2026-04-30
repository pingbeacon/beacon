import {
  BellAlertIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  PlusCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline"
import { router } from "@inertiajs/react"
import {
  CommandMenu,
  CommandMenuItem,
  CommandMenuLabel,
  CommandMenuList,
  CommandMenuSearch,
  CommandMenuSection,
} from "@/components/ui/command-menu"
import type { SidebarMonitor } from "@/types/shared"

const statusDot: Record<string, string> = {
  up: "bg-success",
  down: "bg-destructive",
  pending: "bg-warning",
  paused: "bg-muted-foreground",
}

const pages = [
  { name: "Dashboard", href: "/dashboard", icon: ChartBarIcon },
  { name: "Monitors", href: "/monitors", icon: ComputerDesktopIcon },
  { name: "Status Pages", href: "/status-pages", icon: GlobeAltIcon },
  { name: "Maintenance Windows", href: "/maintenance-windows", icon: WrenchScrewdriverIcon },
  { name: "Notification Channels", href: "/notification-channels", icon: BellAlertIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
]

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  monitors: SidebarMonitor[]
}

export function MonitorCommandPalette({ isOpen, onOpenChange, monitors }: Props) {
  const navigate = (href: string) => {
    onOpenChange(false)
    router.visit(href)
  }

  return (
    <CommandMenu isOpen={isOpen} onOpenChange={onOpenChange}>
      <CommandMenuSearch placeholder="Search monitors, pages…" autoFocus />
      <CommandMenuList>
        {monitors.length > 0 && (
          <CommandMenuSection label="Monitors">
            {monitors.map((monitor) => (
              <CommandMenuItem
                key={monitor.id}
                textValue={monitor.name}
                onAction={() => navigate(`/monitors/${monitor.id}`)}
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${statusDot[monitor.status] ?? "bg-muted-foreground"}`}
                />
                <CommandMenuLabel>{monitor.name}</CommandMenuLabel>
                <span className="ml-auto text-[10px] text-muted-foreground">{monitor.type}</span>
              </CommandMenuItem>
            ))}
          </CommandMenuSection>
        )}

        <CommandMenuSection label="Pages">
          {pages.map((page) => (
            <CommandMenuItem
              key={page.href}
              textValue={page.name}
              onAction={() => navigate(page.href)}
            >
              <page.icon className="size-4 shrink-0 text-muted-foreground" />
              <CommandMenuLabel>{page.name}</CommandMenuLabel>
            </CommandMenuItem>
          ))}
        </CommandMenuSection>

        <CommandMenuSection label="Actions">
          <CommandMenuItem textValue="New monitor" onAction={() => navigate("/monitors/create")}>
            <PlusCircleIcon className="size-4 shrink-0 text-muted-foreground" />
            <CommandMenuLabel>New monitor</CommandMenuLabel>
          </CommandMenuItem>
        </CommandMenuSection>
      </CommandMenuList>
    </CommandMenu>
  )
}
