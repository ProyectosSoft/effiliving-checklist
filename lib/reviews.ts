import type { Supabase } from "@/lib/supabase/client"

export type ReviewFilters = {
  property?: string
  room?: string
  from?: string
  to?: string
  inspector?: string
  status?: string
  type?: string
}

const FILTER_KEYS = ["property", "room", "from", "to", "inspector", "status", "type"] as const

export function parseFilters(params: URLSearchParams): ReviewFilters {
  const out: ReviewFilters = {}
  for (const key of FILTER_KEYS) {
    const value = params.get(key)
    if (typeof value === "string" && value.trim()) out[key] = value.trim()
  }
  return out
}

export function filtersToQuery(filters: ReviewFilters) {
  return new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString()
}

const MAX_ROWS = 1000

// Revisiones filtradas (RLS ya limita a las propias si el rol no tiene reviews_all).
export function queryReviews(supabase: Supabase, filters: ReviewFilters) {
  let query = supabase
    .from("checklist_reviews")
    .select(
      `id, review_type, review_date, status, created_at, reviewer_id,
       reviewer:profiles(full_name),
       room:rooms!inner(id, number, floor, property_id, property:properties!inner(id, name))`,
    )
    .order("review_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS)

  if (filters.property) query = query.eq("room.property_id", filters.property)
  if (filters.room) query = query.ilike("room.number", `%${filters.room}%`)
  if (filters.from) query = query.gte("review_date", filters.from)
  if (filters.to) query = query.lte("review_date", filters.to)
  if (filters.inspector) query = query.eq("reviewer_id", filters.inspector)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.type) query = query.eq("review_type", filters.type)
  return query
}

export type ReviewRow = NonNullable<Awaited<ReturnType<typeof queryReviews>>["data"]>[number]

// Resultados (con ítem y categoría) de un conjunto de revisiones, en lotes.
export async function fetchResults(supabase: Supabase, reviewIds: string[]) {
  const rows: {
    review_id: string | null
    status: string | null
    notes: string | null
    item: { id: string; label: string; category: { name: string; sort_order: number | null } | null } | null
  }[] = []
  for (let i = 0; i < reviewIds.length; i += 200) {
    const { data, error } = await supabase
      .from("review_results")
      .select("review_id, status, notes, item:checklist_items(id, label, category:checklist_categories(name, sort_order))")
      .in("review_id", reviewIds.slice(i, i + 200))
    if (error) throw error
    rows.push(...(data ?? []))
  }
  return rows
}

// Detalle completo de una revisión.
export async function fetchReview(supabase: Supabase, id: string) {
  const { data } = await supabase
    .from("checklist_reviews")
    .select(
      `id, review_type, review_date, status, created_at, reviewer_id,
       reviewer:profiles(full_name, email),
       room:rooms(id, number, floor, room_type, property_id, property:properties(id, name, city)),
       results:review_results(id, status, notes, updated_at,
         item:checklist_items(id, label, description, sort_order,
           category:checklist_categories(id, name, sort_order))),
       signoffs:review_signoffs(id, role_label, signer_name, signed_at)`,
    )
    .eq("id", id)
    .maybeSingle()
  return data
}

export type ReviewDetail = NonNullable<Awaited<ReturnType<typeof fetchReview>>>

// Agrupa resultados por categoría en el orden de la plantilla.
export function groupResults(results: ReviewDetail["results"]) {
  const groups = new Map<string, { name: string; order: number; rows: ReviewDetail["results"] }>()
  for (const r of results) {
    const cat = r.item?.category
    const key = cat?.id ?? "sin-categoria"
    if (!groups.has(key)) groups.set(key, { name: cat?.name ?? "Sin categoría", order: cat?.sort_order ?? 9999, rows: [] })
    groups.get(key)!.rows.push(r)
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ ...g, rows: g.rows.sort((a, b) => (a.item?.sort_order ?? 0) - (b.item?.sort_order ?? 0)) }))
}

export function summarize(statuses: (string | null)[]) {
  const ok = statuses.filter((s) => s === "ok").length
  const pendiente = statuses.filter((s) => s === "pendiente").length
  const noAplica = statuses.filter((s) => s === "no_aplica").length
  const evaluated = ok + pendiente
  return { ok, pendiente, noAplica, pctOk: evaluated ? Math.round((ok / evaluated) * 100) : null }
}
