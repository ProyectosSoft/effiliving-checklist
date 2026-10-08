"use client"

import { Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

// Destino de los enlaces de correo de Supabase (invitación, recuperación).
// Plantilla: {{ .SiteURL }}/auth/confirm/?token_hash={{ .TokenHash }}&type=invite&next=/account/password/
export default function ConfirmPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  )
}

function Confirm() {
  const router = useRouter()
  const params = useSearchParams()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const tokenHash = params.get("token_hash")
    const type = params.get("type") as EmailOtpType | null
    const next = params.get("next")
    const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard/"

    if (!tokenHash || !type) {
      router.replace("/login/?error=enlace")
      return
    }
    createClient()
      .auth.verifyOtp({ type, token_hash: tokenHash })
      .then(({ error }) => router.replace(error ? "/login/?error=enlace" : safeNext))
  }, [params, router])

  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verificando enlace…</div>
}
