import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Alert, Badge, PageHeader, toneFor } from "@/components/ui"
import { requireUser } from "@/lib/auth"
import { formatDate, formatDateTime, label, RESULT_STATUSES, REVIEW_STATUSES, REVIEW_TYPES } from "@/lib/constants"
import { fetchReview, groupResults, summarize } from "@/lib/reviews"
import { createClient } from "@/lib/supabase/server"
import { canEditReview } from "./can-edit"
import { ReviewAdminActions } from "./review-admin-actions"

export const metadata: Metadata = { title: "Detalle de revisión" }

export default async function ReviewPage({ params }: PageProps<"/reviews/[id]">) {
  const user = await requireUser()
  const { id } = await params
  const supabase = await createClient()
  const review = await fetchReview(supabase, id)
  if (!review) notFound()

  const groups = groupResults(review.results)
  const totals = summarize(review.results.map((r) => r.status))
  const editable = canEditReview(user, review)

  return (
    <>
      <PageHeader
        title={`${review.room?.property?.name ?? "—"} · ${review.room?.number ?? "—"}`}
        description={
          <Link href="/reviews" className="text-brand-600 hover:underline">
            ← Revisiones
          </Link>
        }
        actions={
          <>
            <a className="btn" href={`/reviews/${id}/export?format=pdf`}>
              Exportar PDF
            </a>
            <a className="btn" href={`/reviews/${id}/export?format=xlsx`}>
              Exportar Excel
            </a>
            {editable && (
              <Link className="btn btn-primary" href={`/reviews/${id}/edit`}>
                {review.status === "completada" ? "Editar" : "Continuar revisión"}
              </Link>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[2fr_1fr]">
        <dl className="card grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Info term="Hotel" value={review.room?.property?.name} />
          <Info term="Piso" value={review.room?.floor} />
          <Info term="Habitación" value={`${review.room?.number ?? "—"}${review.room?.room_type ? ` · ${review.room.room_type}` : ""}`} />
          <Info term="Tipo de revisión" value={label(REVIEW_TYPES, review.review_type)} />
          <Info term="Fecha" value={formatDate(review.review_date)} />
          <Info term="Revisado por" value={review.reviewer?.full_name} />
          <div>
            <dt className="text-xs text-slate-500">Estado</dt>
            <dd className="mt-0.5">
              <Badge tone={toneFor(review.status)}>{label(REVIEW_STATUSES, review.status)}</Badge>
            </dd>
          </div>
        </dl>
        <div className="card grid grid-cols-3 gap-2 text-center">
          <Stat value={totals.ok} text="OK" className="text-emerald-600" />
          <Stat value={totals.pendiente} text="Pendientes" className="text-amber-600" />
          <Stat value={totals.noAplica} text="No aplica" className="text-slate-500" />
          <p className="col-span-3 text-sm text-slate-500">
            {totals.pctOk === null ? "Sin ítems evaluados" : `${totals.pctOk}% OK de lo evaluado`}
          </p>
        </div>
      </div>

      {groups.length === 0 && <Alert tone="info">Esta revisión aún no tiene ítems evaluados.</Alert>}

      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.name} className="card overflow-x-auto p-0">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">{group.name}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th className="w-1/3">Ítem</th>
                  <th className="w-28">Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.item?.label ?? "—"}</td>
                    <td>
                      {r.status ? <Badge tone={toneFor(r.status)}>{label(RESULT_STATUSES, r.status)}</Badge> : "—"}
                    </td>
                    <td className="whitespace-pre-wrap text-slate-600">{r.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <section className="card">
          <h2 className="mb-3 font-semibold">Firmas / VoBo</h2>
          {review.signoffs.length === 0 ? (
            <p className="text-sm text-slate-500">Sin firmas registradas.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {review.signoffs.map((s) => (
                <li key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">{s.role_label}</p>
                  <p className="text-slate-600">{s.signer_name || "—"}</p>
                  <p className="text-xs text-slate-500">
                    {s.signed_at ? `VoBo: ${formatDateTime(s.signed_at)}` : "Sin VoBo"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {user.permissions.reviews_all && <ReviewAdminActions id={id} completed={review.status === "completada"} />}
      </div>
    </>
  )
}

function Info({ term, value }: { term: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{term}</dt>
      <dd className="mt-0.5 font-medium">{value || "—"}</dd>
    </div>
  )
}

function Stat({ value, text, className }: { value: number; text: string; className: string }) {
  return (
    <div>
      <p className={`text-2xl font-semibold ${className}`}>{value}</p>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  )
}
