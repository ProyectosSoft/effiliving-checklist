import type { Metadata } from "next"
import { Suspense } from "react"
import { requireUser } from "@/lib/auth"
import { PasswordForm } from "./password-form"

export const metadata: Metadata = { title: "Definir contraseña" }

export default function PasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Define tu contraseña</h1>
          <Suspense>
            <UserEmail />
          </Suspense>
        </div>
        <div className="card">
          <PasswordForm />
        </div>
      </div>
    </main>
  )
}

async function UserEmail() {
  const user = await requireUser()
  return <p className="text-sm text-slate-500">{user.email}</p>
}
