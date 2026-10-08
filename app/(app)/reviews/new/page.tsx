import type { Metadata } from "next"
import { EmptyState, PageHeader } from "@/components/ui"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadReviewFormData } from "../form-data"
import { ReviewForm } from "../review-form"

export const metadata: Metadata = { title: "Nueva revisión" }

export default async function NewReviewPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { properties, categories } = await loadReviewFormData(supabase)

  return (
    <>
      <PageHeader title="Nueva revisión" description="Registra el estado de cada ítem del espacio revisado." />
      {properties.length === 0 || categories.length === 0 ? (
        <EmptyState>
          {properties.length === 0
            ? "No hay hoteles registrados. Un administrador o supervisor debe crearlos primero."
            : "La plantilla del checklist no tiene ítems activos."}
        </EmptyState>
      ) : (
        <ReviewForm properties={properties} categories={categories} reviewerName={user.fullName} />
      )}
    </>
  )
}
