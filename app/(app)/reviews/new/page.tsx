"use client"

import { useAuth } from "@/components/auth-provider"
import { EmptyState, LoadError, Loading, PageHeader } from "@/components/ui"
import { useData } from "@/components/use-data"
import { loadReviewFormData } from "@/lib/data/reviews"
import { ReviewForm } from "../review-form"

export default function NewReviewPage() {
  const { user } = useAuth()
  const { data, error } = useData(() => loadReviewFormData(), "new-review")

  return (
    <>
      <PageHeader title="Nueva revisión" description="Registra el estado de cada ítem del espacio revisado." />
      {error && <LoadError message={error} />}
      {!data && !error && <Loading />}
      {data &&
        (data.properties.length === 0 || data.categories.length === 0 ? (
          <EmptyState>
            {data.properties.length === 0
              ? "No hay hoteles registrados. Un administrador o supervisor debe crearlos primero."
              : "La plantilla del checklist no tiene ítems activos."}
          </EmptyState>
        ) : (
          <ReviewForm properties={data.properties} categories={data.categories} reviewerName={user?.fullName ?? ""} />
        ))}
    </>
  )
}
