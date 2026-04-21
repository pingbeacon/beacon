import type React from "react"
import { Avatar } from "@/components/ui/avatar"

export function Logo({ className, ...props }: React.ComponentProps<typeof Avatar>) {
  return (
    <Avatar
      size="sm"
      src="https://design.intentui.com/logo"
      className="outline-hidden"
      isSquare
      alt="Intent UI"
      {...props}
    />
  )
}
