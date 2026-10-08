import type { Json } from "@/types/database"

// Claves de roles.permissions. Deben coincidir con las que evalúa
// public.has_permission() en supabase/migrations/0002_auth_rls.sql.
export const PERMISSIONS = {
  reviews_all: "Ver y editar todas las revisiones (sin esto: solo las propias)",
  items_manage: "Crear, editar y eliminar categorías e ítems del checklist",
  properties_manage: "Crear, editar y eliminar hoteles y habitaciones",
  users_manage: "Gestionar usuarios y roles",
  dashboard_all: "Dashboard con todas las revisiones (sin esto: solo las propias)",
} as const

export type Permission = keyof typeof PERMISSIONS
export type PermissionSet = Record<Permission, boolean>

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[]

export function parsePermissions(value: Json | null | undefined): PermissionSet {
  const obj = value && typeof value === "object" && !Array.isArray(value) ? value : {}
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, obj[key] === true])) as PermissionSet
}

// Rutas de administración y el permiso que exige cada una (lo usan proxy.ts y la navegación).
export const ROUTE_PERMISSIONS: { prefix: string; permission: Permission }[] = [
  { prefix: "/items", permission: "items_manage" },
  { prefix: "/properties", permission: "properties_manage" },
  { prefix: "/users", permission: "users_manage" },
]
