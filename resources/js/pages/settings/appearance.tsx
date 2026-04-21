import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import AppLayout from "@/layouts/app-layout"
import SettingsLayout from "@/layouts/settings-layout"
import { Head } from "@inertiajs/react"
import { ThemeSwitcher } from "@/components/theme-switcher"

const title = "Appearance"

export default function Appearance() {
  return (
    <>
      <Head title={title} />
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>

          <CardDescription className="max-w-lg">
            Choose the most comfortable theme to make your experience using this app more enjoyable.
          </CardDescription>
        </CardHeader>

        <CardContent className="max-w-lg">
          <ThemeSwitcher />
        </CardContent>
      </Card>
    </>
  )
}

Appearance.layout = (page: React.ReactNode) => (
  <AppLayout>
    <SettingsLayout>{page}</SettingsLayout>
  </AppLayout>
)
