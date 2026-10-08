import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

// Next.js 16: "proxy" reemplaza a "middleware".
// Refresca la sesión de Supabase, exige login y bloquea rutas de administración por rol.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Todo excepto estáticos e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
