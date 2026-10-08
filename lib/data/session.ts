import { createClient } from "@/lib/supabase/client"

// Id del usuario autenticado (o error si la sesión expiró).
export async function sessionUserId() {
  const {
    data: { session },
  } = await createClient().auth.getSession()
  if (!session) throw new Error("Sesión no válida. Vuelve a iniciar sesión.")
  return session.user.id
}
