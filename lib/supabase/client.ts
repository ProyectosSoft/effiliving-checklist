import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getSupabaseEnv } from "./env"

export type Supabase = SupabaseClient<Database>

let client: Supabase | null = null

// Cliente único de Supabase en el navegador. La sesión se guarda en localStorage;
// la autorización la aplica Row Level Security en la base de datos.
export function createClient(): Supabase {
  if (!client) {
    const { url, anonKey } = getSupabaseEnv()
    client = createSupabaseClient<Database>(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  }
  return client
}

// URL absoluta dentro de la app (respeta el basePath de GitHub Pages).
export function appUrl(path: string) {
  return `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`
}
