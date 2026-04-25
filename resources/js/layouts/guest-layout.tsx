import { CheckCircleIcon } from "@heroicons/react/24/solid"
import type { PropsWithChildren, ReactNode } from "react"
import { Flash } from "@/components/flash"
import { Logo } from "@/components/logo"
import { Link } from "@/components/ui/link"

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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="sticky top-0 hidden h-screen w-[420px] shrink-0 flex-col justify-between border-border border-r bg-sidebar px-12 py-10 lg:flex">
        <Link href="/" aria-label="Go to homepage" className="flex w-fit items-center gap-2.5">
          <Logo />
          <span className="font-semibold text-fg">Beacon</span>
        </Link>

        <div className="space-y-8">
          <h1 className="font-bold text-3xl text-fg leading-snug">
            Know the moment
            <br />
            something breaks.
          </h1>
          <ul className="flex flex-col gap-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <CheckCircleIcon
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="text-muted-fg text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-fg text-xs">© {new Date().getFullYear()} Beacon</p>
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
              {header && <h2 className="font-semibold text-fg text-xl">{header}</h2>}
              {description && <p className="mt-1 text-muted-fg text-sm">{description}</p>}
            </div>
          )}
          <Flash />
          {children}
        </div>
      </div>
    </div>
  )
}
