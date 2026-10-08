"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] })
type Values = z.infer<typeof schema>

export function PasswordForm() {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  async function onSubmit({ password }: Values) {
    setError(undefined)
    const { error } = await createClient().auth.updateUser({ password })
    if (error) {
      setError(error.message)
      return
    }
    router.replace("/dashboard")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="password">
          Nueva contraseña
        </label>
        <input id="password" type="password" autoComplete="new-password" className="input" {...register("password")} />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Confirmar contraseña
        </label>
        <input id="confirm" type="password" autoComplete="new-password" className="input" {...register("confirm")} />
        {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm.message}</p>}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  )
}
