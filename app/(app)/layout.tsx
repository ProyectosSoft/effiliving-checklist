import { Suspense, type ReactNode } from "react"
import { AppNav, type NavLink } from "@/components/app-nav"
import { requireUser } from "@/lib/auth"

// Con cacheComponents, la lectura de la sesión (cookies) debe ocurrir dentro de <Suspense>.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  )
}

function ShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Cargando…</div>
  )
}

async function AppShell({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const p = user.permissions

  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/reviews", label: "Revisiones" },
    { href: "/reviews/new", label: "Nueva revisión" },
    ...(p.items_manage ? [{ href: "/items", label: "Ítems del checklist" }] : []),
    ...(p.properties_manage ? [{ href: "/properties", label: "Hoteles y habitaciones" }] : []),
    ...(p.users_manage ? [{ href: "/users", label: "Usuarios y roles" }] : []),
  ]

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
          <form action="/auth/signout" method="post" className="mt-3">
            <button className="btn btn-sm w-full">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          <span className="truncate text-sm">
            {user.fullName} · <span className="text-slate-500 capitalize">{user.roleName ?? "sin rol"}</span>
          </span>
          <form action="/auth/signout" method="post">
            <button className="btn btn-sm">Salir</button>
          </form>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
