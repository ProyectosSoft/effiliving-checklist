import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parsePermissions, type Permission, type PermissionSet } from "@/lib/permissions"

export type CurrentUser = {
  id: string
  email: string | null
  fullName: string
  active: boolean
  roleName: string | null
  permissions: PermissionSet
}

// Usuario autenticado + perfil + permisos del rol. Memoizado por request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, active, role:roles(name, permissions)")
    .eq("id", user.id)
    .maybeSingle()

  const active = profile?.active ?? false
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? user.email ?? "",
    active,
    roleName: profile?.role?.name ?? null,
    // Un usuario desactivado no conserva permisos (igual que en has_permission()).
    permissions: parsePermissions(active ? profile?.role?.permissions : null),
  }
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!user.active) redirect("/auth/signout?reason=inactivo")
  return user
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser()
  if (!user.permissions[permission]) redirect("/dashboard?error=sin-permiso")
  return user
}

// Para Server Actions: devuelve el usuario o lanza un error legible.
export async function assertPermission(permission?: Permission) {
  const user = await getCurrentUser()
  if (!user || !user.active) throw new Error("Sesión no válida. Vuelve a iniciar sesión.")
  if (permission && !user.permissions[permission]) {
    throw new Error("No tienes permiso para realizar esta acción.")
  }
  return user
}
