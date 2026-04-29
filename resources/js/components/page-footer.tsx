import { twMerge } from "tailwind-merge"

interface PageFooterProps extends React.ComponentProps<"footer"> {
  lastSync?: string | null
}

export function PageFooter({ lastSync, className, ...props }: PageFooterProps) {
  return (
    <footer
      data-slot="page-footer"
      className={twMerge(
        "mt-8 flex items-center justify-between border-border border-t px-8 py-6 text-[11px] text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span>beacon · self-hosted · MIT</span>
      {lastSync && <span>last sync · {lastSync}</span>}
    </footer>
  )
}
