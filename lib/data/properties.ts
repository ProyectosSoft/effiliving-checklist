import { z } from "zod"
import { check, requireRows, run } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"

// Permiso requerido (RLS) para escribir: properties_manage.

const optional = z.string().trim().max(200).optional().default("")
const propertySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  address: optional,
  city: optional,
})
const roomSchema = z.object({
  number: z.string().trim().min(1, "El número es obligatorio").max(50),
  floor: optional,
  roomType: optional,
})

export type PropertyInput = z.input<typeof propertySchema>
export type RoomInput = z.input<typeof roomSchema>

export async function loadProperties() {
  const { data, error } = await createClient()
    .from("properties")
    .select("id, name, address, city, rooms(count)")
    .order("name")
  if (error) throw error
  return data ?? []
}

export async function loadProperty(id: string) {
  const { data, error } = await createClient()
    .from("properties")
    .select("id, name, address, city, rooms(id, number, floor, room_type)")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

// ---- Hoteles --------------------------------------------------------------

export async function createProperty(input: PropertyInput) {
  return run(async () => {
    const v = propertySchema.parse(input)
    const { data } = check(
      await createClient()
        .from("properties")
        .insert({ name: v.name, address: v.address || null, city: v.city || null })
        .select("id")
        .single(),
    )
    return data!.id
  })
}

export async function updateProperty(id: string, input: PropertyInput) {
  return run(async () => {
    const v = propertySchema.parse(input)
    requireRows(
      await createClient()
        .from("properties")
        .update({ name: v.name, address: v.address || null, city: v.city || null })
        .eq("id", id)
        .select("id"),
    )
  })
}

export async function deleteProperty(id: string) {
  return run(async () => {
    requireRows(await createClient().from("properties").delete().eq("id", id).select("id"))
  })
}

// ---- Habitaciones ---------------------------------------------------------

// "101-110, 115, Lobby" → ["101", ..., "110", "115", "Lobby"]
function expandNumbers(spec: string): string[] {
  const out: string[] = []
  for (const part of spec.split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])]
      if (to < from || to - from > 500) throw new Error(`Rango no válido: ${part}`)
      for (let n = from; n <= to; n++) out.push(String(n).padStart(range[1].length, "0"))
    } else {
      out.push(part)
    }
  }
  return [...new Set(out)]
}

export async function createRoomsBulk(
  propertyId: string,
  input: { numbers: string; floor?: string; roomType?: string },
) {
  return run(async () => {
    const numbers = expandNumbers(input.numbers)
    if (numbers.length === 0) throw new Error("Indica al menos un número de habitación.")
    const supabase = createClient()
    const { data: existing } = check(await supabase.from("rooms").select("number").eq("property_id", propertyId))
    const taken = new Set((existing ?? []).map((r) => r.number))
    const fresh = numbers.filter((n) => !taken.has(n))
    if (fresh.length > 0) {
      check(
        await supabase.from("rooms").insert(
          fresh.map((number) => ({
            property_id: propertyId,
            number,
            floor: input.floor?.trim() || null,
            room_type: input.roomType?.trim() || null,
          })),
        ),
      )
    }
    return { created: fresh.length, skipped: numbers.length - fresh.length }
  })
}

export async function updateRoom(id: string, input: RoomInput) {
  return run(async () => {
    const v = roomSchema.parse(input)
    requireRows(
      await createClient()
        .from("rooms")
        .update({ number: v.number, floor: v.floor || null, room_type: v.roomType || null })
        .eq("id", id)
        .select("id"),
    )
  })
}

export async function deleteRoom(id: string) {
  return run(async () => {
    requireRows(await createClient().from("rooms").delete().eq("id", id).select("id"))
  })
}
