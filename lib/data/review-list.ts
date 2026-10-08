import { fetchResults, queryReviews, type ReviewFilters } from "@/lib/reviews"
import { createClient } from "@/lib/supabase/client"

// Revisiones filtradas + sus resultados + opciones de filtros (hoteles, inspectores).
export async function loadReviewList(filters: ReviewFilters) {
  const supabase = createClient()
  const [{ data: reviews, error }, { data: properties }, { data: profiles }] = await Promise.all([
    queryReviews(supabase, filters),
    supabase.from("properties").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ])
  if (error) throw error
  const rows = reviews ?? []
  const results = await fetchResults(supabase, rows.map((r) => r.id))
  return {
    rows,
    results,
    properties: properties ?? [],
    inspectors: (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name })),
  }
}
