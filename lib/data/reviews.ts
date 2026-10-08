import { z } from "zod"
import { check, requireRows, run } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"
import { sessionUserId } from "./session"

const reviewSchema = z.object({
  id: z.uuid().optional(),
  roomId: z.uuid("Selecciona la habitación"),
  reviewType: z.enum(["recibo_de_obra", "mantenimiento", "preoperativo"], "Selecciona el tipo de revisión"),
  reviewDate: z.iso.date("Fecha no válida"),
  complete: z.boolean(),
  results: z.array(
    z.object({
      itemId: z.uuid(),
      status: z.enum(["ok", "pendiente", "no_aplica"]).nullable(),
      notes: z.string().trim().max(2000),
    }),
  ),
  signoffs: z.array(
    z.object({
      roleLabel: z.string().trim().min(1).max(100),
      signerName: z.string().trim().max(200),
      signed: z.boolean(),
    }),
  ),
})

export type ReviewInput = z.input<typeof reviewSchema>

// Hoteles con habitaciones y plantilla del checklist para el formulario de revisión.
// includeItemIds: ítems a mostrar aunque estén inactivos (ya evaluados en la revisión).
export async function loadReviewFormData(includeItemIds: string[] = []) {
  const supabase = createClient()
  const [{ data: properties, error: e1 }, { data: categories, error: e2 }] = await Promise.all([
    supabase.from("properties").select("id, name, rooms(id, number, floor, room_type)").order("name"),
    supabase
      .from("checklist_categories")
      .select("id, name, sort_order, items:checklist_items(id, label, description, sort_order, active)")
      .order("sort_order")
      .order("created_at"),
  ])
  if (e1 || e2) throw e1 ?? e2

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

export async function saveReview(input: ReviewInput) {
  return run(async () => {
    const userId = await sessionUserId()
    const v = reviewSchema.parse(input)

    if (v.complete) {
      const missing = v.results.filter((r) => !r.status).length
      if (missing > 0) throw new Error(`Faltan ${missing} ítems por evaluar para completar la revisión.`)
    }

    const supabase = createClient()
    let reviewId = v.id

    if (reviewId) {
      // RLS: el autor solo puede editar mientras esté en progreso; reviews_all siempre.
      const { data } = check(
        await supabase
          .from("checklist_reviews")
          .update({ room_id: v.roomId, review_type: v.reviewType, review_date: v.reviewDate })
          .eq("id", reviewId)
          .select("id"),
      )
      if (!data?.length) throw new Error("No puedes editar esta revisión (puede que ya esté completada).")
    } else {
      const { data } = check(
        await supabase
          .from("checklist_reviews")
          .insert({
            room_id: v.roomId,
            reviewer_id: userId,
            review_type: v.reviewType,
            review_date: v.reviewDate,
            status: "en_progreso",
          })
          .select("id")
          .single(),
      )
      reviewId = data!.id
    }

    // Resultados: upsert de los evaluados o con observación; borrar los vacíos.
    const filled = v.results.filter((r) => r.status || r.notes)
    const empty = v.results.filter((r) => !r.status && !r.notes).map((r) => r.itemId)
    if (filled.length) {
      check(
        await supabase.from("review_results").upsert(
          filled.map((r) => ({ review_id: reviewId, item_id: r.itemId, status: r.status, notes: r.notes || null })),
          { onConflict: "review_id,item_id" },
        ),
      )
    }
    if (empty.length) {
      check(await supabase.from("review_results").delete().eq("review_id", reviewId).in("item_id", empty))
    }

    // Firmas: se reemplazan, conservando la fecha de firma previa de cada rol.
    const { data: previous } = check(
      await supabase.from("review_signoffs").select("role_label, signed_at").eq("review_id", reviewId),
    )
    const previousSignedAt = new Map((previous ?? []).map((s) => [s.role_label, s.signed_at]))
    check(await supabase.from("review_signoffs").delete().eq("review_id", reviewId))
    const signoffs = v.signoffs.filter((s) => s.signerName || s.signed)
    if (signoffs.length) {
      const now = new Date().toISOString()
      check(
        await supabase.from("review_signoffs").insert(
          signoffs.map((s) => ({
            review_id: reviewId,
            role_label: s.roleLabel,
            signer_name: s.signerName || null,
            signed_at: s.signed ? (previousSignedAt.get(s.roleLabel) ?? now) : null,
          })),
        ),
      )
    }

    if (v.complete) {
      check(await supabase.from("checklist_reviews").update({ status: "completada" }).eq("id", reviewId))
    }

    return reviewId
  })
}

// Permiso requerido (RLS): reviews_all.
export async function reopenReview(id: string) {
  return run(async () => {
    requireRows(
      await createClient().from("checklist_reviews").update({ status: "en_progreso" }).eq("id", id).select("id"),
    )
  })
}

export async function deleteReview(id: string) {
  return run(async () => {
    requireRows(await createClient().from("checklist_reviews").delete().eq("id", id).select("id"))
  })
}
