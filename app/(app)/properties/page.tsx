"use client"

import Link from "next/link"
import { EmptyState, LoadError, Loading, PageHeader } from "@/components/ui"
import { RefreshContext, useData } from "@/components/use-data"
import { loadProperties } from "@/lib/data/properties"
import { NewPropertyForm } from "./property-forms"

export default function PropertiesPage() {
  const { data: properties, error, reload } = useData(loadProperties, "properties")

  return (
    <RefreshContext.Provider value={reload}>
      <PageHeader title="Hoteles y habitaciones" description="Alta de hoteles y de sus habitaciones o espacios por piso." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {error && <LoadError message={error} />}
          {!properties && !error && <Loading />}
          {properties?.length === 0 && <EmptyState>Aún no hay hoteles registrados.</EmptyState>}
          {properties?.map((p) => (
            <Link
              key={p.id}
              href={`/properties/view/?id=${p.id}`}
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
    </RefreshContext.Provider>
  )
}
