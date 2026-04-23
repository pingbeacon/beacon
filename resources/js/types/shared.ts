import type { Auth } from "./auth"
import type { MonitorStatus, MonitorType, Team, TeamRole } from "./monitor"

export type FlashProps = {
  type: string
  message: string
}

export interface SidebarMonitor {
  id: number
  name: string
  status: MonitorStatus
  type: MonitorType
  url: string | null
  host: string | null
  port: number | null
}

export interface SharedData {
  name: string
  quote: { message: string; author: string }
  auth: Auth
  currentTeam: Team | null
  teams: Team[]
  teamRole: TeamRole | null
  sidebarOpen: boolean
  flash: FlashProps
  sidebarMonitors: SidebarMonitor[]

  [key: string]: unknown
}
