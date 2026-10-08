import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function signOut(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const reason = request.nextUrl.searchParams.get("reason")
  const target = new URL("/login", request.url)
  if (reason) target.searchParams.set("error", reason)
  return NextResponse.redirect(target, { status: 303 })
}

// POST desde el botón "Cerrar sesión"; GET para redirecciones del servidor (usuario inactivo).
export const POST = signOut
export const GET = signOut
