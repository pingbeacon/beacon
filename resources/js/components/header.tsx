import type { ReactNode } from "react"
import { twMerge } from "tailwind-merge"

interface HeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title?: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  ref?: React.Ref<HTMLDivElement>
}

export function Header({
  title,
  eyebrow,
  description,
  actions,
  className,
  ref,
  ...props
}: HeaderProps) {
  return (
    <div
      ref={ref}
      data-slot="page-header"
      className={twMerge(
        "flex flex-wrap items-start justify-between gap-4 border-border border-b bg-background px-8 py-[22px]",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <span className="eyebrow block text-[11px] text-primary leading-none">{eyebrow}</span>
        ) : null}
        {title ? (
          <h1 className="font-medium text-[26px] text-foreground leading-tight tracking-[-0.02em]">
            {title}
          </h1>
        ) : null}
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 text-[13px]">{actions}</div>
      ) : null}
    </div>
  )
}
