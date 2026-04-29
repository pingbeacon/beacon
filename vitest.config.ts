import react from "@vitejs/plugin-react"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "resources/js"),
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["resources/js/test/setup.ts"],
        include: ["resources/js/**/*.{test,spec}.{ts,tsx}"],
    },
})
