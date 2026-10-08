import type { Metadata } from "next"
import { PageHeader } from "@/components/ui"
import { requirePermission } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { ItemsManager } from "./items-manager"

export const metadata: Metadata = { title: "Ítems del checklist" }

export default async function ItemsPage() {
  await requirePermission("items_manage")
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("checklist_categories")
    .select("id, name, sort_order, items:checklist_items(id, label, description, sort_order, active, created_at)")
    .order("sort_order")
    .order("created_at")

  const sorted = (categories ?? []).map((c) => ({
    ...c,
    items: [...c.items].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    ),
  }))

  return (
    <>
      <PageHeader
        title="Ítems del checklist"
        description="Plantilla de categorías e ítems que se usa en cada revisión. Los ítems inactivos no aparecen en revisiones nuevas."
      />
      <ItemsManager categories={sorted} />
    </>
  )
}
