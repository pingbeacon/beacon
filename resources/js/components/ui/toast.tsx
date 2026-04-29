import { Toaster as ToasterPrimitive, type ToasterProps } from "sonner"
import { twJoin } from "tailwind-merge"

export function Toast(props: ToasterProps) {
  return (
    <ToasterPrimitive
      theme="dark"
      className="toaster group"
      richColors
      toastOptions={{
        className: twJoin(
          "not-has-data-[slot=note]:backdrop-blur-3xl will-change-transform *:data-[slot=note]:relative *:data-[slot=note]:z-50 *:data-icon:mt-0.5 *:data-icon:self-start has-data-description:*:data-icon:mt-1",
          "**:data-action:[--normal-bg:var(--color-primary-foreground)] **:data-action:[--normal-text:var(--color-primary)]",
        ),
      }}
      style={
        {
          "--normal-bg": "var(--color-popover)",
          "--normal-text": "var(--color-popover-foreground)",
          "--normal-border": "var(--color-border)",

          "--success-bg": "color-mix(in oklab, var(--success) 12%, transparent)",
          "--success-border": "color-mix(in oklab, var(--success) 20%, transparent)",
          "--success-text": "var(--color-success)",

          "--error-bg": "color-mix(in oklab, var(--destructive) 12%, transparent)",
          "--error-border": "color-mix(in oklab, var(--destructive) 20%, transparent)",
          "--error-text": "var(--color-destructive)",

          "--warning-bg": "color-mix(in oklab, var(--warning) 12%, transparent)",
          "--warning-border": "color-mix(in oklab, var(--warning) 20%, transparent)",
          "--warning-text": "var(--color-warning)",

          "--info-bg": "color-mix(in oklab, var(--primary) 10%, transparent)",
          "--info-border": "color-mix(in oklab, var(--primary) 20%, transparent)",
          "--info-text": "var(--color-primary)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
