"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

// Recarga los datos de la página actual tras una mutación (reemplaza revalidatePath).
export const RefreshContext = createContext<() => void>(() => {})

export function useRefresh() {
  return useContext(RefreshContext)
}

// Carga datos en el cliente. `key` cambia → se vuelve a cargar.
export function useData<T>(fetcher: () => Promise<T>, key: string) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      setState({ data: await fetcherRef.current(), error: null, loading: false })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [key, load])

  return { ...state, reload: load }
}
