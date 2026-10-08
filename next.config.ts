import type { NextConfig } from "next"

// Sitio estático para GitHub Pages. PAGES_BASE_PATH = "effiliving-checklist" al publicar
// (lo define `npm run deploy`); vacío en desarrollo local.
const rawBase = (process.env.PAGES_BASE_PATH ?? "").replace(/^\/+|\/+$/g, "")
const basePath = rawBase ? `/${rawBase}` : ""

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
