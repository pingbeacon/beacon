import "../css/app.css"
import { Providers } from "@/components/providers"
import { createInertiaApp } from "@inertiajs/react"
import { configureEcho } from "@laravel/echo-react"
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers"
import { createRoot, hydrateRoot } from "react-dom/client"
import { initializeTheme } from "./hooks/use-theme"

configureEcho({
  broadcaster: "reverb",
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
  wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
  enabledTransports: ["ws", "wss"],
})

const appName = import.meta.env.VITE_APP_NAME || "Laravel"

createInertiaApp({
  title: (title) => (title ? `${title} / ${appName}` : appName),
  resolve: (name) =>
    resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob("./pages/**/*.tsx")),
  setup({ el, App, props }) {
    const root = createRoot(el)

    const appElement = (
      <Providers>
        <App {...props} />
      </Providers>
    )
    if (import.meta.env.SSR) {
      hydrateRoot(el, appElement)
      return
    }

    root.render(appElement)
  },
  progress: false,
})

initializeTheme()
