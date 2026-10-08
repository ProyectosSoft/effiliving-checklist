import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Generación de PDF/Excel en el servidor: se cargan desde node_modules sin empaquetar.
  serverExternalPackages: ["exceljs", "jspdf", "jspdf-autotable"],
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
