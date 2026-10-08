"use client"

import { useState, useTransition } from "react"
import type { ActionResult } from "@/lib/actions"

// Ejecuta una Server Action que devuelve ActionResult, con estado pendiente y error.
export function useAction() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function exec<T>(fn: () => Promise<ActionResult<T>>, onSuccess?: (data: T | undefined) => void) {
    startTransition(async () => {
      setError(null)
      const result = await fn()
      if (result.ok) onSuccess?.(result.data)
      else setError(result.error)
    })
  }

  return { pending, error, setError, exec }
}
