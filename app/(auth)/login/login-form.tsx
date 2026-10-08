"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"

const schema = z.object({
  email: z.email("Correo no válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
})
type Values = z.infer<typeof schema>

const ERRORS: Record<string, string> = {
  inactivo: "Tu usuario está desactivado. Contacta a un administrador.",
  enlace: "El enlace no es válido o ya expiró. Pide uno nuevo.",
}

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, loading } = useAuth()
  const next = params.get("next")
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard/"
  const [error, setError] = useState<string | undefined>(ERRORS[params.get("error") ?? ""])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  // Con sesión activa no tiene sentido mostrar el login.
  useEffect(() => {
    if (!loading && user?.active) router.replace(nextPath)
  }, [loading, user, nextPath, router])

  async function onSubmit(values: Values) {
    setError(undefined)
    const { error } = await createClient().auth.signInWithPassword(values)
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message)
    }
    // Si entra bien, AuthProvider recarga el usuario y el efecto anterior redirige.
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
