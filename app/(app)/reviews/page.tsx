"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { ReviewFilters } from "@/components/review-filters"
import { Badge, EmptyState, LoadError, Loading, PageHeader, toneFor } from "@/components/ui"
import { useData } from "@/components/use-data"
import { formatDate, label, REVIEW_STATUSES, REVIEW_TYPES } from "@/lib/constants"
import { loadReviewList } from "@/lib/data/review-list"
import { filtersToQuery, parseFilters, summarize } from "@/lib/reviews"

export default function ReviewsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReviewsList />
    </Suspense>
  )
}

function ReviewsList() {
  const { user } = useAuth()
  const filters = parseFilters(useSearchParams())
  const query = filtersToQuery(filters)
  const { data, error } = useData(() => loadReviewList(filters), query)
  const [exporting, setExporting] = useState(false)
  const seeAll = user?.permissions.reviews_all ?? false

  async function exportAs(format: "pdf" | "xlsx") {
    if (!data) return
    setExporting(true)
    try {
      const { download, reviewsToPdf, reviewsToXlsx } = await import("@/lib/export")
      const stamp = new Date().toISOString().slice(0, 10)
      const filtersText = [filters.from && `desde ${filters.from}`, filters.to && `hasta ${filters.to}`]
        .filter(Boolean)
        .join(" ")
      const blob =
        format === "pdf"
          ? reviewsToPdf(data.rows, data.results, filtersText)
          : await reviewsToXlsx(data.rows, data.results)
      download(blob, `revisiones-${stamp}.${format}`)
    } finally {
      setExporting(false)
    }
  }

  const statusesByReview = new Map<string, (string | null)[]>()
  for (const x of data?.results ?? []) {
    if (x.review_id) statusesByReview.set(x.review_id, [...(statusesByReview.get(x.review_id) ?? []), x.status])
  }

  return (
    <>
      <PageHeader
        title="Revisiones"
        description={seeAll ? "Todas las revisiones" : "Tus revisiones"}
        actions={
          <>
            <button className="btn" disabled={!data || exporting} onClick={() => exportAs("pdf")}>
              Exportar PDF
            </button>
            <button className="btn" disabled={!data || exporting} onClick={() => exportAs("xlsx")}>
              Exportar Excel
            </button>
            <Link className="btn btn-primary" href="/reviews/new">
              Nueva revisión
            </Link>
          </>
        }
      />

      <ReviewFilters
        key={query}
        action="/reviews"
        filters={filters}
        properties={data?.properties ?? []}
        inspectors={seeAll ? (data?.inspectors ?? []) : undefined}
        fields={["property", "room", "dates", "inspector", "status", "type"]}
      />

      {error && <LoadError message={error} />}
      {!data && !error && <Loading />}

      {data && data.rows.length === 0 && <EmptyState>No hay revisiones con estos filtros.</EmptyState>}

      {data && data.rows.length > 0 && (
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
              {data.rows.map((r) => {
                const s = summarize(statusesByReview.get(r.id) ?? [])
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap">
                      <Link href={`/reviews/view/?id=${r.id}`} className="font-medium text-brand-700 hover:underline">
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
