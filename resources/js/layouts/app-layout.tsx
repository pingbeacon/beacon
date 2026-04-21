import { Flash } from "@/components/flash"
import { AppSidebar } from "@/layouts/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { PropsWithChildren } from "react"

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <AppSidebar intent="float" collapsible="dock" />
      <SidebarInset>
        <Flash />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
