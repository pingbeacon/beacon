import type { PropsWithChildren } from "react"
import { Flash } from "@/components/flash"
import { MonitorRealtimeProvider } from "@/components/monitor-realtime-provider"
import { PageFooter } from "@/components/page-footer"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/layouts/app-sidebar"

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <MonitorRealtimeProvider />
      <AppSidebar intent="float" collapsible="dock" />
      <SidebarInset data-slot="app-shell">
        <Flash />
        <div className="flex min-h-svh flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <PageFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
