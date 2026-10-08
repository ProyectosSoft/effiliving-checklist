import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"
import { parsePermissions, ROUTE_PERMISSIONS } from "@/lib/permissions"
import { getSupabaseEnv, hasSupabaseEnv } from "./env"

const PUBLIC_PATHS = ["/login", "/auth"]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return new NextResponse(
      "Effiliving Checklist: falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    )
  }

  const { url, anonKey } = getSupabaseEnv()
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // No poner código entre createServerClient y getUser(): getUser refresca el token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirección que conserva las cookies de sesión refrescadas.
  const redirectTo = (path: string, params?: Record<string, string>) => {
    const target = request.nextUrl.clone()
    target.pathname = path
    target.search = ""
    Object.entries(params ?? {}).forEach(([k, v]) => target.searchParams.set(k, v))
    const redirect = NextResponse.redirect(target)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (!user) {
    if (isPublic(pathname)) return response
    return redirectTo("/login", pathname !== "/" ? { next: pathname } : undefined)
  }

  if (pathname === "/login") return redirectTo("/dashboard")

  const rule = ROUTE_PERMISSIONS.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
  if (rule) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active, role:roles(permissions)")
      .eq("id", user.id)
      .maybeSingle()
    const perms = parsePermissions(profile?.active ? profile.role?.permissions : null)
    if (!perms[rule.permission]) return redirectTo("/dashboard", { error: "sin-permiso" })
  }

  return response
}
