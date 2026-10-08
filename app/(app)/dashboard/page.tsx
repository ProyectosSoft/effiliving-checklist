"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { PropertyStatusChart, TopPendingChart } from "@/components/dashboard-charts"
import { ReviewFilters } from "@/components/review-filters"
import { Alert, Badge, EmptyState, LoadError, Loading, PageHeader, toneFor } from "@/components/ui"
import { useData } from "@/components/use-data"
import { formatDate, label, REVIEW_STATUSES, REVIEW_TYPES } from "@/lib/constants"
import { loadReviewList } from "@/lib/data/review-list"
import { filtersToQuery, parseFilters, summarize } from "@/lib/reviews"

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const params = useSearchParams()
  const { property, from, to, inspector } = parseFilters(params)
  const seeAll = user?.permissions.dashboard_all ?? false
  // Sin dashboard_all, el dashboard se limita a las revisiones propias.
  const filters = { property, from, to, inspector: seeAll ? inspector : user?.id }
  const query = filtersToQuery(filters)
  const { data, error } = useData(() => loadReviewList(filters), query)

  if (error) return <LoadError message={error} />
  if (!data) return <Loading />
  const { rows, results, properties, inspectors } = data

  const totals = summarize(results.map((r) => r.status))
  const completed = rows.filter((r) => r.status === "completada").length

  const reviewById = new Map(rows.map((r) => [r.id, r]))
  const byProperty = new Map<string, { name: string; ok: number; pendiente: number }>()
  const byRoom = new Map<string, { property: string; room: string; ok: number; pendiente: number }>()
  const pendingItems = new Map<string, { label: string; category: string; count: number }>()

  for (const r of results) {
    const review = r.review_id ? reviewById.get(r.review_id) : undefined
    if (!review) continue
    const prop = review.room.property
    const p = byProperty.get(prop.id) ?? { name: prop.name, ok: 0, pendiente: 0 }
    const roomKey = review.room.id
    const room = byRoom.get(roomKey) ?? { property: prop.name, room: review.room.number, ok: 0, pendiente: 0 }
    if (r.status === "ok") {
      p.ok++
      room.ok++
    }
    if (r.status === "pendiente") {
      p.pendiente++
      room.pendiente++
      if (r.item) {
        const it = pendingItems.get(r.item.id) ?? { label: r.item.label, category: r.item.category?.name ?? "", count: 0 }
        it.count++
        pendingItems.set(r.item.id, it)
      }
    }
    byProperty.set(prop.id, p)
    byRoom.set(roomKey, room)
  }

  const propertyData = [...byProperty.values()].sort((a, b) => a.name.localeCompare(b.name))
  const topPending = [...pendingItems.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  const topRooms = [...byRoom.values()]
    .filter((r) => r.pendiente > 0)
    .sort((a, b) => b.pendiente - a.pendiente)
    .slice(0, 10)
  const recent = rows.slice(0, 8)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={seeAll ? "Estado general de las revisiones" : "Estado de tus revisiones"}
        actions={
          <Link href="/reviews/new" className="btn btn-primary">
            Nueva revisión
          </Link>
        }
      />

      {params.get("error") === "sin-permiso" && (
        <div className="mb-4">
          <Alert>No tienes permiso para acceder a esa sección.</Alert>
        </div>
      )}

      <ReviewFilters
        key={query}
        action="/dashboard"
        filters={filters}
        properties={properties}
        inspectors={seeAll ? inspectors : undefined}
        fields={["property", "dates", "inspector"]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile title="Revisiones" value={rows.length} hint={`${completed} completadas · ${rows.length - completed} en progreso`} />
        <Tile title="% OK" value={totals.pctOk === null ? "—" : `${totals.pctOk}%`} hint="OK sobre (OK + pendiente)" />
        <Tile title="Ítems OK" value={totals.ok} hint={`${totals.noAplica} no aplica`} />
        <Tile title="Ítems pendientes" value={totals.pendiente} hint="Requieren atención" accent={totals.pendiente > 0} />
      </div>

      {rows.length === 0 ? (
        <EmptyState>No hay revisiones para los filtros seleccionados.</EmptyState>
      ) : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <section className="card">
              <h2 className="mb-1 font-semibold">OK vs. pendiente por hotel</h2>
              <p className="mb-3 text-xs text-slate-500">Cantidad de ítems evaluados</p>
              {propertyData.length ? (
                <>
                  <PropertyStatusChart data={propertyData} />
                  <table className="table mt-3">
                    <thead>
                      <tr>
                        <th>Hotel</th>
                        <th className="text-right">OK</th>
                        <th className="text-right">Pendiente</th>
                        <th className="text-right">% OK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propertyData.map((p) => (
                        <tr key={p.name}>
                          <td>{p.name}</td>
                          <td className="text-right">{p.ok}</td>
                          <td className="text-right">{p.pendiente}</td>
                          <td className="text-right">
                            {p.ok + p.pendiente ? `${Math.round((p.ok / (p.ok + p.pendiente)) * 100)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-sm text-slate-500">Sin ítems evaluados.</p>
              )}
            </section>

            <section className="card">
              <h2 className="mb-1 font-semibold">Ítems que más se repiten como pendientes</h2>
              <p className="mb-3 text-xs text-slate-500">Top 10</p>
              {topPending.length ? (
                <TopPendingChart data={topPending.map((i) => ({ label: i.label, count: i.count }))} />
              ) : (
                <p className="text-sm text-slate-500">No hay ítems pendientes. 🎉</p>
              )}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card overflow-x-auto p-0">
              <h2 className="px-4 pt-4 pb-3 font-semibold">Habitaciones con más pendientes</h2>
              {topRooms.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Hotel</th>
                      <th>Habitación</th>
                      <th className="text-right">Pendientes</th>
                      <th className="text-right">% OK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRooms.map((r) => (
                      <tr key={`${r.property}-${r.room}`}>
                        <td>{r.property}</td>
                        <td>{r.room}</td>
                        <td className="text-right font-semibold text-amber-700">{r.pendiente}</td>
                        <td className="text-right">{Math.round((r.ok / (r.ok + r.pendiente)) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 pb-4 text-sm text-slate-500">Ninguna habitación con pendientes.</p>
              )}
            </section>

            <section className="card overflow-x-auto p-0">
              <h2 className="px-4 pt-4 pb-3 font-semibold">Revisiones recientes</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Espacio</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">
                        <Link href={`/reviews/view/?id=${r.id}`} className="text-brand-700 hover:underline">
                          {formatDate(r.review_date)}
                        </Link>
                      </td>
                      <td>
                        {r.room.property.name} · {r.room.number}
                        <span className="block text-xs text-slate-500">{r.reviewer?.full_name}</span>
                      </td>
                      <td>{label(REVIEW_TYPES, r.review_type)}</td>
                      <td>
                        <Badge tone={toneFor(r.status)}>{label(REVIEW_STATUSES, r.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </>
  )
}

function Tile({ title, value, hint, accent }: { title: string; value: number | string; hint: string; accent?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</p>
      <p className={`mt-1 text-3xl font-semibold ${accent ? "text-amber-700" : "text-slate-900"}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  )
}
