import { TextArea, type TextAreaProps } from "react-aria-components"
import { twJoin } from "tailwind-merge"
import { cx } from "@/lib/primitive"

export function Textarea({ className, ...props }: TextAreaProps) {
  return (
    <span data-slot="control" className="relative block w-full">
      <TextArea
        {...props}
        className={cx(
          twJoin([
            "field-sizing-content relative block min-h-16 w-full appearance-none rounded-lg bg-(--control-bg,transparent) px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]",
            "text-base/6 text-foreground placeholder:text-muted-foreground sm:text-sm/6",
            "border border-input enabled:hover:border-muted-foreground/30",
            "outline-hidden focus:border-ring/70 focus:ring-3 focus:ring-ring/20 focus:enabled:hover:border-ring/80",
            "invalid:border-destructive/70 focus:invalid:border-destructive/70 focus:invalid:ring-destructive/20 invalid:enabled:hover:border-destructive/80 invalid:focus:enabled:hover:border-destructive/80",
            "disabled:bg-muted forced-colors:in-disabled:text-[GrayText]",
            "in-disabled:bg-muted forced-colors:in-disabled:text-[GrayText]",
            "dark:scheme-dark",
          ]),
          className,
        )}
      />
    </span>
  )
}
