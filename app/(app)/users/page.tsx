import type { Metadata } from "next"
import { PageHeader } from "@/components/ui"
import { requirePermission } from "@/lib/auth"
import { parsePermissions } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { RolesManager } from "./roles-manager"
import { UsersManager } from "./users-manager"

export const metadata: Metadata = { title: "Usuarios y roles" }

export default async function UsersPage() {
  const me = await requirePermission("users_manage")
  const supabase = await createClient()
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role_id, active, created_at").order("full_name"),
    supabase.from("roles").select("id, name, description, permissions").order("name"),
  ])

  const roleList = (roles ?? []).map((r) => ({ ...r, permissions: parsePermissions(r.permissions) }))
  const usage = new Map<string, number>()
  for (const p of profiles ?? []) if (p.role_id) usage.set(p.role_id, (usage.get(p.role_id) ?? 0) + 1)

  return (
    <>
      <PageHeader title="Usuarios y roles" description="Invita usuarios, asigna roles y define qué puede hacer cada rol." />
      <div className="space-y-8">
        <UsersManager
          meId={me.id}
          profiles={profiles ?? []}
          roles={roleList.map(({ id, name }) => ({ id, name }))}
        />
        <RolesManager roles={roleList.map((r) => ({ ...r, users: usage.get(r.id) ?? 0 }))} />
      </div>
    </>
  )
}
