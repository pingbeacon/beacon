import { Flash } from "@/components/flash"
import { Logo } from "@/components/logo"
import { Link } from "@/components/ui/link"
import { CheckCircleIcon } from "@heroicons/react/24/solid"
import type { PropsWithChildren, ReactNode } from "react"

const features = [
  "Monitor uptime across HTTP, TCP, and heartbeats",
  "Instant alerts via email, Slack, and more",
  "Public status pages your users can trust",
]

interface GuestLayoutProps {
  header?: string | null
  description?: string | ReactNode | null
}

export default function GuestLayout({
  description = null,
  header = null,
  children,
}: PropsWithChildren<GuestLayoutProps>) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between border-r border-border bg-sidebar px-12 py-10 sticky top-0 h-screen">
        <Link href="/" aria-label="Go to homepage" className="flex w-fit items-center gap-2.5">
          <Logo />
          <span className="font-semibold text-fg">Beacon</span>
        </Link>

        <div className="space-y-8">
          <h1 className="text-3xl font-bold leading-snug text-fg">
            Know the moment
            <br />
            something breaks.
          </h1>
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-sm text-muted-fg">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-fg">© {new Date().getFullYear()} Beacon</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 lg:hidden">
          <Link href="/" aria-label="Go to homepage">
            <Logo />
          </Link>
        </div>

        <div className="w-full max-w-md space-y-6">
          {(header || description) && (
            <div>
              {header && <h2 className="text-xl font-semibold text-fg">{header}</h2>}
              {description && <p className="mt-1 text-sm text-muted-fg">{description}</p>}
            </div>
          )}
          <Flash />
          {children}
        </div>
      </div>
    </div>
  )
}
