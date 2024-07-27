import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { sentryVitePlugin } from "@sentry/vite-plugin"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

import { getGitHash } from "./scripts/lib"

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const __dirname = fileURLToPath(new URL(".", import.meta.url))
export default defineConfig({
  build: {
    outDir: resolve(__dirname, "out/web"),
    target: "ES2022",
    sourcemap: false,
  },
  root: "./src/renderer",
  envDir: resolve(__dirname, "."),
  resolve: {
    alias: {
      "@renderer": resolve("src/renderer/src"),
      "@shared": resolve("src/shared/src"),
      "@pkg": resolve("./package.json"),
      "@env": resolve("./src/env.ts"),
    },
  },
  base: "/",
  plugins: [
    react(),
    sentryVitePlugin({
      org: "follow-rg",
      project: "follow",
      disable: process.env.NODE_ENV === "development",
      moduleMetadata: {
        appVersion:
          process.env.NODE_ENV === "development" ? "dev" : pkg.version,
        electron: false,
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      filename: "sw.ts",
      manifest: {
        theme_color: "#ff5c00",
        name: "Follow",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
    APP_NAME: JSON.stringify(pkg.name),
    APP_DEV_CWD: JSON.stringify(process.cwd()),

    GIT_COMMIT_SHA: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA || getGitHash(),
    ),

    DEBUG: process.env.DEBUG === "true",
    ELECTRON: "false",
  },
})
