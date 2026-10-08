"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { EmptyState, LoadError, Loading, PageHeader } from "@/components/ui"
import { useData } from "@/components/use-data"
import { canEditReview } from "@/lib/can-edit"
import type { ResultStatus } from "@/lib/constants"
import { loadReviewFormData } from "@/lib/data/reviews"
import { fetchReview } from "@/lib/reviews"
import { createClient } from "@/lib/supabase/client"
import { ReviewForm } from "../review-form"

export default function EditReviewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditReview />
    </Suspense>
  )
}

async function load(id: string) {
  const review = await fetchReview(createClient(), id)
  if (!review) return null
  const form = await loadReviewFormData(review.results.map((r) => r.item?.id).filter((x): x is string => Boolean(x)))
  return { review, ...form }
}

function EditReview() {
  const id = useSearchParams().get("id") ?? ""
  const { user } = useAuth()
  const router = useRouter()
  const { data, error, loading } = useData(() => load(id), id)
  const editable = Boolean(user && data && canEditReview(user, data.review))

  useEffect(() => {
    if (data && !editable) router.replace(`/reviews/view/?id=${id}`)
  }, [data, editable, id, router])

  if (error) return <LoadError message={error} />
  if (loading && !data) return <Loading />
  if (!data) return <EmptyState>Revisión no encontrada.</EmptyState>
  if (!editable || !user) return <Loading />

  const { review, properties, categories } = data
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
