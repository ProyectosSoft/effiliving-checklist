export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

type PgError = { code?: string; message?: string }

// Traduce errores de Postgres/Supabase a mensajes para el usuario.
export function friendlyError(error: unknown): string {
  const e = (error ?? {}) as PgError
  switch (e.code) {
    case "23503":
      return "No se puede eliminar porque está en uso (p. ej. en revisiones existentes). Desactívalo en su lugar."
    case "23505":
      return "Ya existe un registro con ese valor."
    case "23514":
      return "Algún valor no es válido."
    case "42501":
      return "No tienes permiso para realizar esta acción."
  }
  if (error instanceof Error) return error.message
  return e.message ?? "Ocurrió un error inesperado."
}

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: friendlyError(error) }
  }
}

// Lanza el error de Supabase si existe (para usar dentro de run()).
export function check<T extends { error: PgError | null }>(result: T): T {
  if (result.error) throw result.error
  return result
}
