"use client"

import { useState } from "react"
import { Alert } from "@/components/ui"
import { useAction } from "@/components/use-action"
import { PERMISSION_KEYS, PERMISSIONS, type PermissionSet } from "@/lib/permissions"
import { createRole, deleteRole, updateRole } from "@/lib/data/users"

type Role = { id: string; name: string; description: string | null; permissions: PermissionSet; users: number }

const EMPTY_PERMISSIONS = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as PermissionSet

export function RolesManager({ roles }: { roles: Role[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Roles y permisos</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
        <RoleCard />
      </div>
    </section>
  )
}

function RoleCard({ role }: { role?: Role }) {
  const { pending, error, exec } = useAction()
  const blank = { name: "", description: "", permissions: EMPTY_PERMISSIONS }
  const initial = role
    ? { name: role.name, description: role.description ?? "", permissions: role.permissions }
    : blank
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(false)

  return (
    <form
      className={`card space-y-3 ${role ? "" : "border-dashed"}`}
      onSubmit={(e) => {
        e.preventDefault()
        setSaved(false)
        if (role) exec(() => updateRole(role.id, form), () => setSaved(true))
        else exec(() => createRole(form), () => setForm(blank))
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{role ? <span className="capitalize">{role.name}</span> : "Nuevo rol"}</h3>
        {role && <span className="text-xs text-slate-500">{role.users} usuario(s)</span>}
      </div>
      <div>
        <label className="label" htmlFor={`role-name-${role?.id ?? "new"}`}>
          Nombre
        </label>
        <input
          id={`role-name-${role?.id ?? "new"}`}
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="label" htmlFor={`role-desc-${role?.id ?? "new"}`}>
          Descripción
        </label>
        <input
          id={`role-desc-${role?.id ?? "new"}`}
          className="input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="label">Permisos</legend>
        {PERMISSION_KEYS.map((key) => (
          <label key={key} className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-brand-600"
              checked={form.permissions[key]}
              onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [key]: e.target.checked } })}
            />
            {PERMISSIONS[key]}
          </label>
        ))}
        <p className="text-xs text-slate-500">Todos los roles pueden crear y llenar sus propias revisiones.</p>
      </fieldset>
      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">Rol guardado.</Alert>}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" disabled={pending || !form.name.trim()}>
          {role ? "Guardar" : "Crear rol"}
        </button>
        {role && (
          <button
            type="button"
            className="btn btn-danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`¿Eliminar el rol "${role.name}"?`)) exec(() => deleteRole(role.id))
            }}
          >
            Eliminar
          </button>
        )}
      </div>
    </form>
  )
}
