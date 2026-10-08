// Edge Function de Supabase: invita un usuario por correo y le asigna un rol.
// Usa la service role key (disponible solo aquí, nunca en el navegador) después de
// verificar que quien llama tiene el permiso users_manage.
//
// Desplegar:  npx supabase functions deploy invite-user --project-ref <ref>
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405)

  const url = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const authorization = req.headers.get("Authorization") ?? ""

  // 1. Verificar el permiso del usuario que llama (con su propio token).
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: allowed, error: permError } = await caller.rpc("has_permission", { perm: "users_manage" })
  if (permError || allowed !== true) return json({ error: "No tienes permiso para invitar usuarios." }, 403)

  // 2. Validar entrada.
  const { email, fullName, roleId, redirectTo } = await req.json().catch(() => ({}))
  if (typeof email !== "string" || !email.includes("@")) return json({ error: "Correo no válido." }, 400)
  if (typeof fullName !== "string" || !fullName.trim()) return json({ error: "El nombre es obligatorio." }, 400)
  if (typeof roleId !== "string") return json({ error: "Selecciona un rol." }, 400)

  // 3. Invitar y asignar rol (el trigger handle_new_user ya creó el perfil como inspector).
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName.trim() },
    redirectTo: typeof redirectTo === "string" ? redirectTo : undefined,
  })
  if (error) {
    const exists = /already been registered|already exists/i.test(error.message)
    return json({ error: exists ? "Ya existe un usuario con ese correo." : `No se pudo invitar: ${error.message}` }, 400)
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ full_name: fullName.trim(), role_id: roleId })
    .eq("id", data.user.id)
  if (updateError) return json({ error: `Usuario invitado, pero no se pudo asignar el rol: ${updateError.message}` }, 500)

  return json({ ok: true })
})
