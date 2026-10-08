import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getSupabaseEnv } from "./env"

// Cliente con service role: salta RLS. Úsalo solo en el servidor y después de
// verificar los permisos del usuario autenticado (p. ej. invitar usuarios).
export function createAdminClient() {
  const { url } = getSupabaseEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor.")
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
