import type { Metadata } from "next"
import Link from "next/link"
import { ReviewFilters } from "@/components/review-filters"
import { Badge, EmptyState, PageHeader, toneFor } from "@/components/ui"
import { requireUser } from "@/lib/auth"
import { formatDate, label, REVIEW_STATUSES, REVIEW_TYPES } from "@/lib/constants"
import { fetchResults, filtersToQuery, parseFilters, queryReviews, summarize } from "@/lib/reviews"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Revisiones" }

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const user = await requireUser()
  const filters = parseFilters(await searchParams)
  const supabase = await createClient()

  const [{ data: reviews, error }, { data: properties }, { data: profiles }] = await Promise.all([
    queryReviews(supabase, filters),
    supabase.from("properties").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ])

  const rows = reviews ?? []
  const results = await fetchResults(supabase, rows.map((r) => r.id))
  const statusesByReview = new Map<string, (string | null)[]>()
  for (const x of results) {
    if (x.review_id) statusesByReview.set(x.review_id, [...(statusesByReview.get(x.review_id) ?? []), x.status])
  }
  const statsByReview = new Map(rows.map((r) => [r.id, summarize(statusesByReview.get(r.id) ?? [])]))
  const query = filtersToQuery(filters)

  return (
    <>
      <PageHeader
        title="Revisiones"
        description={user.permissions.reviews_all ? "Todas las revisiones" : "Tus revisiones"}
        actions={
          <>
            <a className="btn" href={`/reviews/export?format=pdf${query ? `&${query}` : ""}`}>
              Exportar PDF
            </a>
            <a className="btn" href={`/reviews/export?format=xlsx${query ? `&${query}` : ""}`}>
              Exportar Excel
            </a>
            <Link className="btn btn-primary" href="/reviews/new">
              Nueva revisión
            </Link>
          </>
        }
      />

      <ReviewFilters
        action="/reviews"
        filters={filters}
        properties={properties ?? []}
        inspectors={
          user.permissions.reviews_all ? (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name })) : undefined
        }
        fields={["property", "room", "dates", "inspector", "status", "type"]}
      />

      {error && <p className="mb-4 text-sm text-red-600">Error al cargar revisiones: {error.message}</p>}

      {rows.length === 0 ? (
        <EmptyState>No hay revisiones con estos filtros.</EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hotel</th>
                <th>Piso</th>
                <th>Habitación</th>
                <th>Tipo</th>
                <th>Inspector</th>
                <th>Estado</th>
                <th className="text-right">OK / Pend.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = statsByReview.get(r.id)!
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap">
                      <Link href={`/reviews/${r.id}`} className="font-medium text-brand-700 hover:underline">
                        {formatDate(r.review_date)}
                      </Link>
                    </td>
                    <td>{r.room.property.name}</td>
                    <td>{r.room.floor ?? "—"}</td>
                    <td>{r.room.number}</td>
                    <td>{label(REVIEW_TYPES, r.review_type)}</td>
                    <td>{r.reviewer?.full_name ?? "—"}</td>
                    <td>
                      <Badge tone={toneFor(r.status)}>{label(REVIEW_STATUSES, r.status)}</Badge>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <span className="text-emerald-700">{s.ok}</span> /{" "}
                      <span className={s.pendiente ? "font-semibold text-amber-700" : ""}>{s.pendiente}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
