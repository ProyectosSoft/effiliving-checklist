import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/ui"
import { requirePermission } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EditPropertyForm } from "../property-forms"
import { RoomsManager } from "./rooms-manager"

export const metadata: Metadata = { title: "Hotel" }

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  await requirePermission("properties_manage")
  const { id } = await params
  const supabase = await createClient()
  const { data: property } = await supabase
    .from("properties")
    .select("id, name, address, city, rooms(id, number, floor, room_type)")
    .eq("id", id)
    .maybeSingle()
  if (!property) notFound()

  return (
    <>
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
            id={property.id}
            initial={{ name: property.name, address: property.address ?? "", city: property.city ?? "" }}
          />
        </div>
      </div>
    </>
  )
}
