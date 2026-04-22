import "../css/app.css"
import { Providers } from "@/components/providers"
import { createInertiaApp } from "@inertiajs/react"
import { configureEcho } from "@laravel/echo-react"
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers"
import { createRoot, hydrateRoot } from "react-dom/client"

const reverb = (window as Window & { __reverb__?: { key: string; host: string; port: number; scheme: string } }).__reverb__ ?? {}

configureEcho({
  broadcaster: "reverb",
  key: reverb.key ?? import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: reverb.host ?? import.meta.env.VITE_REVERB_HOST,
  wsPort: Number(reverb.port ?? import.meta.env.VITE_REVERB_PORT ?? 80),
  wssPort: Number(reverb.port ?? import.meta.env.VITE_REVERB_PORT ?? 443),
  forceTLS: (reverb.scheme ?? import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
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
