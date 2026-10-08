import type { Metadata } from "next"
import Link from "next/link"
import { EmptyState, PageHeader } from "@/components/ui"
import { requirePermission } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { NewPropertyForm } from "./property-forms"

export const metadata: Metadata = { title: "Hoteles y habitaciones" }

export default async function PropertiesPage() {
  await requirePermission("properties_manage")
  const supabase = await createClient()
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address, city, rooms(count)")
    .order("name")

  return (
    <>
      <PageHeader title="Hoteles y habitaciones" description="Alta de hoteles y de sus habitaciones o espacios por piso." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {(properties ?? []).length === 0 && <EmptyState>Aún no hay hoteles registrados.</EmptyState>}
          {(properties ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="card flex items-center justify-between gap-3 transition hover:border-brand-500"
            >
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-slate-500">{[p.address, p.city].filter(Boolean).join(" · ") || "Sin dirección"}</p>
              </div>
              <span className="text-sm whitespace-nowrap text-slate-500">{p.rooms[0]?.count ?? 0} espacios →</span>
            </Link>
          ))}
        </div>
        <div className="card h-fit">
          <h2 className="mb-3 font-semibold">Nuevo hotel</h2>
          <NewPropertyForm />
        </div>
      </div>
    </>
  )
}
