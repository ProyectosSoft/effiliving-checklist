"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { parsePermissions, type Permission, type PermissionSet } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/client"
import { hasSupabaseEnv } from "@/lib/supabase/env"

export type CurrentUser = {
  id: string
  email: string | null
  fullName: string
  active: boolean
  roleName: string | null
  permissions: PermissionSet
}

type AuthState = {
  user: CurrentUser | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function loadUser(): Promise<CurrentUser | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, active, role:roles(name, permissions)")
    .eq("id", session.user.id)
    .maybeSingle()

  const active = profile?.active ?? false
  return {
    id: session.user.id,
    email: profile?.email ?? session.user.email ?? null,
    fullName: profile?.full_name ?? session.user.email ?? "",
    active,
    roleName: profile?.role?.name ?? null,
    // Un usuario desactivado no conserva permisos (igual que has_permission() en la BD).
    permissions: parsePermissions(active ? profile?.role?.permissions : null),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSupabaseEnv()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(configured)

  const refresh = useCallback(async () => {
    setUser(await loadUser())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!configured) return
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Diferido: no llamar a Supabase dentro del callback (evita bloqueos del cliente).
      if (event !== "TOKEN_REFRESHED") setTimeout(() => void refresh(), 0)
    })
    return () => subscription.unsubscribe()
  }, [configured, refresh])

  const signOut = useCallback(async () => {
    await createClient().auth.signOut()
    setUser(null)
  }, [])

  if (!configured) return <NotConfigured />

  return <AuthContext.Provider value={{ user, loading, refresh, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>")
  return ctx
}

export function useCan(permission: Permission) {
  return useAuth().user?.permissions[permission] ?? false
}

function NotConfigured() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
          E
        </div>
        <h1 className="text-lg font-semibold">Effiliving Checklist</h1>
        <p className="mt-2 text-sm text-slate-600">
          La aplicación está publicada, pero aún no está conectada a Supabase. Configura{" "}
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> y vuelve a publicar.
        </p>
      </div>
    </main>
  )
}
