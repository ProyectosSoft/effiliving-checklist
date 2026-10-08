import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Iniciar sesión" }

const ERRORS: Record<string, string> = {
  inactivo: "Tu usuario está desactivado. Contacta a un administrador.",
  enlace: "El enlace no es válido o ya expiró. Pide uno nuevo.",
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            E
          </div>
          <h1 className="text-xl font-semibold">Effiliving Checklist</h1>
          <p className="text-sm text-slate-500">Revisiones de habitaciones y espacios</p>
        </div>
        <div className="card">
          <Suspense>
            <LoginFormWithParams searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}

async function LoginFormWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined
  return <LoginForm nextPath={nextPath} initialError={errorMessage} />
}
