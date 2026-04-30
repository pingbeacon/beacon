import type { ComponentProps } from "react"
import { twMerge } from "tailwind-merge"

export interface TerminalProps extends ComponentProps<"pre"> {}

export function Terminal({ className, ...props }: TerminalProps) {
  return (
    <pre
      data-slot="terminal"
      className={twMerge("terminal whitespace-pre-wrap break-words", className)}
      {...props}
    />
  )
}
