"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Alert, Badge } from "@/components/ui"
import { useAction } from "@/components/use-action"
import { inviteUser, updateProfile } from "@/lib/data/users"

type Profile = {
  id: string
  full_name: string
  email: string | null
  role_id: string | null
  active: boolean | null
}
type Role = { id: string; name: string }

const inviteSchema = z.object({
  email: z.email("Correo no válido"),
  fullName: z.string().trim().min(1, "El nombre es obligatorio"),
  roleId: z.string().min(1, "Selecciona un rol"),
})
type InviteValues = z.infer<typeof inviteSchema>

export function UsersManager({ meId, profiles, roles }: { meId: string; profiles: Profile[]; roles: Role[] }) {
  const { pending, error, exec } = useAction()
  const [sent, setSent] = useState<string | null>(null)
  const defaultRole = roles.find((r) => r.name === "inspector")?.id ?? ""
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", fullName: "", roleId: defaultRole },
  })

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Usuarios</h2>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Activo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <UserRow key={p.id} profile={p} roles={roles} isMe={p.id === meId} />
              ))}
            </tbody>
          </table>
        </div>

        <form
          className="card h-fit space-y-3"
          onSubmit={handleSubmit((values) => {
            setSent(null)
            exec(
              () => inviteUser(values),
              () => {
                setSent(values.email)
                reset({ email: "", fullName: "", roleId: defaultRole })
              },
            )
          })}
          noValidate
        >
          <h3 className="font-semibold">Invitar usuario</h3>
          <p className="text-xs text-slate-500">Recibirá un correo para definir su contraseña.</p>
          <div>
            <label className="label" htmlFor="inv-name">
              Nombre completo
            </label>
            <input id="inv-name" className="input" {...register("fullName")} />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="inv-email">
              Correo
            </label>
            <input id="inv-email" type="email" className="input" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="inv-role">
              Rol
            </label>
            <select id="inv-role" className="input capitalize" {...register("roleId")}>
              <option value="">Selecciona…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.roleId && <p className="mt-1 text-xs text-red-600">{errors.roleId.message}</p>}
          </div>
          {error && <Alert>{error}</Alert>}
          {sent && <Alert tone="success">Invitación enviada a {sent}.</Alert>}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Enviando…" : "Enviar invitación"}
          </button>
        </form>
      </div>
    </section>
  )
}

function UserRow({ profile, roles, isMe }: { profile: Profile; roles: Role[]; isMe: boolean }) {
  const { pending, error, exec } = useAction()
  const initial = { fullName: profile.full_name, roleId: profile.role_id ?? "", active: profile.active ?? false }
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(false)
  const dirty = form.fullName !== initial.fullName || form.roleId !== initial.roleId || form.active !== initial.active

  return (
    <tr>
      <td className="min-w-48">
        <input
          className="input"
          aria-label="Nombre"
          value={form.fullName}
          onChange={(e) => (setSaved(false), setForm({ ...form, fullName: e.target.value }))}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="text-slate-600">
        {profile.email}
        {isMe && (
          <span className="ml-2">
            <Badge>tú</Badge>
          </span>
        )}
      </td>
      <td>
        <select
          className="input capitalize"
          aria-label="Rol"
          value={form.roleId}
          disabled={isMe}
          onChange={(e) => (setSaved(false), setForm({ ...form, roleId: e.target.value }))}
        >
          <option value="">Sin rol</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="checkbox"
          className="mt-2 h-4 w-4 accent-brand-600"
          aria-label="Activo"
          checked={form.active}
          disabled={isMe}
          onChange={(e) => (setSaved(false), setForm({ ...form, active: e.target.checked }))}
        />
      </td>
      <td className="whitespace-nowrap">
        <button
          className="btn btn-sm"
          disabled={pending || !dirty}
          onClick={() => exec(() => updateProfile(profile.id, form), () => setSaved(true))}
        >
          Guardar
        </button>
        {saved && !dirty && <span className="ml-2 text-xs text-emerald-700">✓</span>}
      </td>
    </tr>
  )
}
