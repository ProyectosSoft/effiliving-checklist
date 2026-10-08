"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { PasswordForm } from "./password-form"

export default function PasswordPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/login/?error=enlace")
  }, [loading, user, router])

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Cargando…</div>
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Define tu contraseña</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="card">
          <PasswordForm />
        </div>
      </div>
    </main>
  )
}
