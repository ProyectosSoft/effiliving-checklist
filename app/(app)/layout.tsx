"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppNav, type NavLink } from "@/components/app-nav"
import { useAuth } from "@/components/auth-provider"
import { ROUTE_PERMISSIONS } from "@/lib/permissions"

// Área autenticada: exige sesión y bloquea rutas de administración según el rol.
// (La seguridad real la aplica RLS en Supabase; esto solo guía la navegación.)
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const rule = ROUTE_PERMISSIONS.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
  const forbidden = Boolean(user && rule && !user.permissions[rule.permission])

  useEffect(() => {
    if (loading) return
    if (!user) router.replace(`/login/?next=${encodeURIComponent(pathname)}`)
    else if (!user.active) void signOut().then(() => router.replace("/login/?error=inactivo"))
    else if (forbidden) router.replace("/dashboard/?error=sin-permiso")
  }, [loading, user, forbidden, pathname, router, signOut])

  if (loading || !user || !user.active || forbidden) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Cargando…</div>
  }

  const p = user.permissions
  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/reviews", label: "Revisiones" },
    { href: "/reviews/new", label: "Nueva revisión" },
    ...(p.items_manage ? [{ href: "/items", label: "Ítems del checklist" }] : []),
    ...(p.properties_manage ? [{ href: "/properties", label: "Hoteles y habitaciones" }] : []),
    ...(p.users_manage ? [{ href: "/users", label: "Usuarios y roles" }] : []),
  ]

  const logout = () => void signOut().then(() => router.replace("/login/"))

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            E
          </div>
          <span className="font-semibold">Effiliving Checklist</span>
        </div>
        <div className="px-2 pb-2 md:flex-1">
          <AppNav links={links} />
        </div>
        <div className="hidden border-t border-slate-200 px-4 py-4 md:block">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="truncate text-xs text-slate-500 capitalize">{user.roleName ?? "sin rol"}</p>
          <button className="btn btn-sm mt-3 w-full" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          <span className="truncate text-sm">
            {user.fullName} · <span className="text-slate-500 capitalize">{user.roleName ?? "sin rol"}</span>
          </span>
          <button className="btn btn-sm" onClick={logout}>
            Salir
          </button>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
