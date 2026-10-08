"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { EmptyState, LoadError, Loading, PageHeader } from "@/components/ui"
import { RefreshContext, useData } from "@/components/use-data"
import { loadProperty } from "@/lib/data/properties"
import { EditPropertyForm } from "../property-forms"
import { RoomsManager } from "./rooms-manager"

export default function PropertyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PropertyView />
    </Suspense>
  )
}

function PropertyView() {
  const id = useSearchParams().get("id") ?? ""
  const { data: property, error, loading, reload } = useData(() => loadProperty(id), id)

  if (error) return <LoadError message={error} />
  if (loading && !property) return <Loading />
  if (!property) return <EmptyState>Hotel no encontrado.</EmptyState>

  return (
    <RefreshContext.Provider value={reload}>
      <PageHeader
        title={property.name}
        description={
          <Link href="/properties" className="text-brand-600 hover:underline">
            ← Hoteles
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <RoomsManager propertyId={property.id} rooms={property.rooms} />
        <div className="card h-fit">
          <h2 className="mb-3 font-semibold">Datos del hotel</h2>
          <EditPropertyForm
            key={property.id}
            id={property.id}
            initial={{ name: property.name, address: property.address ?? "", city: property.city ?? "" }}
          />
        </div>
      </div>
    </RefreshContext.Provider>
  )
}
