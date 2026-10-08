import "server-only"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"
import { getSupabaseEnv } from "./env"

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
export async function createClient() {
  // cookies() primero: marca el render como dinámico antes de validar el entorno.
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Llamado desde un Server Component: las cookies las refresca proxy.ts.
        }
      },
    },
  })
}
