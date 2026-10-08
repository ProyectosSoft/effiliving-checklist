"use client"

import { useState, useTransition } from "react"
import type { ActionResult } from "@/lib/actions"
import { useRefresh } from "./use-data"

// Ejecuta una mutación que devuelve ActionResult, con estado pendiente y error.
// Si tiene éxito, recarga los datos de la página.
export function useAction() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const refresh = useRefresh()

  function exec<T>(fn: () => Promise<ActionResult<T>>, onSuccess?: (data: T | undefined) => void) {
    startTransition(async () => {
      setError(null)
      const result = await fn()
      if (result.ok) {
        onSuccess?.(result.data)
        refresh()
      } else setError(result.error)
    })
  }

  return { pending, error, setError, exec }
}
