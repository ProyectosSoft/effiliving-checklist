import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { reviewToPdf, reviewToXlsx } from "@/lib/export"
import { fetchReview } from "@/lib/reviews"
import { createClient } from "@/lib/supabase/server"

// Exporta una revisión: /reviews/<id>/export?format=xlsx|pdf
export async function GET(request: NextRequest, ctx: RouteContext<"/reviews/[id]/export">) {
  const user = await getCurrentUser()
  if (!user?.active) return NextResponse.redirect(new URL("/login", request.url))

  const { id } = await ctx.params
  const supabase = await createClient()
  const review = await fetchReview(supabase, id)
  if (!review) return new NextResponse("Revisión no encontrada", { status: 404 })

  const name = `revision-${review.room?.number ?? "espacio"}-${review.review_date ?? ""}`.replace(/[^\w.-]+/g, "_")

  if (request.nextUrl.searchParams.get("format") === "pdf") {
    return new NextResponse(new Uint8Array(reviewToPdf(review)), {
      headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"` },
    })
  }
  return new NextResponse(new Uint8Array(await reviewToXlsx(review)), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name}.xlsx"`,
    },
  })
}
