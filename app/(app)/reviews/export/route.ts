import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { reviewsToPdf, reviewsToXlsx } from "@/lib/export"
import { fetchResults, parseFilters, queryReviews } from "@/lib/reviews"
import { createClient } from "@/lib/supabase/server"

// Exporta el listado filtrado de revisiones: ?format=xlsx|pdf&<filtros>
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.active) return NextResponse.redirect(new URL("/login", request.url))

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const filters = parseFilters(params)
  const supabase = await createClient()
  const { data: rows, error } = await queryReviews(supabase, filters)
  if (error) return new NextResponse(error.message, { status: 500 })

  const results = await fetchResults(supabase, (rows ?? []).map((r) => r.id))
  const stamp = new Date().toISOString().slice(0, 10)

  if (params.format === "pdf") {
    const filtersText = [filters.from && `desde ${filters.from}`, filters.to && `hasta ${filters.to}`]
      .filter(Boolean)
      .join(" ")
    return new NextResponse(new Uint8Array(reviewsToPdf(rows ?? [], results, filtersText)), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="revisiones-${stamp}.pdf"`,
      },
    })
  }

  return new NextResponse(new Uint8Array(await reviewsToXlsx(rows ?? [], results)), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="revisiones-${stamp}.xlsx"`,
    },
  })
}
