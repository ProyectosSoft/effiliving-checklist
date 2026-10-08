import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { PageHeader } from "@/components/ui"
import { requireUser } from "@/lib/auth"
import type { ResultStatus } from "@/lib/constants"
import { fetchReview } from "@/lib/reviews"
import { createClient } from "@/lib/supabase/server"
import { loadReviewFormData } from "../../form-data"
import { ReviewForm } from "../../review-form"
import { canEditReview } from "../can-edit"

export const metadata: Metadata = { title: "Editar revisión" }

export default async function EditReviewPage({ params }: PageProps<"/reviews/[id]/edit">) {
  const user = await requireUser()
  const { id } = await params
  const supabase = await createClient()
  const review = await fetchReview(supabase, id)
  if (!review) notFound()
  if (!canEditReview(user, review)) redirect(`/reviews/${id}`)

  const { properties, categories } = await loadReviewFormData(
    supabase,
    review.results.map((r) => r.item?.id).filter((x): x is string => Boolean(x)),
  )

  return (
    <>
      <PageHeader
        title={`Editar revisión · ${review.room?.property?.name ?? ""} ${review.room?.number ?? ""}`}
        description={`Creada por ${review.reviewer?.full_name ?? "—"}`}
      />
      <ReviewForm
        properties={properties}
        categories={categories}
        reviewerName={review.reviewer?.full_name ?? user.fullName}
        initial={{
          id: review.id,
          propertyId: review.room?.property_id ?? "",
          floor: review.room?.floor ?? "",
          roomId: review.room?.id ?? "",
          reviewType: review.review_type ?? "",
          reviewDate: review.review_date ?? "",
          results: Object.fromEntries(
            review.results
              .filter((r) => r.item)
              .map((r) => [r.item!.id, { status: (r.status ?? "") as ResultStatus | "", notes: r.notes ?? "" }]),
          ),
          signoffs: review.signoffs.map((s) => ({
            roleLabel: s.role_label ?? "",
            signerName: s.signer_name ?? "",
            signed: Boolean(s.signed_at),
          })),
        }}
      />
    </>
  )
}
