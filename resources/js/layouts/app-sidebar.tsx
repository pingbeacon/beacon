import { router, usePage } from "@inertiajs/react"
import { Avatar } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"
import type { SharedData } from "@/types/shared"
import { Link } from "@/components/ui/link"
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
  ComputerDesktopIcon,
  GlobeAltIcon,
  UserPlusIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline"

const navigations = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: ChartBarIcon,
  },
  {
    name: "Monitors",
    href: "/monitors",
    icon: ComputerDesktopIcon,
  },
  {
    name: "Status Pages",
    href: "/status-pages",
    icon: GlobeAltIcon,
  },
  {
    name: "Maintenance",
    href: "/maintenance-windows",
    icon: WrenchScrewdriverIcon,
  },
  {
    name: "Notifications",
    href: "/notification-channels",
    icon: BellAlertIcon,
  },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const page = usePage()
  const { auth, currentTeam, teams } = usePage<SharedData>().props

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link href="/" aria-label="Goto homepage" className="flex items-center gap-2">
          <Logo />
          <SidebarLabel className="font-semibold">Beacon</SidebarLabel>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {auth.user && currentTeam && teams.length > 0 && (
          <SidebarSection title="Team">
            <Menu>
              <Button intent="plain" className="w-full justify-start gap-2 text-sm">
                <span className="truncate font-medium">{currentTeam.name}</span>
              </Button>
              <MenuContent placement="bottom start" className="sm:min-w-48">
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
          </SidebarSection>
        )}
        <SidebarSection>
          {navigations.map((item) => (
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
            <div className="truncate whitespace-nowrap pr-6 font-normal text-muted-fg text-sm">
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
