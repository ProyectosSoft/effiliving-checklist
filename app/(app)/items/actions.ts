"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { assertPermission } from "@/lib/auth"
import { check, run } from "@/lib/actions"
import { createClient } from "@/lib/supabase/server"

const name = z.string().trim().min(1, "El nombre es obligatorio").max(200)
const itemSchema = z.object({
  label: name,
  description: z.string().trim().max(1000).optional().default(""),
})

type Direction = "up" | "down"

function done() {
  revalidatePath("/items")
  revalidatePath("/reviews/new")
}

// Reasigna sort_order 1..n tras mover un elemento una posición.
function reorder<T extends { id: string }>(rows: T[], id: string, direction: Direction) {
  const index = rows.findIndex((r) => r.id === id)
  const target = direction === "up" ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= rows.length) return null
  const next = [...rows]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next.map((row, i) => ({ id: row.id, sort_order: i + 1 }))
}

// ---- Categorías -----------------------------------------------------------

export async function createCategory(input: { name: string }) {
  return run(async () => {
    await assertPermission("items_manage")
    const supabase = await createClient()
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
    done()
  })
}

export async function updateCategory(id: string, input: { name: string }) {
  return run(async () => {
    await assertPermission("items_manage")
    const supabase = await createClient()
    check(await supabase.from("checklist_categories").update({ name: name.parse(input.name) }).eq("id", id))
    done()
  })
}

export async function deleteCategory(id: string) {
  return run(async () => {
    await assertPermission("items_manage")
    const supabase = await createClient()
    check(await supabase.from("checklist_categories").delete().eq("id", id))
    done()
  })
}

export async function moveCategory(id: string, direction: Direction) {
  return run(async () => {
    await assertPermission("items_manage")
    const supabase = await createClient()
    const { data } = check(
      await supabase.from("checklist_categories").select("id").order("sort_order").order("created_at"),
    )
    const updates = reorder(data ?? [], id, direction)
    if (!updates) return
    for (const u of updates) {
      check(await supabase.from("checklist_categories").update({ sort_order: u.sort_order }).eq("id", u.id))
    }
    done()
  })
}

// ---- Ítems ----------------------------------------------------------------

export async function createItem(categoryId: string, input: { label: string; description?: string }) {
  return run(async () => {
    const user = await assertPermission("items_manage")
    const values = itemSchema.parse(input)
    const supabase = await createClient()
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
        created_by: user.id,
      }),
    )
    done()
  })
}

export async function updateItem(
  id: string,
  input: { label: string; description?: string; categoryId: string },
) {
  return run(async () => {
    await assertPermission("items_manage")
    const values = itemSchema.parse(input)
    const supabase = await createClient()
    check(
      await supabase
        .from("checklist_items")
        .update({ label: values.label, description: values.description || null, category_id: input.categoryId })
        .eq("id", id),
    )
    done()
  })
}

export async function setItemActive(id: string, active: boolean) {
  return run(async () => {
    await assertPermission("items_manage")
    const supabase = await createClient()
    check(await supabase.from("checklist_items").update({ active }).eq("id", id))
    done()
  })
}

export async function deleteItem(id: string) {
  return run(async () => {
    await assertPermission("items_manage")
    const supabase = await createClient()
    check(await supabase.from("checklist_items").delete().eq("id", id))
    done()
  })
}

export async function moveItem(id: string, direction: Direction) {
  return run(async () => {
    await assertPermission("items_manage")
    const supabase = await createClient()
    const { data: item } = check(
      await supabase.from("checklist_items").select("category_id").eq("id", id).single(),
    )
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
      check(await supabase.from("checklist_items").update({ sort_order: u.sort_order }).eq("id", u.id))
    }
    done()
  })
}
