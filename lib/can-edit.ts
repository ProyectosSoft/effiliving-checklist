import type { CurrentUser } from "@/components/auth-provider"

// Misma regla que public.can_edit_review() en la base de datos.
export function canEditReview(
  user: CurrentUser,
  review: { reviewer_id: string | null; status: string | null },
) {
  return user.permissions.reviews_all || (review.reviewer_id === user.id && review.status === "en_progreso")
}
