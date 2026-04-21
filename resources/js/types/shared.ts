import type { Auth } from "./auth"
import type { Team, TeamRole } from "./monitor"

export type FlashProps = {
  type: string
  message: string
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

  [key: string]: unknown
}
