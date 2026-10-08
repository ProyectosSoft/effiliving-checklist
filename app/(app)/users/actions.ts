"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { assertPermission } from "@/lib/auth"
import { check, run } from "@/lib/actions"
import { PERMISSION_KEYS, type PermissionSet } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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

function done() {
  revalidatePath("/users")
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

// ---- Usuarios -------------------------------------------------------------

export async function inviteUser(input: z.input<typeof inviteSchema>) {
  return run(async () => {
    await assertPermission("users_manage")
    const v = inviteSchema.parse(input)
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.inviteUserByEmail(v.email, {
      data: { full_name: v.fullName },
      redirectTo: `${siteUrl()}/auth/confirm?next=/account/password`,
    })
    if (error) {
      throw new Error(
        /already been registered|already exists/i.test(error.message)
          ? "Ya existe un usuario con ese correo."
          : `No se pudo enviar la invitación: ${error.message}`,
      )
    }

    // El trigger ya creó el perfil con rol inspector: asignar el rol elegido.
    check(
      await admin
        .from("profiles")
        .update({ full_name: v.fullName, role_id: v.roleId })
        .eq("id", data.user.id),
    )
    done()
  })
}

export async function updateProfile(id: string, input: z.input<typeof profileSchema>) {
  return run(async () => {
    const me = await assertPermission("users_manage")
    const v = profileSchema.parse(input)
    const supabase = await createClient()

    if (id === me.id) {
      const { data: current } = check(await supabase.from("profiles").select("role_id").eq("id", id).single())
      if (!v.active) throw new Error("No puedes desactivar tu propio usuario.")
      if (current?.role_id !== v.roleId) throw new Error("No puedes cambiar tu propio rol.")
    }

    check(
      await supabase
        .from("profiles")
        .update({ full_name: v.fullName, role_id: v.roleId, active: v.active })
        .eq("id", id),
    )
    done()
  })
}

// ---- Roles ----------------------------------------------------------------

function normalizePermissions(input: Record<string, boolean>): PermissionSet {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, input[k] === true])) as PermissionSet
}

export async function createRole(input: z.input<typeof roleSchema>) {
  return run(async () => {
    await assertPermission("users_manage")
    const v = roleSchema.parse(input)
    const supabase = await createClient()
    check(
      await supabase.from("roles").insert({
        name: v.name,
        description: v.description || null,
        permissions: normalizePermissions(v.permissions),
      }),
    )
    done()
  })
}

export async function updateRole(id: string, input: z.input<typeof roleSchema>) {
  return run(async () => {
    const me = await assertPermission("users_manage")
    const v = roleSchema.parse(input)
    const supabase = await createClient()
    const { data: role } = check(await supabase.from("roles").select("name").eq("id", id).single())
    const { data: myProfile } = check(await supabase.from("profiles").select("role_id").eq("id", me.id).single())

    if (role?.name === DEFAULT_ROLE && v.name !== DEFAULT_ROLE) {
      throw new Error(`El rol "${DEFAULT_ROLE}" no se puede renombrar: se asigna a los usuarios nuevos.`)
    }
    const permissions = normalizePermissions(v.permissions)
    if (myProfile?.role_id === id && !permissions.users_manage) {
      throw new Error("No puedes quitar 'Gestionar usuarios y roles' a tu propio rol.")
    }

    check(
      await supabase
        .from("roles")
        .update({ name: v.name, description: v.description || null, permissions })
        .eq("id", id),
    )
    done()
  })
}

export async function deleteRole(id: string) {
  return run(async () => {
    await assertPermission("users_manage")
    const supabase = await createClient()
    const { data: role } = check(await supabase.from("roles").select("name").eq("id", id).single())
    if (role?.name === DEFAULT_ROLE) throw new Error(`El rol "${DEFAULT_ROLE}" no se puede eliminar.`)
    const { count } = check(
      await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role_id", id),
    )
    if (count) throw new Error(`No se puede eliminar: ${count} usuario(s) tienen este rol.`)
    check(await supabase.from("roles").delete().eq("id", id))
    done()
  })
}
