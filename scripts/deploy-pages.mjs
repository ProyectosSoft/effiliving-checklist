// Publica la app en GitHub Pages: build estático con basePath y push a la rama gh-pages.
// Uso: npm run deploy   (lee NEXT_PUBLIC_SUPABASE_* de .env.local si existe)
import { execSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } })

run("npx next build", { PAGES_BASE_PATH: "effiliving-checklist" })
// Sin .nojekyll, GitHub Pages ignora la carpeta _next.
writeFileSync("out/.nojekyll", "")
run('npx gh-pages -d out -t -m "Publicar en GitHub Pages"')
