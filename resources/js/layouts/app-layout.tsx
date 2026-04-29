import type { PropsWithChildren } from "react"
import { Flash } from "@/components/flash"
import { MonitorRealtimeProvider } from "@/components/monitor-realtime-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/layouts/app-sidebar"

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <MonitorRealtimeProvider />
      <AppSidebar intent="float" collapsible="dock" />
      <SidebarInset>
        <Flash />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
