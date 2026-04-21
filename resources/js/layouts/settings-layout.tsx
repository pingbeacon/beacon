import { Link, usePage } from "@inertiajs/react"
import { Container } from "@/components/ui/container"
import { Heading } from "@/components/ui/heading"
import { twMerge } from "tailwind-merge"

const navItems = [
  { name: "Profile", href: "/settings/profile" },
  { name: "Password", href: "/settings/password" },
  { name: "Appearance", href: "/settings/appearance" },
  { name: "Teams", href: "/settings/teams" },
  { name: "Audit Log", href: "/settings/audit-log" },
  { name: "Danger Zone", href: "/settings/delete-account" },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { url } = usePage()

  return (
    <Container className="py-6 sm:py-16">
      <Heading className="mb-6">Settings</Heading>
      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="shrink-0 lg:w-48">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => {
              const isActive = url.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={twMerge(
                      "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-secondary-fg"
                        : "text-muted-fg hover:bg-secondary/50 hover:text-fg",
                    )}
                  >
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Container>
  )
}
