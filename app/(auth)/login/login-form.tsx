"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"

const schema = z.object({
  email: z.email("Correo no válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
})
type Values = z.infer<typeof schema>

export function LoginForm({ nextPath, initialError }: { nextPath: string; initialError?: string }) {
  const router = useRouter()
  const [error, setError] = useState(initialError)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  async function onSubmit(values: Values) {
    setError(undefined)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message)
      return
    }
    router.replace(nextPath)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input id="email" type="email" autoComplete="email" className="input" {...register("email")} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input"
          {...register("password")}
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  )
}
