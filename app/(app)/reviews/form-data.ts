import "server-only"
import type { createClient } from "@/lib/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

// Hoteles con habitaciones y plantilla del checklist para el formulario de revisión.
// includeItemIds: ítems a mostrar aunque estén inactivos (ya evaluados en la revisión).
export async function loadReviewFormData(supabase: Supabase, includeItemIds: string[] = []) {
  const [{ data: properties }, { data: categories }] = await Promise.all([
    supabase.from("properties").select("id, name, rooms(id, number, floor, room_type)").order("name"),
    supabase
      .from("checklist_categories")
      .select("id, name, sort_order, items:checklist_items(id, label, description, sort_order, active)")
      .order("sort_order")
      .order("created_at"),
  ])

  const keep = new Set(includeItemIds)
  const template = (categories ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      items: c.items
        .filter((i) => i.active || keep.has(i.id))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(({ id, label, description }) => ({ id, label, description })),
    }))
    .filter((c) => c.items.length > 0)

  return { properties: properties ?? [], categories: template }
}
