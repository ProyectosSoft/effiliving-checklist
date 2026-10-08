import { z } from "zod"
import { check, requireRows, run } from "@/lib/actions"
import { PERMISSION_KEYS, parsePermissions, type PermissionSet } from "@/lib/permissions"
import { appUrl, createClient } from "@/lib/supabase/client"
import { sessionUserId } from "./session"

// Permiso requerido (RLS / Edge Function): users_manage.

// El trigger handle_new_user asigna este rol por nombre a los usuarios nuevos.
const DEFAULT_ROLE = "inspector"

const inviteSchema = z.object({
  email: z.email("Correo no válido"),
  fullName: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  roleId: z.uuid("Selecciona un rol"),
})

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  roleId: z.uuid("Selecciona un rol"),
  active: z.boolean(),
})

const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El nombre es obligatorio")
    .max(50)
    .regex(/^[a-z0-9_áéíóúñ ]+$/, "Usa solo letras, números, espacios o guion bajo"),
  description: z.string().trim().max(300),
  permissions: z.record(z.string(), z.boolean()),
})

export async function loadUsersAndRoles() {
  const supabase = createClient()
  const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role_id, active, created_at").order("full_name"),
    supabase.from("roles").select("id, name, description, permissions").order("name"),
  ])
  if (e1 || e2) throw e1 ?? e2
  const usage = new Map<string, number>()
  for (const p of profiles ?? []) if (p.role_id) usage.set(p.role_id, (usage.get(p.role_id) ?? 0) + 1)
  return {
    profiles: profiles ?? [],
    roles: (roles ?? []).map((r) => ({
      ...r,
      permissions: parsePermissions(r.permissions),
      users: usage.get(r.id) ?? 0,
    })),
  }
}

// ---- Usuarios -------------------------------------------------------------

// La invitación necesita la service role key: la hace la Edge Function "invite-user"
// (supabase/functions/invite-user), que verifica users_manage del usuario que llama.
export async function inviteUser(input: z.input<typeof inviteSchema>) {
  return run(async () => {
    const v = inviteSchema.parse(input)
    const { data, error } = await createClient().functions.invoke<{ error?: string }>("invite-user", {
      body: { ...v, redirectTo: appUrl("/auth/confirm/?next=/account/password/") },
    })
    if (error) {
      let message = error.message
      try {
        const body = await (error as { context?: Response }).context?.json()
        if (body?.error) message = body.error
      } catch {}
      throw new Error(
        /Failed to send a request|not found/i.test(message)
          ? "La función de invitaciones no está desplegada en Supabase (supabase/functions/invite-user)."
          : message,
      )
    }
    if (data?.error) throw new Error(data.error)
  })
}

export async function updateProfile(id: string, input: z.input<typeof profileSchema>) {
  return run(async () => {
    const meId = await sessionUserId()
    const v = profileSchema.parse(input)
    const supabase = createClient()

    if (id === meId) {
      const { data: current } = check(await supabase.from("profiles").select("role_id").eq("id", id).single())
      if (!v.active) throw new Error("No puedes desactivar tu propio usuario.")
      if (current?.role_id !== v.roleId) throw new Error("No puedes cambiar tu propio rol.")
    }

    requireRows(
      await supabase
        .from("profiles")
        .update({ full_name: v.fullName, role_id: v.roleId, active: v.active })
        .eq("id", id)
        .select("id"),
    )
  })
}

// ---- Roles ----------------------------------------------------------------

function normalizePermissions(input: Record<string, boolean>): PermissionSet {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, input[k] === true])) as PermissionSet
}

export async function createRole(input: z.input<typeof roleSchema>) {
  return run(async () => {
    const v = roleSchema.parse(input)
    check(
      await createClient()
        .from("roles")
        .insert({ name: v.name, description: v.description || null, permissions: normalizePermissions(v.permissions) }),
    )
  })
}

export async function updateRole(id: string, input: z.input<typeof roleSchema>) {
  return run(async () => {
    const meId = await sessionUserId()
    const v = roleSchema.parse(input)
    const supabase = createClient()
    const { data: role } = check(await supabase.from("roles").select("name").eq("id", id).single())
    const { data: myProfile } = check(await supabase.from("profiles").select("role_id").eq("id", meId).single())

    if (role?.name === DEFAULT_ROLE && v.name !== DEFAULT_ROLE) {
      throw new Error(`El rol "${DEFAULT_ROLE}" no se puede renombrar: se asigna a los usuarios nuevos.`)
    }
    const permissions = normalizePermissions(v.permissions)
    if (myProfile?.role_id === id && !permissions.users_manage) {
      throw new Error("No puedes quitar 'Gestionar usuarios y roles' a tu propio rol.")
    }

    requireRows(
      await supabase
        .from("roles")
        .update({ name: v.name, description: v.description || null, permissions })
        .eq("id", id)
        .select("id"),
    )
  })
}

export async function deleteRole(id: string) {
  return run(async () => {
    const supabase = createClient()
    const { data: role } = check(await supabase.from("roles").select("name").eq("id", id).single())
    if (role?.name === DEFAULT_ROLE) throw new Error(`El rol "${DEFAULT_ROLE}" no se puede eliminar.`)
    const { count } = check(
      await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role_id", id),
    )
    if (count) throw new Error(`No se puede eliminar: ${count} usuario(s) tienen este rol.`)
    requireRows(await supabase.from("roles").delete().eq("id", id).select("id"))
  })
}
