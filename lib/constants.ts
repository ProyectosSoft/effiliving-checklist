export const REVIEW_TYPES = {
  recibo_de_obra: "Recibo de obra",
  mantenimiento: "Mantenimiento",
  preoperativo: "Preoperativo",
} as const
export type ReviewType = keyof typeof REVIEW_TYPES

export const REVIEW_STATUSES = {
  en_progreso: "En progreso",
  completada: "Completada",
} as const
export type ReviewStatus = keyof typeof REVIEW_STATUSES

export const RESULT_STATUSES = {
  ok: "OK",
  pendiente: "Pendiente",
  no_aplica: "No aplica",
} as const
export type ResultStatus = keyof typeof RESULT_STATUSES

export const SIGNOFF_ROLES = [
  "Constructor",
  "Interventoría",
  "Gerencia de obra",
  "Maestro de obra",
] as const

export function label<T extends Record<string, string>>(map: T, key: string | null | undefined) {
  return key && key in map ? map[key as keyof T] : (key ?? "—")
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  // Fechas 'YYYY-MM-DD' se muestran sin conversión de zona horaria.
  const [y, m, d] = value.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
}
