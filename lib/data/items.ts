import { z } from "zod"
import { check, requireRows, run } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"
import { sessionUserId } from "./session"

// Permiso requerido (RLS): items_manage.

const name = z.string().trim().min(1, "El nombre es obligatorio").max(200)
const itemSchema = z.object({
  label: name,
  description: z.string().trim().max(1000).optional().default(""),
})

type Direction = "up" | "down"

// Reasigna sort_order 1..n tras mover un elemento una posición.
function reorder<T extends { id: string }>(rows: T[], id: string, direction: Direction) {
  const index = rows.findIndex((r) => r.id === id)
  const target = direction === "up" ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= rows.length) return null
  const next = [...rows]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next.map((row, i) => ({ id: row.id, sort_order: i + 1 }))
}

export async function loadItemsTemplate() {
  const { data, error } = await createClient()
    .from("checklist_categories")
    .select("id, name, sort_order, items:checklist_items(id, label, description, sort_order, active, created_at)")
    .order("sort_order")
    .order("created_at")
  if (error) throw error
  return (data ?? []).map((c) => ({
    ...c,
    items: [...c.items].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    ),
  }))
}

// ---- Categorías -----------------------------------------------------------

export async function createCategory(input: { name: string }) {
  return run(async () => {
    const supabase = createClient()
    const { data: last } = await supabase
      .from("checklist_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()
    check(
      await supabase
        .from("checklist_categories")
        .insert({ name: name.parse(input.name), sort_order: (last?.sort_order ?? 0) + 1 }),
    )
  })
}

export async function updateCategory(id: string, input: { name: string }) {
  return run(async () => {
    requireRows(
      await createClient()
        .from("checklist_categories")
        .update({ name: name.parse(input.name) })
        .eq("id", id)
        .select("id"),
    )
  })
}

export async function deleteCategory(id: string) {
  return run(async () => {
    requireRows(await createClient().from("checklist_categories").delete().eq("id", id).select("id"))
  })
}

export async function moveCategory(id: string, direction: Direction) {
  return run(async () => {
    const supabase = createClient()
    const { data } = check(
      await supabase.from("checklist_categories").select("id").order("sort_order").order("created_at"),
    )
    const updates = reorder(data ?? [], id, direction)
    if (!updates) return
    for (const u of updates) {
      requireRows(
        await supabase.from("checklist_categories").update({ sort_order: u.sort_order }).eq("id", u.id).select("id"),
      )
    }
  })
}

// ---- Ítems ----------------------------------------------------------------

export async function createItem(categoryId: string, input: { label: string; description?: string }) {
  return run(async () => {
    const userId = await sessionUserId()
    const values = itemSchema.parse(input)
    const supabase = createClient()
    const { data: last } = await supabase
      .from("checklist_items")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()
    check(
      await supabase.from("checklist_items").insert({
        category_id: categoryId,
        label: values.label,
        description: values.description || null,
        sort_order: (last?.sort_order ?? 0) + 1,
        created_by: userId,
      }),
    )
  })
}

export async function updateItem(id: string, input: { label: string; description?: string; categoryId: string }) {
  return run(async () => {
    const values = itemSchema.parse(input)
    requireRows(
      await createClient()
        .from("checklist_items")
        .update({ label: values.label, description: values.description || null, category_id: input.categoryId })
        .eq("id", id)
        .select("id"),
    )
  })
}

export async function setItemActive(id: string, active: boolean) {
  return run(async () => {
    requireRows(await createClient().from("checklist_items").update({ active }).eq("id", id).select("id"))
  })
}

export async function deleteItem(id: string) {
  return run(async () => {
    requireRows(await createClient().from("checklist_items").delete().eq("id", id).select("id"))
  })
}

export async function moveItem(id: string, direction: Direction) {
  return run(async () => {
    const supabase = createClient()
    const { data: item } = check(await supabase.from("checklist_items").select("category_id").eq("id", id).single())
    const { data } = check(
      await supabase
        .from("checklist_items")
        .select("id")
        .eq("category_id", item!.category_id!)
        .order("sort_order")
        .order("created_at"),
    )
    const updates = reorder(data ?? [], id, direction)
    if (!updates) return
    for (const u of updates) {
      requireRows(
        await supabase.from("checklist_items").update({ sort_order: u.sort_order }).eq("id", u.id).select("id"),
      )
    }
  })
}
